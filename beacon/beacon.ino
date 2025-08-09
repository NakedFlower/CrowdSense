#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEBeacon.h>
#include <ArduinoJson.h>
#include "time.h"


// ──────────────── Wi-Fi 설정 ────────────────
const char* WIFI_SSID     = "asdf";
const char* WIFI_PASSWORD = "asdf";

// ──────────────── MQTT 브로커 설정 (AWS IoT Core) ────────────────
const char* MQTT_BROKER   = "asdf"; // 예: "xxxxxx-ats.iot.ap-northeast-2.amazonaws.com"
const int   MQTT_PORT     = 8883; // AWS IoT는 TLS 사용, 8883 포트

// ──────────────── 비콘 정보 (DynamoDB 구조에 맞춤) ────────────────
String Id;
const char* Name = "CrowdSense_dev2";
const char* Type = "Seoul";
const float Latitude   = 37.555954;
const float Longitude  = 127.049423;
const int   Radius     = 10; // 미터 단위 등


const char* NTP_SERVER1 = "pool.ntp.org";
const char* NTP_SERVER2 = "time.nist.gov";   // 백업
const long   GMT_OFFSET_SECONDS   = 0;       // UTC = 0
const int    DAYLIGHT_OFFSET_SEC  = 0;       // DST 미적용

// AWS IoT Core Root CA 인증서
const char* AWS_ROOT_CA = R"EOF(
-----BEGIN CERTIFICATE-----
asdf
-----END CERTIFICATE-----
)EOF";

// 디바이스 인증서
const char* DEVICE_CERT = R"KEY(
-----BEGIN CERTIFICATE-----
asdf
-----END CERTIFICATE-----
)KEY";

// 디바이스 프라이빗 키
const char* DEVICE_PRIVATE_KEY = R"KEY(
-----BEGIN RSA PRIVATE KEY-----
asdf
-----END RSA PRIVATE KEY-----
)KEY";


// ── CHIP ID 얻기 (MAC 48 bit → HEX 12글자) ──
String getChipId() {
  uint64_t mac = ESP.getEfuseMac();
  char buf[13];
  sprintf(buf, "%012llX", mac);
  return String(buf);      // 예) A4E57C12AB34
}

// ──────────────── BLE 스캔 설정 ────────────────
constexpr uint32_t kScanSeconds = 10;
BLEScan* pBLEScan;

// ──────────────── MQTT 클라이언트 객체 ────────────────
WiFiClientSecure espClient;
PubSubClient mqttClient(espClient);

// ──────────────── MQTT 연결 함수 ────────────────
void connectToMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("MQTT 연결 시도...");
    if (mqttClient.connect(Id.c_str())) { // 클라이언트ID로 Id 사용
      Serial.println("연결 성공!");
    } else {
      Serial.print("실패, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" 5초 후 재시도");
      delay(5000);
    }
  }
}

// ──────────────── SETUP ────────────────
void setup() {
  Serial.begin(115200);
  Id = getChipId();
  delay(100);

  // Wi-Fi 연결
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint8_t tryCnt = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
    if (++tryCnt > 30) {
      Serial.println("\nWi-Fi 연결 실패, 재시작");
      ESP.restart();
    }
  }
  Serial.printf("\nWi-Fi 연결됨: %s\n", WiFi.localIP().toString().c_str());

  espClient.setCACert(AWS_ROOT_CA);
  espClient.setCertificate(DEVICE_CERT);
  espClient.setPrivateKey(DEVICE_PRIVATE_KEY);

  // MQTT 브로커 설정
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);

  // ── UTC 시간 동기화 ──
  configTime(GMT_OFFSET_SECONDS, DAYLIGHT_OFFSET_SEC,
             NTP_SERVER1, NTP_SERVER2);
  // 처음 부팅 직후에는 시간이 아직 1970년으로 잡혀 있으므로, 몇 초 기다려 확인
  Serial.print("NTP 동기화 중");
  time_t now;
  while ((now = time(nullptr)) < 1609459200) { // 2021‑01‑01 00:00:00
    Serial.print('.');  delay(500);
  }
  Serial.printf("\nUTC 동기화 완료: %ld\n", now);

  // BLE 초기화
  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setActiveScan(true);
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(90);

  connectToMQTT();

  // ── Information Table용 메시지 1회 전송 ──
  StaticJsonDocument<256> doc;
  doc["Id"]        = Id;
  doc["Type"]      = Type;
  doc["Name"]      = Name;
  doc["Latitude"]  = String(Latitude, 6);
  doc["Longitude"] = String(Longitude, 6);
  doc["Radius"]    = Radius;

  String payload;
  serializeJson(doc, payload);

  if (mqttClient.publish("beacon/information", payload.c_str())) {
    Serial.println("Information 전송 성공: " + payload);
  } else {
    Serial.println("Information 전송 실패");
  }
}

// ──────────────── LOOP ────────────────
void loop() {
  if (!mqttClient.connected()) {
    connectToMQTT();
  }
  mqttClient.loop();

  // BLE 스캔
  BLEScanResults* results = pBLEScan->start(kScanSeconds, false);
  uint32_t devCount = results->getCount();
  Serial.printf("BLE 감지 기기 수: %lu\n", devCount);

  // RSSI
  int rssiSum = 0;
  for (int i = 0; i < devCount; i++) {
    rssiSum += results->getDevice(i).getRSSI();
  }
  int avgRssi = devCount > 0 ? rssiSum / devCount : 0;

  time_t now = time(nullptr);            // ⬅️ UTC epoch 초
  uint32_t timestamp = (uint32_t)now;    // DynamoDB Number(UNIX time)

  // ── Scan Table용 메시지 ──
  StaticJsonDocument<256> docScan;
  docScan["Id"]        = Id;
  docScan["Timestamp"] = timestamp;
  docScan["Count"]     = devCount;
  docScan["RSSI"]      = avgRssi;

  String scanPayload;
  serializeJson(docScan, scanPayload);

  if (mqttClient.publish("beacon/scan", scanPayload.c_str())) {
    Serial.println("Scan 전송 성공: " + scanPayload);
  } else {
    Serial.println("Scan 전송 실패");
  }

  pBLEScan->clearResults();
  delay(15000);

}
