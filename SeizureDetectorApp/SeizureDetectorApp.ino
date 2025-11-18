/********** SeizureDetector — ESP32 + MPU6050 + HiveMQ Cloud (TLS) **********
 * Versão 0.5.3-B – Robust Stable + Quiet Reset
 *
 * Base: 0.4.1-A (MQTT/Wi-Fi/TLS/Debug/Status intactos)
 *
 * Melhorias:
 *  - Filtros corrigidos (base, sm, rms) para zerar falsos positivos parado
 *  - Score calibrado (jerk não domina parado)
 *  - Critério de amostra convulsiva:
 *        isConv = strongScore && (rmsMode || gyroMode)
 *  - Janela robusta 5s (~17 amostras a 300ms):
 *        >=60% convulsivas → crise
 *        <=30% convulsivas + energia baixa → fim da crise
 *  - Reaviso a cada 20s se janela continuar convulsiva
 *  - Reset automático da janela após ~4s de quietude (sem convulsão + baixa energia)
 *  - Nenhum evento:
 *        • no boot
 *        • nos primeiros 8s após filtros inicializados
 *************************************************************************/
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include <math.h>
#include <time.h>

// =================== CONFIG GERAL ===================
#define LED_PIN 12
#define WIFI_CONNECT_TIMEOUT 20000
#define MQTT_RETRY_BACKOFF_MS 2000
#define STATUS_PERIOD_MS 5000

// =================== BUZZER =========================
#define BUZZER_PIN 23
#define BUZZER_ACTIVE_HIGH 1
#define BUZZER_IS_PASSIVE 0
bool buzzerEnabled = true;

#if BUZZER_IS_PASSIVE
#define BUZZER_PWM_CH 3
#define BUZZER_PWM_FREQ 2000
#define BUZZER_PWM_RES 10
#endif

// =================== WIFI ===================
const char* WIFI_SSID = "ESP32TEST";
const char* WIFI_PASS = "12345678";

// =================== MQTT ===================
const char* MQTT_HOST = "9a41abb938cd484e9dc8b865088f234b.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;
const char* MQTT_USER = "device-esp32-ABC123";
const char* MQTT_PASS = "Esp32224180";
const char* DEVICE_ID = "esp32-ABC123";

// CA apenas como referência (TLS com setInsecure)
static const char* ROOT_CA = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
...
-----END CERTIFICATE-----
)EOF";

// =================== TÓPICOS ===================
String topicStatus = String("devices/") + DEVICE_ID + "/status";
String topicEvents = String("devices/") + DEVICE_ID + "/events";
String topicCtrl = String("devices/") + DEVICE_ID + "/control";
String topicLWT = String("devices/") + DEVICE_ID + "/lwt";
String topicDebug = String("devices/") + DEVICE_ID + "/debug";

// =================== GLOBAIS ===================
WiFiClientSecure wifiClient;
PubSubClient mqtt(wifiClient);
Adafruit_MPU6050 mpu;

bool active = true;
float threshold = 1.08f; // <-- antes 1.20f (10% mais sensível)
int sens = 80;
bool mpu_ok = false;
bool timeSynced = false;

unsigned long lastStatusMs = 0;
unsigned long lastEvtMs = 0;
uint32_t seq = 0;
uint32_t eventsCount = 0;
int lastSeverity = 0;

float base = 1.0f, sm = 0.0f, lastSm = 0.0f;
float rmsAcc = 0.0f;
float gmagEMA = 0.0f;

unsigned long lastDebugMs = 0;

// SAFE-BOOT
unsigned long bootTime = 0;
bool filtersInitialized = false;
unsigned long filterInitTime = 0;

// =================== FILTROS ===================
const float RMS_ALPHA = 0.05f;
const float GYRO_ALPHA = 0.10f;

// =================== JANELA ROBUSTA ===================
const unsigned long READ_INTERVAL_MS = 300;
const unsigned long EVENT_REPEAT_MS = 20000UL;
const unsigned long QUIET_RESET_MS = 4000UL;

const int WINDOW_SAMPLES = 17;
uint8_t convHist[WINDOW_SAMPLES];
int convIndex = 0;

const int ENTER_COUNT = 11; // >=60%
const int EXIT_COUNT = 5; // <=30%

bool inEvent = false;
unsigned long lastRealert = 0;
unsigned long lastConvMs = 0;

