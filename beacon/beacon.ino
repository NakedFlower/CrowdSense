#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEBeacon.h>

// ──────────────── Wi-Fi 설정 ────────────────
const char* WIFI_SSID     = "여기에_와이파이_이름";
const char* WIFI_PASSWORD = "여기에_와이파이_비밀번호";

// ──────────────── MQTT 브로커 설정 (AWS IoT Core) ────────────────
const char* MQTT_BROKER   = "여기에_AWS_IoT_엔드포인트"; // 예: "xxxxxx-ats.iot.ap-northeast-2.amazonaws.com"
const int   MQTT_PORT     = 8883; // AWS IoT는 TLS 사용, 8883 포트
const char* MQTT_TOPIC    = "beacon/info"; // 원하는 토픽명

// 인증서/키 필요시 추가 설정 필요 (AWS IoT Core의 경우)

// ──────────────── 비콘 정보 (DynamoDB 구조에 맞춤) ────────────────
const char* BeaconID   = "beacon-001";
const char* BeaconName = "hanyang-cafe";
const float Latitude   = 37.555913;
const float Longitude  = 127.049425;
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

  // AWS IoT Core 인증서/키 설정 필요시 여기에 추가

  // MQTT 브로커 설정
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);

  // BLE 초기화
  BLEDevice::init("");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setActiveScan(true);
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(90);
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

  // JSON 데이터 생성 (DynamoDB 구조에 맞춤)
  String payload = "{";
  payload += "\"BeaconID\":\""   + String(BeaconID)   + "\",";
  payload += "\"BeaconName\":\"" + String(BeaconName) + "\",";
  payload += "\"Latitude\":"     + String(Latitude, 6) + ",";
  payload += "\"Longitude\":"    + String(Longitude, 6) + ",";
  payload += "\"Radius\":"       + String(Radius);
  payload += "}";

  // MQTT publish
  if (mqttClient.publish(MQTT_TOPIC, payload.c_str())) {
    Serial.println("MQTT 전송 성공: " + payload);
  } else {
    Serial.println("MQTT 전송 실패");
  }

  pBLEScan->clearResults();
  delay(2000); // 2초 대기 후 반복
}