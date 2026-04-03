/**
 * Smart Charging Station — UNIFIED BOARD (one ESP32, two servos + relay + RFID + LCD)
 * -----------------------------------------------------------------------------
 * Local web UI removed. This firmware connects to Wi-Fi and syncs with your
 * Node/React backend (same machine as MongoDB). Website + API control the station.
 *
 * 1) Set WIFI_SSID, WIFI_PASS, API_HOST (e.g. "http://192.168.1.10:5000").
 * 2) Set STATION_TOKEN to match ESP_STATION_TOKEN in backend/.env
 * 3) Libraries: MFRC522, ESP32Servo, LiquidCrystal_I2C, ArduinoJson 6
 *
 * Backend endpoints used:
 *   POST {API_HOST}/api/esp/nodes/station/sync   header X-Esp-Token
 *   POST {API_HOST}/api/esp/nodes/station/ack
 *
 * Hardware logic (doors, timers, RFID, payment flow) is kept as in your original sketch.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>

// ========== Wi-Fi & backend (EDIT THESE) ==========
const char *WIFI_SSID = "YOUR_WIFI_SSID";
const char *WIFI_PASS = "YOUR_WIFI_PASSWORD";
/** Your PC IP + port where Node runs, e.g. http://192.168.1.50:5000 — no trailing slash */
const char *API_HOST = "http://192.168.1.50:5000";
/** Must equal ESP_STATION_TOKEN in backend/.env */
const char *STATION_TOKEN = "change-me-station-secret";

const unsigned long BACKEND_SYNC_MS = 1500;

// ========== Pin Definitions ==========
#define RST_PIN    4
#define SS_PIN     5
#define SERVO1_PIN 13
#define SERVO2_PIN 12
#define RELAY_PIN  14
#define I2C_SDA    21
#define I2C_SCL    22

// ========== RFID ==========
MFRC522 mfrc522(SS_PIN, RST_PIN);
byte authorizedUID1[4] = {0x61, 0x73, 0x30, 0x17};
byte authorizedUID2[4] = {0x23, 0x4E, 0x5B, 0x06};

// ========== Servos ==========
Servo servo1;
Servo servo2;
const int DOOR_OPEN = 90;
const int DOOR_CLOSED = 0;

// ========== LCD ==========
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ========== System State (unchanged logic) ==========
bool phoneDoorOpen = false;
bool powerbankDoorOpen = false;
bool chargingActive = false;
bool relayActive = false;
bool timerRunning = false;
unsigned long phoneTimerEnd = 0;
unsigned long powerbankTimerEnd = 0;
unsigned long doorCloseTime = 0;
unsigned long selectedMinutes = 0;
String activeService = "";

const int PRICE_PER_MINUTE = 1;

unsigned long lastBackendSync = 0;

// ========== Prototypes ==========
void openDoor(int doorNum);
void closeDoor(int doorNum);
void updateLCD();
void startTimer(String service, int minutes);
void processPayment(String service, int minutes);
void checkRFID();
void checkTimers();
void syncWithBackend();
bool httpPostJson(const char *path, const String &body, DynamicJsonDocument *parseResponse);
void handleServerCommands(JsonArray cmds);

// ========== Setup ==========
void setup() {
  Serial.begin(115200);
  delay(500);

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart Charging");
  lcd.setCursor(0, 1);
  lcd.print("WiFi...");

  servo1.attach(SERVO1_PIN);
  servo2.attach(SERVO2_PIN);
  servo1.write(DOOR_CLOSED);
  servo2.write(DOOR_CLOSED);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  SPI.begin();
  mfrc522.PCD_Init();
  delay(100);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 60) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi OK");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(1500);
  } else {
    Serial.println("WiFi failed — fix SSID/PASS");
    lcd.clear();
    lcd.print("WiFi FAILED");
  }
}