// =================== UTIL ===================
void beat(const char* msg) {
static bool on = false;
on = !on;
digitalWrite(LED_PIN, on ? HIGH : LOW);
if (msg) Serial.println(msg);
}
// =================== BUZZER ===================
void buzzerOn() {
#if BUZZER_IS_PASSIVE
ledcWriteTone(BUZZER_PWM_CH, 2200);
#else
digitalWrite(BUZZER_PIN, BUZZER_ACTIVE_HIGH ? HIGH : LOW);
#endif
}

void buzzerOff() {
#if BUZZER_IS_PASSIVE
ledcWriteTone(BUZZER_PWM_CH, 0);
#else
digitalWrite(BUZZER_PIN, BUZZER_ACTIVE_HIGH ? LOW : HIGH);
#endif
}

void buzzerBeepPattern() {
if (!buzzerEnabled) return;
for (int i=0;i<3;i++){
buzzerOn(); delay(120);
buzzerOff(); delay(120);
}
}

// =================== WIFI ===================
bool ensureWifi(unsigned long timeoutMs = WIFI_CONNECT_TIMEOUT) {
if (WiFi.status() == WL_CONNECTED) return true;

Serial.print("[WiFi] Conectando em: ");
Serial.println(WIFI_SSID);
WiFi.mode(WIFI_STA);
WiFi.begin(WIFI_SSID, WIFI_PASS);

unsigned long t0 = millis();
while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) {
delay(500);
Serial.print(".");
}
Serial.println();

if (WiFi.status() == WL_CONNECTED) {
Serial.print("[WiFi] OK, IP=");
Serial.println(WiFi.localIP());
return true;
}

Serial.println("[WiFi] FALHOU");
return false;
}

// =================== NTP ===================
bool syncTimeOnce(uint32_t timeoutMs = 15000) {
Serial.println("[TIME] Sincronizando NTP...");
configTime(0, 0, "pool.ntp.org", "time.nist.gov");

time_t now = 0;
unsigned long t0 = millis();
while (now < 1700000000 && millis() - t0 < timeoutMs) {
delay(500);
now = time(nullptr);
}

if (now >= 1700000000) {
Serial.print("[TIME] OK: ");
Serial.print(ctime(&now));
timeSynced = true;
return true;
}

Serial.println("[TIME] FALHOU NTP");
timeSynced = false;
return false;
}

void ensureTime() {
if (timeSynced) return;

for (int i = 0; i < 3 && !timeSynced; i++) {
if (!ensureWifi()) return;
syncTimeOnce();
if (!timeSynced) delay(500);
}
}

// =================== STATUS ===================
void publishStatus(bool retained = true) {
if (!mqtt.connected()) return;

StaticJsonDocument<350> st;
st["online"] = true;
st["active"] = active;
st["threshold"] = threshold;
st["sens"] = sens;
st["fw"] = "0.5.4-B";
st["uptime"] = (uint32_t)(millis()/1000);
st["rssi"] = (WiFi.status()==WL_CONNECTED ? WiFi.RSSI() : 0);
st["sensor"] = mpu_ok;
st["seq"] = seq++;
st["events"] = eventsCount;
st["severity"] = lastSeverity;
st["buzzer"] = buzzerEnabled;

char buf[350];
serializeJson(st, buf);
mqtt.publish(topicStatus.c_str(), buf, retained);
}

// =================== DEBUG ===================
void debugPublish(float ax, float ay, float az,
float gmag, float rms, float smVal,
float jerk, float score,
int convCount, bool windowTrig,
float th_on, float rms_th, float gyro_th)
{
if (!mqtt.connected()) return;

unsigned long now = millis();
if (now - lastDebugMs < 200) return; // 200ms mínimo
lastDebugMs = now;

StaticJsonDocument<400> d;

d["ax"] = ax;
d["ay"] = ay;
d["az"] = az;
d["gmag"] = gmag;

d["rms"] = rms;
d["sm"] = smVal;
d["jerk"] = jerk;
d["score"] = score;

d["peaks"] = convCount;
d["trig"] = windowTrig;

d["th_on"] = th_on;
d["rms_th"] = rms_th;
d["gyro_th"] = gyro_th;

char buf[450];
serializeJson(d, buf);

mqtt.publish(topicDebug.c_str(), buf, false);
}

