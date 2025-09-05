#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include <math.h>

// ===== WIFI =====
const char* WIFI_SSID = "UernNatal";
const char* WIFI_PASS = "uern5322";

// ===== MQTT (HiveMQ Cloud) =====
const char* MQTT_HOST = "9a41abb938cd484e9dc8b865088f234b.s1.eu.hivemq.cloud"; // ex: xxxxx.s1.eu.hivemq.cloud
const int   MQTT_PORT = 8883;
const char* MQTT_USER = "device-esp32-ABC123";
const char* MQTT_PASS = "Gc224180";
const char* DEVICE_ID = "esp32-ABC123";

// ===== Root CA do cluster (pública da Let's Encrypt / HiveMQ Cloud) =====
static const char* ROOT_CA = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgISA8P+pD5vPRjNCzA2kZZgwyqIMA0GCSqGSIb3DQEBCwUA
MEoxCzAJBgNVBAYTAlVTMRMwEQYDVQQKDApMZXQncyBFbmNyeXB0MSMwIQYDVQQD
DBpMZXQncyBFbmNyeXB0IFJvb3QgQ0EgWDExMB4XDTIxMDkwMzAwMDAwMFoXDTQx
MDkwMzAwMDAwMFowSjELMAkGA1UEBhMCVVMxEzARBgNVBAoMCkxldCdzIEVuY3J5
cHQxIzAhBgNVBAMMGkxldCdzIEVuY3J5cHQgUm9vdCBDQSBYMTEwggIiMA0GCSqG
SIb3DQEBAQUAA4ICDwAwggIKAoICAQC7AhkJvFZjFZ9h5v9+IvR2Z1tLK6uFU8V
3sXcDoRjv7+5EZXykc1VjEEc3cLseRzMKhYlGUpW3Xgxq3S0s7N0l5WDdwWca8lS
LZJMQD0Ig67c1XhHkB5Fxxos5GnRr+N/3A+xFbADP2GJeo49oNUqV6tEO8Lyb0BW
xBaRaoWLO4QYdgnbT82+hZF+FQhHI76bHYOA9YbpFYUpERiVrDCTn3IA+ZlA38WE
9U1V8Wk5kk4uUpLfO59fTID9kCXZjg5eQof8I4eAbOeXtfLOcAFeaqEHzUkWwaRl
Ymu8GzWQZpt2gArAVnzafsgkP4NQgnC6U0M9x1czqkW2GtxM8LoI8WpFnCK0hx+j
95L8RZw6RH0XaqtLMy9eJHDJcWH6DKk7VDQ80EjhXx+0eJtLUsuyD9gB2m2l2hij
rS3Iyx0w9fwJ0vVOc5nUbGvJbImPRZLhj8eoLNTNzDgYHTiwJ+7Wmug0mMT6yJMu
+jslI6lxKz3wP4WvHmEdkniTuWQ5lwblzB8Z0fcnEslrTOZaIA8djqhK3Ka5c5Hb
K3oWh3lxjU8l3BOd1gppg5J1hP0hfd1eqD7nbLGf/kPmCrBKbTw4jIwbUKy9VgqT
93x3lIx+19AW4C9oUQx93DURsFnGhO8FUwN1cZoAsvtZtdhaheUAz5coc8+dtOmL
wIDAQABo0IwQDAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjAdBgNVHQ
4EFgQUoN+dwQh+ytK1LzHnT+/C89P9gEkwDQYJKoZIhvcNAQELBQADggIBAD9j9C
8T7y3fVjdp3bWItPxX2VINeodIZ6Tn6PvxI6Bfq5lHppZArYrusS4i1Nn2O0o39Y
Z44Jsn4hP+9Gf4bm/FYnGV8eK3opgDdGztqKqRR3YKHyCuXapnwYfJOLwObAun1v
ZzR2tQeM+c/fi91tIbp/BK+f5pFwchAuC8W9jAq56k97X3gSdz8sRP/6IDdnh3oX
1N1pAVccawJgN9zeps2sonMSKcwk5Y8ZndKyVKoU9pYNCXS6/ivFwXk4Hknc0NrF
z9oxnD65gis6pZeRAgvIJt4GDsFlNdVs4KJIp4jOSAmhpN6wX6Z1GDZCBoBPXaG9
a2I8pIvFqcQFwh05rq6ArlTc95xJMu38xpv8uKXu95syEHCqB6f+GO6zkRgZNpmj
E7YQDdyCjTiMQuuLHfoalGoVYLRNvKcJsteVEh9UpAJZciV06P88eaJEqn3Ejj6+
UeJ8V+RaH//RUW2KIiMzFxLpy0X58F3RrgPf63HgVUsVTNff7kwh28ykVfoCEN0z
/2FAMAuC8W9jAq56k97X3gSdz8sRP/6IDdnh3oX
-----END CERTIFICATE-----
)EOF";

// ===== Topics =====
String topicStatus = String("devices/") + DEVICE_ID + "/status";
String topicEvents = String("devices/") + DEVICE_ID + "/events";
String topicCtrl   = String("devices/") + DEVICE_ID + "/control";
String topicLWT    = String("devices/") + DEVICE_ID + "/lwt";

// ===== Globals =====
WiFiClientSecure wifiClient;
PubSubClient mqtt(wifiClient);
Adafruit_MPU6050 mpu;

bool active = true;
float threshold = 1.2f;  // limiar base (ajustável)
int sens = 80;           // 0-100 (ajusta peso)

unsigned long lastStatusMs = 0;
unsigned long lastEvtMs = 0;

// estado para filtragem
float base = 1.0f; // baseline da magnitude (para remover gravidade)
float sm = 0.0f;   // sinal suavizado
float lastSm = 0.0f;