// ========== Loop ==========
void loop() {
  checkRFID();
  checkTimers();
  updateLCD();

  if (WiFi.status() == WL_CONNECTED && millis() - lastBackendSync >= BACKEND_SYNC_MS) {
    lastBackendSync = millis();
    syncWithBackend();
  } else if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 10000) {
      lastRetry = millis();
      WiFi.reconnect();
    }
  }
  delay(50);
}

// ========== Backend sync / commands ==========
bool httpPostJson(const char *path, const String &body, DynamicJsonDocument *parseResponse) {
  HTTPClient http;
  String url = String(API_HOST) + path;
  http.begin(url);
  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Esp-Token", STATION_TOKEN);
  int code = http.POST(body);
  if (code != 200) {
    Serial.printf("HTTP %d %s\n", code, url.c_str());
    http.end();
    return false;
  }
  if (parseResponse) {
    String resp = http.getString();
    http.end();
    DeserializationError err = deserializeJson(*parseResponse, resp);
    if (err) {
      Serial.println(err.c_str());
      return false;
    }
  } else {
    http.end();
  }
  return true;
}

void syncWithBackend() {
  long phoneSec = 0;
  if (chargingActive && phoneTimerEnd > millis()) {
    phoneSec = (long)((phoneTimerEnd - millis()) / 1000);
  }
  long bankSec = 0;
  if (powerbankTimerEnd > millis()) {
    bankSec = (long)((powerbankTimerEnd - millis()) / 1000);
  }

  DynamicJsonDocument doc(512);
  doc["phoneDoorOpen"] = phoneDoorOpen;
  doc["powerbankDoorOpen"] = powerbankDoorOpen;
  doc["relayActive"] = relayActive;
  doc["phoneActive"] = chargingActive;
  doc["powerbankActive"] = (powerbankTimerEnd > millis());
  doc["phoneTimeLeftSec"] = phoneSec;
  doc["powerbankTimeLeftSec"] = bankSec;

  String body;
  serializeJson(doc, body);

  DynamicJsonDocument resp(8192);
  if (!httpPostJson("/api/esp/nodes/station/sync", body, &resp)) return;

  JsonArray cmds = resp["commands"].as<JsonArray>();
  if (cmds.isNull() || cmds.size() == 0) return;

  handleServerCommands(cmds);

  DynamicJsonDocument ackDoc(3072);
  JsonArray ids = ackDoc.createNestedArray("commandIds");
  for (JsonVariant v : cmds) {
    JsonObject c = v.as<JsonObject>();
    if (c["id"].is<const char *>()) {
      ids.add(c["id"].as<const char *>());
    } else if (c["id"].is<String>()) {
      ids.add(c["id"].as<String>());
    }
  }

  if (ids.size() > 0) {
    String ackStr;
    serializeJson(ackDoc, ackStr);
    httpPostJson("/api/esp/nodes/station/ack", ackStr, nullptr);
  }
}

void handleServerCommands(JsonArray cmds) {
  for (JsonVariant v : cmds) {
    JsonObject c = v.as<JsonObject>();
    const char *action = c["action"];
    if (!action) continue;

    JsonObject p = c["payload"].as<JsonObject>();

    if (strcmp(action, "session_start") == 0) {
      if (p.isNull()) continue;
      int mins = p["minutes"].as<int>();
      const char *svc = p["service"].as<const char *>();
      if (svc && svc[0] && mins > 0) {
        processPayment(String(svc), mins);
      }
    } else if (strcmp(action, "door_open") == 0) {
      const char *t = p["target"].as<const char *>();
      if (!t) t = "phone";
      if (strcmp(t, "powerbank") == 0) {
        openDoor(2);
      } else {
        openDoor(1);
      }
    } else if (strcmp(action, "door_close") == 0) {
      const char *t = p["target"].as<const char *>();
      if (!t) t = "phone";
      if (strcmp(t, "powerbank") == 0) {
        closeDoor(2);
      } else {
        closeDoor(1);
      }
    } else if (strcmp(action, "relay_on") == 0) {
      relayActive = true;
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println(">>> REMOTE: relay ON <<<");
    } else if (strcmp(action, "relay_off") == 0) {
      relayActive = false;
      digitalWrite(RELAY_PIN, LOW);
      Serial.println(">>> REMOTE: relay OFF <<<");
    }
  }
}

