# 🏢 CrowdSense

> **BLE 기반 실내 군중 혼잡도 측정 서비스**

CrowdSense는 Bluetooth Low Energy(BLE) 기술을 활용하여 실내 공간의 군중 혼잡도를 실시간으로 측정하고 모니터링하는 IoT 서비스입니다.

---

## 📌 프로젝트 소개

실내 공간(도서관, 카페, 매장 등)에서 방문객의 스마트폰 BLE 신호를 감지하여 혼잡도 데이터를 수집하고, 이를 서버에서 처리해 사용자에게 제공합니다. 별도의 앱 설치 없이 스마트폰의 BLE 신호만으로 인원을 감지하므로 설치와 운영이 간편합니다.

---

## 🛠 기술 스택

### IoT / Beacon
| 항목 | 내용 |
|------|------|
| 하드웨어 | ESP32-C3 |
| 개발 환경 | Arduino IDE |
| 통신 방식 | Bluetooth Low Energy (BLE) |
| 클라우드 연동 | AWS IoT Core (MQTT) |

### Backend / Server
| 항목 | 내용 |
|------|------|
| 언어 | Java |
| 프레임워크 | Spring Boot |
| 인프라 | AWS EC2 |
| 데이터베이스 | AWS DynamoDB |
| IoT 연동 | AWS IoT Core |

---

## 🏗 아키텍처

```
[스마트폰 BLE 신호]
        ↓
[ESP32-C3 Beacon 장치]  ← BLE 스캔
        ↓ (MQTT)
[AWS IoT Core]
        ↓
[AWS DynamoDB]  ←→  [Spring Boot Server (AWS EC2)]
                              ↓
                       [클라이언트 / 대시보드]
```


---

## 🚀 시작하기

### 사전 요구사항

- **Beacon**: ESP32-C3 보드, Arduino IDE, AWS 계정
- **Server**: JDK 17+, AWS 계정 (EC2, DynamoDB, IoT Core)

### Beacon 설정 (ESP32-C3)

1. Arduino IDE에 ESP32 보드 패키지를 설치합니다.
2. `beacon/` 폴더의 소스를 Arduino IDE에서 엽니다.
3. Wi-Fi 및 AWS IoT Core 인증서 정보를 설정합니다.
4. ESP32-C3 보드에 업로드합니다.

### Server 설정 (Spring Boot)

1. 레포지토리를 클론합니다.
   ```bash
   git clone https://github.com/NakedFlower/CrowdSense.git
   cd CrowdSense/server
   ```

2. AWS 환경 변수 또는 `application.yml`에 설정을 입력합니다.
   ```yaml
   aws:
     region: ap-northeast-2
     dynamodb:
       endpoint: https://dynamodb.ap-northeast-2.amazonaws.com
     iot:
       endpoint: <YOUR_IOT_ENDPOINT>
   ```

3. 빌드 및 실행합니다.
   ```bash
   ./gradlew build
   java -jar build/libs/crowdsense-*.jar
   ```
---

## ☁️ AWS 설정

| 서비스 | 역할 |
|--------|------|
| **AWS IoT Core** | Beacon 장치로부터 MQTT 메시지 수신 |
| **AWS DynamoDB** | 혼잡도 데이터 저장 및 조회 |
| **AWS EC2** | Spring Boot 서버 호스팅 |

> AWS IAM 권한: `iot:Connect`, `iot:Publish`, `iot:Subscribe`, `dynamodb:PutItem`, `dynamodb:GetItem`, `dynamodb:Query` 이 필요합니다.

---

## 📖 상세 문서

더 자세한 설계 문서와 사용 방법은 아래 Notion 페이지를 참고해주세요.

👉 [CrowdSense Notion 문서](https://www.notion.so/CrowdSense-224491513994809f9d17cb5f95322ca5)

---

[Notion 설명서](https://www.notion.so/CrowdSense-224491513994809f9d17cb5f95322ca5)