// =================== MQTT CALLBACK ===================
void onMqttMessage(char* topic, byte* payload, unsigned int len) {
StaticJsonDocument<256> doc;
if (deserializeJson(doc, payload, len)) return;

if (doc.containsKey("setActive"))
active = doc["setActive"];

if (doc.containsKey("setThreshold"))
threshold = doc["setThreshold"];

if (doc.containsKey("setSensitivity"))
sens = doc["setSensitivity"];

if (doc.containsKey("enableBuzzer"))
buzzerEnabled = doc["enableBuzzer"];

if (doc.containsKey("resetStats")) {
seq = 0;
lastSeverity = 0;
eventsCount = 0;
}

if (doc.containsKey("testBuzzer") && doc["testBuzzer"])
buzzerBeepPattern();

publishStatus(true);
}

// =================== MQTT CONNECT ===================
bool connectMqtt() {
Serial.println("[MQTT] Preparando conexão TLS...");
wifiClient.stop();

wifiClient.setInsecure();
wifiClient.setHandshakeTimeout(30);
wifiClient.setTimeout(15000);

mqtt.setServer(MQTT_HOST, MQTT_PORT);
mqtt.setCallback(onMqttMessage);
mqtt.setBufferSize(768);
mqtt.setKeepAlive(30);
mqtt.setSocketTimeout(15);

StaticJsonDocument<64> lwt;
lwt["online"] = false;

char lwtBuf[64];
serializeJson(lwt, lwtBuf);

Serial.println("[MQTT] Conectando ao broker...");
bool ok = mqtt.connect(
DEVICE_ID,
MQTT_USER,
MQTT_PASS,
topicLWT.c_str(),
1,
false,
lwtBuf);

if (!ok) {
Serial.print("[MQTT] FALHA connect, state=");
Serial.println(mqtt.state());
return false;
}

Serial.println("[MQTT] Conectado com sucesso");
mqtt.subscribe(topicCtrl.c_str(), 1);
publishStatus(true);
return true;
}

void ensureMqtt() {
if (mqtt.connected()) return;

static unsigned long nextTry = 0;
static int tries = 0;
unsigned long now = millis();

if (now < nextTry) return;

if (!ensureWifi()) {
nextTry = now + 2000;
return;
}

ensureTime();
if (!timeSynced) {
nextTry = now + 5000;
return;
}

if (connectMqtt()) {
tries = 0;
return;
}

tries++;
unsigned long backoff = min(10000UL, (unsigned long)MQTT_RETRY_BACKOFF_MS * tries);
unsigned long jitter = random(0, 500);
nextTry = now + backoff + jitter;
}

// =================== MPU ===================
bool initMPU() {
Wire.begin(21, 22);
Wire.setTimeOut(2000);
Wire.setClock(100000);

if (!mpu.begin()) {
Serial.println("[MPU] Falha ao iniciar MPU6050");
return false;
}

mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
mpu.setGyroRange(MPU6050_RANGE_500_DEG);
mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

Serial.println("[MPU] OK");
return true;
}

// =================== THRESHOLDS ===================
void computeThresholds(float& th_on, float& th_off,
float& rms_th, float& gyro_th)
{
float k = 1.6f - (sens / 100.0f) * 1.0f;

th_on = threshold * k;
th_off = th_on * 0.6f;

rms_th  = 0.30f * k;   // ~20% mais sensível
gyro_th = 100.0f * k;  // ~20% mais sensível
}
// =================== EVENT ===================
void publishEvent(float ax, float ay, float az, int severity) {
  if (!mqtt.connected()) return;

  StaticJsonDocument<256> evt;

  evt["t"] = (long)(millis() / 1000);
  evt["type"] = "seizure";
  evt["severity"] = severity;

  evt["ax"] = ax;
  evt["ay"] = ay;
  evt["az"] = az;

  char buf[256];
  serializeJson(evt, buf);

  mqtt.publish(topicEvents.c_str(), buf, false);
}