// ========== Doors / timer / payment (original logic) ==========
void openDoor(int doorNum) {
  if (doorNum == 1 && !phoneDoorOpen) {
    servo1.write(DOOR_OPEN);
    phoneDoorOpen = true;
    doorCloseTime = millis() + 30000;
    Serial.println(">>> DOOR 1 (Phone) OPENED <<<");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Phone Door OPEN");
    lcd.setCursor(0, 1);
    lcd.print("Closes in 30s");
  } else if (doorNum == 2 && !powerbankDoorOpen) {
    servo2.write(DOOR_OPEN);
    powerbankDoorOpen = true;
    doorCloseTime = millis() + 30000;
    Serial.println(">>> DOOR 2 (Powerbank) OPENED <<<");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Powerbank Door");
    lcd.setCursor(0, 1);
    lcd.print("Closes in 30s");
  }
}

void closeDoor(int doorNum) {
  if (doorNum == 1 && phoneDoorOpen) {
    servo1.write(DOOR_CLOSED);
    phoneDoorOpen = false;
    Serial.println(">>> DOOR 1 (Phone) CLOSED <<<");

    if (activeService == "phone" && selectedMinutes > 0 && !timerRunning) {
      startTimer("phone", selectedMinutes);
    }
  } else if (doorNum == 2 && powerbankDoorOpen) {
    servo2.write(DOOR_CLOSED);
    powerbankDoorOpen = false;
    Serial.println(">>> DOOR 2 (Powerbank) CLOSED <<<");

    if (activeService == "powerbank" && selectedMinutes > 0 && !timerRunning) {
      startTimer("powerbank", selectedMinutes);
    }
  }
}

void startTimer(String service, int minutes) {
  timerRunning = true;

  if (service == "phone") {
    phoneTimerEnd = millis() + (minutes * 60000UL);
    chargingActive = true;
    relayActive = true;
    digitalWrite(RELAY_PIN, HIGH);
    Serial.printf(">>> Phone Timer STARTED: %d minutes <<<\n", minutes);
    Serial.println(">>> RELAY ACTIVATED <<<");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Charging Started");
    lcd.setCursor(0, 1);
    lcd.printf("Timer: %d min", minutes);
    delay(2000);
  } else if (service == "powerbank") {
    powerbankTimerEnd = millis() + (minutes * 60000UL);
    Serial.printf(">>> Powerbank Timer STARTED: %d minutes <<<\n", minutes);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Powerbank Rental");
    lcd.setCursor(0, 1);
    lcd.printf("Timer: %d min", minutes);
    delay(2000);
  }
}

void processPayment(String service, int minutes) {
  int amount = minutes * PRICE_PER_MINUTE;
  Serial.printf("\nPAYMENT / SESSION: %d EGP, %d min, service=%s\n", amount, minutes, service.c_str());

  if (service == "phone") {
    if (!chargingActive && !phoneDoorOpen && !timerRunning) {
      selectedMinutes = minutes;
      activeService = "phone";
      Serial.printf("Phone: opening door (%d min)\n", minutes);
      openDoor(1);
    } else {
      Serial.println("Phone compartment busy or active!");
    }
  } else if (service == "powerbank") {
    if (powerbankTimerEnd == 0 && !powerbankDoorOpen && !timerRunning) {
      selectedMinutes = minutes;
      activeService = "powerbank";
      Serial.printf("Powerbank: opening door (%d min)\n", minutes);
      openDoor(2);
    } else {
      Serial.println("Powerbank compartment busy!");
    }
  }
}

