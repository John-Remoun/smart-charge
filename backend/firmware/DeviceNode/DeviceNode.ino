/**
 * Smart Charge – ESP32 example (one sketch per board).
 *
 * Board A: set DEVICE_SLUG "phone"    + ESP_TOKEN = ESP_TOKEN_PHONE from server .env
 * Board B: set DEVICE_SLUG "powerbank"+ ESP_TOKEN = ESP_TOKEN_POWERBANK from server .env
 *
 * Flow: POST /api/esp/nodes/{slug}/sync every SYNC_INTERVAL_MS with JSON body (telemetry).
 * Response JSON includes "commands": [ { "id", "action", "payload" } ].
 * After executing each command, POST /api/esp/nodes/{slug}/ack with { "commandIds": ["..."] }.
 *
 * Install "ArduinoJson" v6+ from Library Manager.
 * Replace WIFI_* and SERVER_HOST with your LAN IP where Node runs (same PC: ipconfig).
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char *WIFI_SSID = "YOUR_WIFI";
const char *WIFI_PASS = "YOUR_PASSWORD";

// PC running Node backend, e.g. http://192.168.1.50:5000
const char *SERVER_ORIGIN = "http://192.168.1.50:5000";

// Must match backend: "phone" or "powerbank"
const char *DEVICE_SLUG = "phone";

// Must match ESP_TOKEN_PHONE or ESP_TOKEN_POWERBANK in backend .env
const char *ESP_TOKEN = "change-me-phone-secret";

const int SYNC_INTERVAL_MS = 2000;

// Map actions to your GPIO (example)
#define PIN_DOOR_LOCK 26
#define PIN_RELAY 27

unsigned long lastSync = 0;
bool doorOpen = false;
bool relayOn = false;
int timeLeftSec = 0;
bool active = false;

void runAction(const char *action, JsonObject payload) {
  if (strcmp(action, "door_open") == 0) {
    doorOpen = true;
    digitalWrite(PIN_DOOR_LOCK, HIGH); // Replace with your lock logic
  } else if (strcmp(action, "door_close") == 0) {
    doorOpen = false;
    digitalWrite(PIN_DOOR_LOCK, LOW);
  } else if (strcmp(action, "relay_on") == 0) {
    relayOn = true;
    digitalWrite(PIN_RELAY, HIGH);
  } else if (strcmp(action, "relay_off") == 0) {
    relayOn = false;
    digitalWrite(PIN_RELAY, LOW);
  } else if (strcmp(action, "session_start") == 0) {
    int m = payload["minutes"] | 0;
    if (m > 0) {
      active = true;
      timeLeftSec = m * 60;
      relayOn = true;
      digitalWrite(PIN_RELAY, HIGH);
      // TODO: open door for user, then close after delay
    }
  }
}

bool httpPostJson(const char *path, const String &jsonBody, DynamicJsonDocument *parseInto) {
  HTTPClient http;
  String url = String(SERVER_ORIGIN) + path;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Esp-Token", ESP_TOKEN);
  int code = http.POST(jsonBody);
  if (code != 200) {
    Serial.printf("HTTP %d %s\n", code, url.c_str());
    http.end();
    return false;
  }
  if (parseInto) {
    String resp = http.getString();
    http.end();
    DeserializationError err = deserializeJson(*parseInto, resp);
    if (err) {
      Serial.println(err.c_str());
      return false;
    }
  } else {
    http.end();
  }
  return true;
}

void syncWithServer() {
  DynamicJsonDocument req(256);
  req["doorOpen"] = doorOpen;
  req["relayActive"] = relayOn;
  req["timeLeftSec"] = timeLeftSec;
  req["active"] = active;
  String body;
  serializeJson(req, body);

  DynamicJsonDocument resp(4096);
  char path[96];
  snprintf(path, sizeof(path), "/api/esp/nodes/%s/sync", DEVICE_SLUG);
  if (!httpPostJson(path, body, &resp)) return;

  JsonArray cmds = resp["commands"].as<JsonArray>();
  if (cmds.isNull() || cmds.size() == 0) return;

  DynamicJsonDocument ackDoc(1024);
  JsonArray ids = ackDoc.createNestedArray("commandIds");
  for (JsonVariant v : cmds) {
    JsonObject c = v.as<JsonObject>();
    const char *id = c["id"];
    const char *action = c["action"];
    if (id && action) {
      JsonObject payload = c["payload"].as<JsonObject>();
      runAction(action, payload);
      ids.add(id);
    }
  }
  if (ids.size() == 0) return;
  String ackStr;
  serializeJson(ackDoc, ackStr);
  snprintf(path, sizeof(path), "/api/esp/nodes/%s/ack", DEVICE_SLUG);
  httpPostJson(path, ackStr, nullptr);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_DOOR_LOCK, OUTPUT);
  pinMode(PIN_RELAY, OUTPUT);
  digitalWrite(PIN_DOOR_LOCK, LOW);
  digitalWrite(PIN_RELAY, LOW);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK");
}

void loop() {
  if (millis() - lastSync >= SYNC_INTERVAL_MS) {
    lastSync = millis();
    if (WiFi.status() == WL_CONNECTED) syncWithServer();
    if (active && timeLeftSec > 0) {
      timeLeftSec--;
      if (timeLeftSec <= 0) {
        active = false;
        relayOn = false;
        digitalWrite(PIN_RELAY, LOW);
      }
    }
  }
}