// =================== DETECÇÃO ===================
void processDetection(float ax, float ay, float az,
                      float gx, float gy, float gz,
                      float dt)
{
  // SAFE BOOT: ignorar tudo antes de ~0.8s
  if (!filtersInitialized) {
    if (millis() - bootTime < 800) return;

    // Inicializa filtros a partir do estado atual
    float amag0 = sqrtf(ax*ax + ay*ay + az*az);
    float gmag0 = sqrtf(gx*gx + gy*gy + gz*gz);

    filtersInitialized = true;

    base    = amag0;
    sm      = 0.0f;
    lastSm  = 0.0f;
    rmsAcc  = 0.0f;
    gmagEMA = gmag0;

    inEvent = false;
    lastRealert = 0;
    filterInitTime = millis();
    lastConvMs = millis();

    // limpa janela
    for (int i = 0; i < WINDOW_SAMPLES; i++) convHist[i] = 0;
    convIndex = 0;

    Serial.println("[DET] Filtros inicializados");
    return;
  }


  // =================== FEATURES ===================
  unsigned long nowMs = millis();

  float amag = sqrtf(ax*ax + ay*ay + az*az);

  // base super lenta
  base = 0.999f * base + 0.001f * amag;

  float ahp = amag - base;

  // sm suavizado
  sm = 0.90f * sm + 0.10f * ahp;

  float jerk = fabsf(sm - lastSm) / fmaxf(dt, 0.01f);
  lastSm = sm;

  // gyro
  float gmag = sqrtf(gx*gx + gy*gy + gz*gz);
  gmagEMA = (1.0f - GYRO_ALPHA) * gmagEMA + GYRO_ALPHA * gmag;

  // RMS — atualização lenta
  float sm2 = sm * sm;
  rmsAcc = sqrtf((1.0f - RMS_ALPHA) * (rmsAcc*rmsAcc) + RMS_ALPHA*sm2);

  // thresholds dinâmicos
  float th_on, th_off, rms_th, gyro_th;
  computeThresholds(th_on, th_off, rms_th, gyro_th);


  // =================== SCORE (mais sensível) ===================
  float wA = 0.60f;
  float wJ = 0.08f;   // jerk um pouco mais relevante
  float wG = 0.32f;

  float score = (wA * fabsf(sm)) + (wJ * jerk) + (wG * gmagEMA);


  // =================== CLASSIFICAÇÃO DA AMOSTRA ===================
  bool strongScore = score   > th_on;
  bool rmsMode     = rmsAcc  > rms_th;
  bool gyroMode    = gmagEMA > gyro_th;

  bool isConv = strongScore && (rmsMode || gyroMode);

  if (isConv)
    lastConvMs = nowMs;


  // =================== JANELA DESLIZANTE (5s / 17 amostras) ===================
  convHist[convIndex] = isConv ? 1 : 0;
  convIndex = (convIndex + 1) % WINDOW_SAMPLES;

  int convCount = 0;
  for (int i = 0; i < WINDOW_SAMPLES; i++) convCount += convHist[i];

  bool windowTrigger = (convCount >= ENTER_COUNT);


  // =================== DEBUG PUBLICAÇÃO ===================
  debugPublish(ax, ay, az, gmag, rmsAcc, sm, jerk,
               score, convCount, windowTrigger,
               th_on, rms_th, gyro_th);


  // =================== GATING: ignora primeiros 8s de estabilização ===================
  if (nowMs - filterInitTime < 8000) return;


  // =================== MÁQUINA DE ESTADOS ===================
  if (!inEvent) {

    // ----------- ENTRADA EM CRISE -----------
    if (convCount >= ENTER_COUNT) {
      if (nowMs - lastEvtMs > 4000) {  // proteção anti-dupla detecção

        inEvent = true;
        lastEvtMs = nowMs;
        lastRealert = nowMs;
        eventsCount++;

        float sevf =
          ((fabsf(sm)  / fmaxf(th_on, 0.1f)) +
           (rmsAcc     / fmaxf(rms_th, 0.1f)) +
           (gmagEMA    / fmaxf(gyro_th, 1.0f))) / 3.0f;

        int severity = (int)roundf(fminf(3.0f, fmaxf(1.0f, sevf * 2.0f)));
        lastSeverity = severity;

        Serial.print("[EVT] Trigger (start)! severity=");
        Serial.println(severity);

        publishEvent(ax, ay, az, severity);
        if (buzzerEnabled) buzzerBeepPattern();

        // LED piscando 3 segundos
        unsigned long ledT0 = millis();
        while (millis() - ledT0 < 3000) {
          digitalWrite(LED_PIN, HIGH); delay(150);
          digitalWrite(LED_PIN, LOW);  delay(150);
        }
      }
    }

  } else {

    // ----------- CRISE CONTINUADA (≥60% convulsivas) -----------
    if (convCount >= ENTER_COUNT) {

      if (nowMs - lastRealert >= EVENT_REPEAT_MS) {
        lastRealert = nowMs;
        lastEvtMs   = nowMs;

        float sevf =
          ((fabsf(sm)  / fmaxf(th_on, 0.1f)) +
           (rmsAcc     / fmaxf(rms_th, 0.1f)) +
           (gmagEMA    / fmaxf(gyro_th, 1.0f))) / 3.0f;

        int severity = (int)roundf(fminf(3.0f, fmaxf(1.0f, sevf * 2.0f)));
        lastSeverity = severity;

        Serial.print("[EVT] Trigger (repeat)! severity=");
        Serial.println(severity);

        publishEvent(ax, ay, az, severity);
        if (buzzerEnabled) buzzerBeepPattern();
      }
    }

    // ----------- SAÍDA ROBUSTA (≤30% convulsivas) -----------
    else {
      if (convCount <= EXIT_COUNT &&
          score   < th_off &&
          rmsAcc  < rms_th  * 0.70f &&
          gmagEMA < gyro_th * 0.70f) {

        inEvent = false;
        Serial.println("[EVT] Fim de crise (saída robusta)");
      }
    }
  }


  // =================== RESET AUTOMÁTICO APÓS QUIETUDE ===================
  if (!inEvent &&
      (nowMs - lastConvMs >= QUIET_RESET_MS) &&
      score   < th_off &&
      rmsAcc  < rms_th  * 0.80f &&
      gmagEMA < gyro_th * 0.80f)
  {
    for (int i = 0; i < WINDOW_SAMPLES; i++) convHist[i] = 0;
    convIndex = 0;
    lastRealert = 0;

    lastConvMs = nowMs;

    Serial.println("[DET] Reset janela por quietude prolongada");
  }
}
// =================== SETUP ===================
void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  pinMode(BUZZER_PIN, OUTPUT);
#if BUZZER_IS_PASSIVE
  ledcSetup(BUZZER_PWM_CH, BUZZER_PWM_FREQ, BUZZER_PWM_RES);
  ledcAttachPin(BUZZER_PIN, BUZZER_PWM_CH);