void checkRFID() {
  if (!mfrc522.PICC_IsNewCardPresent()) return;
  if (!mfrc522.PICC_ReadCardSerial()) return;

  Serial.print("\nRFID UID: ");
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) Serial.print("0");
    Serial.print(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) Serial.print(" ");
  }
  Serial.println();

  bool isAuthorized1 = true;
  for (byte i = 0; i < 4; i++) {
    if (mfrc522.uid.uidByte[i] != authorizedUID1[i]) isAuthorized1 = false;
  }
  bool isAuthorized2 = true;
  for (byte i = 0; i < 4; i++) {
    if (mfrc522.uid.uidByte[i] != authorizedUID2[i]) isAuthorized2 = false;
  }

  if (isAuthorized1) {
    Serial.println("AUTHORIZED - Phone door card");
    if (!phoneDoorOpen && !chargingActive && !timerRunning) {
      activeService = "phone";
      selectedMinutes = 0;
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("RFID OK");
      lcd.setCursor(0, 1);
      lcd.print("Open Door 1");
      delay(1500);
      openDoor(1);
    } else if (phoneDoorOpen) {
      Serial.println("Door already open");
    } else if (chargingActive) {
      Serial.println("Charging active");
    }
  } else if (isAuthorized2) {
    Serial.println("AUTHORIZED - Powerbank door card");
    if (!powerbankDoorOpen && powerbankTimerEnd == 0 && !timerRunning) {
      activeService = "powerbank";
      selectedMinutes = 0;
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("RFID OK");
      lcd.setCursor(0, 1);
      lcd.print("Open Door 2");
      delay(1500);
      openDoor(2);
    } else if (powerbankDoorOpen) {
      Serial.println("Door already open");
    }
  } else {
    Serial.println("UNAUTHORIZED card");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Unauthorized!");
    lcd.setCursor(0, 1);
    lcd.print("Denied");
    delay(1500);
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

void checkTimers() {
  unsigned long now = millis();

  if (phoneTimerEnd > 0 && now >= phoneTimerEnd) {
    phoneTimerEnd = 0;
    chargingActive = false;
    relayActive = false;
    timerRunning = false;
    activeService = "";
    digitalWrite(RELAY_PIN, LOW);
    Serial.println(">>> Phone time expired <<<");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Time Expired!");
    lcd.setCursor(0, 1);
    lcd.print("Charging Stopped");
    delay(2000);
  }

  if (powerbankTimerEnd > 0 && now >= powerbankTimerEnd) {
    powerbankTimerEnd = 0;
    timerRunning = false;
    activeService = "";
    Serial.println(">>> Powerbank time expired <<<");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Time Expired!");
    lcd.setCursor(0, 1);
    lcd.print("Please Return");
    delay(2000);
  }

  if (doorCloseTime > 0 && now >= doorCloseTime) {
    if (phoneDoorOpen) closeDoor(1);
    if (powerbankDoorOpen) closeDoor(2);
    doorCloseTime = 0;
  }
}

void updateLCD() {
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate < 500) return;
  lastUpdate = millis();

  lcd.clear();

  lcd.setCursor(0, 0);
  if (chargingActive && phoneTimerEnd > millis()) {
    int ml = (phoneTimerEnd - millis()) / 60000;
    int sl = ((phoneTimerEnd - millis()) % 60000) / 1000;
    lcd.printf("P:%02d:%02d", ml, sl);
  } else if (phoneDoorOpen) {
    long cs = (doorCloseTime - millis()) / 1000;
    if (cs > 0 && cs <= 30) lcd.printf("D1:%02lds", cs);
    else lcd.print("Door1:OPEN");
  } else {
    lcd.print("Phone:READY");
  }

  lcd.setCursor(0, 1);
  if (powerbankTimerEnd > millis()) {
    int ml = (powerbankTimerEnd - millis()) / 60000;
    int sl = ((powerbankTimerEnd - millis()) % 60000) / 1000;
    lcd.printf("B:%02d:%02d", ml, sl);
  } else if (powerbankDoorOpen) {
    long cs = (doorCloseTime - millis()) / 1000;
    if (cs > 0 && cs <= 30) lcd.printf("D2:%02lds", cs);
    else lcd.print("Door2:OPEN");
  } else {
    lcd.print("Power:READY");
  }
}