// janela
const int WIN_MS = 3000;
int peaks = 0;
unsigned long winStart = 0;
bool inEvent = false;
unsigned long lastOver = 0;

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
}

void publishStatus(bool retained=true) {
  StaticJsonDocument<192> st;
  st["online"] = true;
  st["active"] = active;
  st["threshold"] = threshold;
  st["sens"] = sens;
  st["fw"] = "0.2.0-cloud";
  char buf[192];
  size_t n = serializeJson(st, buf, sizeof(buf));
  // PubSubClient com length/retained requer const uint8_t*
  mqtt.publish(topicStatus.c_str(), (const uint8_t*)buf, (unsigned int)n, retained);
}

void publishEvent(float ax, float ay, float az, int severity) {
  StaticJsonDocument<256> evt;
  evt["t"] = (long)(millis()/1000);
  evt["type"] = "seizure";
  evt["severity"] = severity;
  evt["ax"] = ax; evt["ay"] = ay; evt["az"] = az;
  char buf[256];
  size_t n = serializeJson(evt, buf, sizeof(buf));
  mqtt.publish(topicEvents.c_str(), (const uint8_t*)buf, (unsigned int)n, false);
}

void onMqttMessage(char* topic, byte* payload, unsigned int len) {
  StaticJsonDocument<256> doc;
  auto err = deserializeJson(doc, payload, len);
  if (err) return;

  if (doc.containsKey("setActive"))      active    = doc["setActive"];
  if (doc.containsKey("setThreshold"))   threshold = doc["setThreshold"];
  if (doc.containsKey("setSensitivity")) sens      = doc["setSensitivity"];
  if (doc.containsKey("resetStats"))     { /* zere contadores se existir */ }
  if (doc.containsKey("testBuzzer"))     { /* toque buzzer no seu pino */ }

  publishStatus(true);
}

void ensureMqtt() {
  if (mqtt.connected()) return;

  wifiClient.setCACert(ROOT_CA);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512); // evita problema com JSON maior

  // LWT: published by broker if we drop
  StaticJsonDocument<64> lwt;
  lwt["online"] = false;
  char lwtBuf[64];
  serializeJson(lwt, lwtBuf, sizeof(lwtBuf)); // string C (char*) terminada em \0

  while (!mqtt.connected()) {
    // Usa overload que espera willMessage como const char*
    if (mqtt.connect(DEVICE_ID, MQTT_USER, MQTT_PASS,
                     topicLWT.c_str(), 1, false, lwtBuf)) {
      mqtt.subscribe(topicCtrl.c_str(), 1);
      publishStatus(true);
    } else {
      delay(2000);
    }
  }
}

bool initMPU() {
  if (!mpu.begin()) return false;
  mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  winStart = millis();
  return true;
}

void readIMU(float &ax, float &ay, float &az, float &gx, float &gy, float &gz) {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  ax = a.acceleration.x / 9.80665f; // m/s^2 -> g
  ay = a.acceleration.y / 9.80665f;
  az = a.acceleration.z / 9.80665f;
  gx = g.gyro.x * 57.2958f; // rad/s -> deg/s
  gy = g.gyro.y * 57.2958f;
  gz = g.gyro.z * 57.2958f;
}

void processDetection(float ax, float ay, float az, float gx, float gy, float gz, float dt) {
  // magnitude e alta-passagem
  float amag = sqrt(ax*ax + ay*ay + az*az);
  base = 0.995f*base + 0.005f*amag;  // baseline lento
  float ahp = amag - base;

  // suavização (EMA)
  sm = 0.8f*sm + 0.2f*ahp;

  // jerk (derivada do sinal suavizado)
  float jerk = fabs(sm - lastSm) / dt;
  lastSm = sm;

  float gmag = sqrt(gx*gx + gy*gy + gz*gz);

  // pesos (podem virar parâmetros remotos depois)
  float wA = 0.6f, wJ = 0.3f, wG = 0.1f;
  float score = wA * fabs(sm) + wJ * jerk + wG * gmag;

  // thresholds com histerese
  float th_on  = threshold;
  float th_off = threshold * 0.6f;

  // janela deslizante
  if (score > th_on) peaks++;
  if (millis() - winStart > WIN_MS) { winStart = millis(); peaks = 0; }

  if (!inEvent && peaks >= 3) {
    // refratário 5s
    if (millis() - lastEvtMs > 5000) {
      inEvent = true;
      lastEvtMs = millis();
      publishEvent(ax, ay, az, 1);
      // buzzer/LED se quiser
    }
  }

  if (score > th_off) lastOver = millis();
  if (inEvent && (millis() - lastOver) > 800) {
    inEvent = false;
    peaks = 0;
  }
}

void setup() {
  // Serial.begin(115200);
  ensureWifi();
  ensureMqtt();
  if (!initMPU()) {
    // Serial.println("MPU falhou");
    delay(2000);
  }
  base = 1.0f; sm = 0.0f; lastSm = 0.0f;
  winStart = millis();
}

void loop() {
  ensureWifi();
  ensureMqtt();
  mqtt.loop();

  static unsigned long lastMs = millis();
  unsigned long now = millis();
  float dt = (now - lastMs) / 1000.0f;
  if (dt <= 0) dt = 0.02f;
  lastMs = now;

  float ax, ay, az, gx, gy, gz;
  readIMU(ax, ay, az, gx, gy, gz);
  if (active) processDetection(ax, ay, az, gx, gy, gz, dt);

  if (millis() - lastStatusMs > 5000) {
    lastStatusMs = millis();
    publishStatus(true);
  }

  delay(10);
}
