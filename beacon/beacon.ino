#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEBeacon.h>

// ──────────────── Wi-Fi 설정 ────────────────
const char* WIFI_SSID     = "asdf";
const char* WIFI_PASSWORD = "asdf";

// ──────────────── MQTT 브로커 설정 (AWS IoT Core) ────────────────
const char* MQTT_BROKER   = "asdf"; // 예: "xxxxxx-ats.iot.ap-northeast-2.amazonaws.com"
const int   MQTT_PORT     = 8883; // AWS IoT는 TLS 사용, 8883 포트

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

// ──────────────── 비콘 정보 (DynamoDB 구조에 맞춤) ────────────────
const char* BeaconID   = "beacon-001";
const char* BeaconName = "CrowdSense_dev1";
const float Latitude   = ;
const float Longitude  = ;
const int   Radius     = 10; // 미터 단위 등

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
    if (mqttClient.connect(BeaconID)) { // 클라이언트ID로 BeaconID 사용
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

  // BLE 초기화
  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setActiveScan(true);
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(90);

  connectToMQTT();

  // Information Table용 데이터 전송 (1회만)
  String infoPayload = "{";
  infoPayload += "\"BeaconID\":\"" + String(BeaconID) + "\",";
  infoPayload += "\"BeaconName\":\"" + String(BeaconName) + "\",";
  infoPayload += "\"Latitude\":" + String(Latitude, 6) + ",";
  infoPayload += "\"Longitude\":" + String(Longitude, 6) + ",";
  infoPayload += "\"Radius\":" + String(Radius);
  infoPayload += "}";

  if (mqttClient.publish("beacon/information", infoPayload.c_str())) {
    Serial.println("Information Table 데이터 전송 성공: " + infoPayload);
  } else {
    Serial.println("Information Table 데이터 전송 실패");
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

  // Timestamp
  unsigned long timestamp = millis();

  // Scan Table용 JSON 생성
  String scanPayload = "{";
  scanPayload += "\"BeaconID\":\"" + String(BeaconID) + "\",";
  scanPayload += "\"DeviceCount\":" + String(devCount) + ",";
  scanPayload += "\"Timestamp\":" + String(timestamp) + ",";
  scanPayload += "\"RSSI\":" + String(avgRssi);
  scanPayload += "}";

  // Scan Table용 토픽으로 publish
  if (mqttClient.publish("beacon/scan", scanPayload.c_str())) {
    Serial.println("Scan Table 데이터 전송 성공: " + scanPayload);
  } else {
    Serial.println("Scan Table 데이터 전송 실패");
  }

  pBLEScan->clearResults();
  delay(10000); // 10초 대기 후 반복
}