#endif
  buzzerOff();

  Serial.begin(115200);
  delay(1500);
  Serial.println("\n[BOOT] setup()");

  randomSeed(esp_random());
  bootTime = millis();

  // Conecta WiFi + NTP + MQTT
  ensureWifi();
  ensureTime();
  ensureMqtt();

  Serial.println("[BOOT] iniciando MPU...");
  mpu_ok = initMPU();

  // warmup do MPU
  Serial.println("[BOOT] warmup MPU 600ms...");
  unsigned long t0 = millis();
  sensors_event_t a, g, t;
  while (millis() - t0 < 600) {
    mpu.getEvent(&a,&g,&t);
    delay(5);
  }

  // reseta filtros
  base = 1.0f;
  sm = 0.0f;
  lastSm = 0.0f;
  rmsAcc = 0.0f;
  gmagEMA = 0.0f;

  // zera janela convulsiva
  for (int i = 0; i < WINDOW_SAMPLES; i++) convHist[i] = 0;
  convIndex = 0;

  lastDebugMs = millis();
  lastConvMs  = millis();
}


// =================== LOOP ===================
void loop() {

  // heartbeat
  static unsigned long hb = 0;
  if (millis() - hb > 1000) {
    beat("[LOOP] vivo");
    hb = millis();
  }

  ensureWifi();
  ensureMqtt();
  mqtt.loop();

  static unsigned long lastMs    = millis();
  static unsigned long lastDetMs = millis();

  unsigned long now = millis();
  float dt = (now - lastMs) / 1000.0f;
  if (dt <= 0) dt = 0.02f;
  lastMs = now;


  // ===== LEITURA A CADA 300ms =====
  if (mpu_ok && (now - lastDetMs >= READ_INTERVAL_MS)) {
    lastDetMs = now;

    sensors_event_t a, g, t;
    if (mpu.getEvent(&a,&g,&t)) {

      float ax = a.acceleration.x / 9.80665f;
      float ay = a.acceleration.y / 9.80665f;
      float az = a.acceleration.z / 9.80665f;

      float gx = g.gyro.x * 57.2958f;
      float gy = g.gyro.y * 57.2958f;
      float gz = g.gyro.z * 57.2958f;

      if (active) {
        processDetection(ax, ay, az, gx, gy, gz, dt);
      }
      else {
        float gmag = sqrtf(gx*gx + gy*gy + gz*gz);
        debugPublish(ax, ay, az, gmag, rmsAcc, sm,
                     0.0f, 0.0f, 0, false, 0,0,0);
      }

    } else {
      static uint8_t misses = 0;
      if (++misses % 50 == 0)
        Serial.println("[I2C] falha de leitura IMU");
    }
  }


  // status periódico no MQTT
  if (millis() - lastStatusMs > STATUS_PERIOD_MS) {
    lastStatusMs = millis();
    publishStatus(true);
  }

  delay(1);
}
