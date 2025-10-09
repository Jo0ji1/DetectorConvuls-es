/********** SeizureDetector — ESP32 + MPU6050 + HiveMQ Cloud (TLS) **********
 * Recursos:
 *  - Wi-Fi 2.4 GHz
 *  - TLS seguro (ISRG Root X1) + NTP antes do handshake
 *  - Reconexão MQTT não-bloqueante (backoff + jitter)
 *  - Status rico (uptime, rssi, sensor OK, seq, events, severity, buzzer)
 *  - Eventos não-retidos
 *  - Leitura do MPU6050 protegida (sem "spam" se I2C falhar)
 *  - DETECÇÃO APRIMORADA:
 *      * pico (score > th_on) + contagem
 *      * RMS de janela de aceleração de alta-passagem (300 ms)
 *      * giro (gyro magnitude)
 *      * sensibilidade 0..100 ajusta limiares dinamicamente
 *  - BUZZER:
 *      * Ativo por padrão (bipe 3x a cada evento)
 *      * Controle remoto via MQTT: {"enableBuzzer": true|false, "testBuzzer": true}
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
#define LED_PIN 12                         // LED onboard (DevKit v1)
#define WIFI_CONNECT_TIMEOUT 20000        // ms
#define MQTT_RETRY_BACKOFF_MS 2000        // backoff base em ms (usado com jitter)
#define STATUS_PERIOD_MS 5000             // período de publish do status

// =================== BUZZER =========================
// Buzzer ATIVO (liga com HIGH). Se seu buzzer for PASSIVO, defina BUZZER_IS_PASSIVE 1.
#define BUZZER_PIN 23
#define BUZZER_ACTIVE_HIGH 1
#define BUZZER_IS_PASSIVE 0   // 0 = buzzer ativo; 1 = buzzer passivo (usa PWM)
bool    buzzerEnabled = true; // pode ser alterado via MQTT

#if BUZZER_IS_PASSIVE
  // canal PWM para tom
  #define BUZZER_PWM_CH 3
  #define BUZZER_PWM_FREQ 2000
  #define BUZZER_PWM_RES 10
#endif

// =================== WIFI (2.4 GHz) =================
const char* WIFI_SSID = "ESP32TEST";
const char* WIFI_PASS = "12345678";

// =================== MQTT (HiveMQ Cloud) ============
const char* MQTT_HOST = "9a41abb938cd484e9dc8b865088f234b.s1.eu.hivemq.cloud";
const int   MQTT_PORT = 8883; // TLS
const char* MQTT_USER = "device-esp32-ABC123";
const char* MQTT_PASS = "Esp32224180";
const char* DEVICE_ID = "esp32-ABC123";

// =================== Root CA (ISRG Root X1) =========
// CA oficial Let's Encrypt (ISRG Root X1)
static const char* ROOT_CA = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

// =================== TÓPICOS ===================
String topicStatus = String("devices/") + DEVICE_ID + "/status";
String topicEvents = String("devices/") + DEVICE_ID + "/events";
String topicCtrl   = String("devices/") + DEVICE_ID + "/control";
String topicLWT    = String("devices/") + DEVICE_ID + "/lwt";

// =================== GLOBAIS ===================
WiFiClientSecure wifiClient;
PubSubClient mqtt(wifiClient);
Adafruit_MPU6050 mpu;

bool   active    = true;
float  threshold = 1.2f;      // limiar base (usado no modo picos)
int    sens      = 80;        // 0-100 (mapeia thresholds dinâmicos)
bool   mpu_ok    = false;

unsigned long lastStatusMs = 0;
unsigned long lastEvtMs    = 0;
uint32_t seq               = 0;
uint32_t eventsCount       = 0;
int lastSeverity           = 0;

float base = 1.0f, sm = 0.0f, lastSm = 0.0f;
const int WIN_MS = 300;             // janela curta p/ RMS (ms)
const int PEAK_WIN_MS = 3000;       // janela p/ contagem de picos
int peaks = 0;
unsigned long winStart = 0;
bool inEvent = false;
unsigned long lastOver = 0;

// RMS janela (exponencial aproximado p/ baratear)
float rmsAcc = 0.0f;                // RMS da aceleração de alta-passagem
const float RMS_ALPHA = 0.15f;      // EMA para RMS

// Giro
float gmagEMA = 0.0f;
const float GYRO_ALPHA = 0.10f;

// =================== UTIL / LOG ===================
void beat(const char* msg) {
  static bool on = false;
  on = !on;
  digitalWrite(LED_PIN, on ? HIGH : LOW);
  if (msg) Serial.println(msg);
}

// =================== BUZZER ===================
void buzzerOn() {
#if BUZZER_IS_PASSIVE
  ledcWriteTone(BUZZER_PWM_CH, 2200); // tom ~2.2kHz
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
  // 3 bipes curtos, não bloqueantes (pequeno bloqueio aceitável no evento)
  for (int i=0;i<3;i++){
    buzzerOn(); delay(120);
    buzzerOff(); delay(120);
  }
}

// =================== WIFI ===================
bool ensureWifi(unsigned long timeoutMs = WIFI_CONNECT_TIMEOUT) {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.print("[WiFi] conectando em: "); Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) {
    delay(500); Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WiFi] OK, IP="); Serial.println(WiFi.localIP());
    return true;
  } else {
    Serial.println("[WiFi] FALHOU (timeout)");
    return false;
  }
}

// =================== NTP (hora certa p/ TLS) ===================
bool syncTime(uint32_t timeoutMs = 15000) {
  Serial.println("[TIME] sincronizando NTP...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  time_t now = 0; uint32_t t0 = millis();
  while (now < 1700000000 && (millis() - t0) < timeoutMs) {
    delay(500); Serial.print(".");
    now = time(nullptr);
  }
  Serial.println();
  if (now >= 1700000000) {
    struct tm tm; gmtime_r(&now, &tm);
    Serial.printf("[TIME] OK %04d-%02d-%02d %02d:%02d:%02d UTC\n",
      tm.tm_year+1900, tm.tm_mon+1, tm.tm_mday, tm.tm_hour, tm.tm_min, tm.tm_sec);
    return true;
  }
  Serial.println("[TIME] FALHA NTP");
  return false;
}

// =================== STATUS PUBLISH ===================
void publishStatus(bool retained=true) {
  StaticJsonDocument<320> st;
  st["online"]    = true;
  st["active"]    = active;
  st["threshold"] = threshold;
  st["sens"]      = sens;
  st["fw"]        = "0.3.0-cloud";
  st["uptime"]    = (uint32_t)(millis()/1000);
  st["rssi"]      = (WiFi.status()==WL_CONNECTED ? WiFi.RSSI() : 0);
  st["sensor"]    = mpu_ok;
  st["seq"]       = seq++;
  st["events"]    = eventsCount;
  st["severity"]  = lastSeverity;
  st["buzzer"]    = buzzerEnabled;

  char buf[340];
  size_t n = serializeJson(st, buf, sizeof(buf));
  mqtt.publish(topicStatus.c_str(), (const uint8_t*)buf, (unsigned int)n, retained);
  Serial.println("[STAT] publish status");
}

// =================== MQTT CALLBACK ===================
void onMqttMessage(char* topic, byte* payload, unsigned int len) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, payload, len);
  if (err) { Serial.println("[MQTT] JSON inválido"); return; }

  if (doc.containsKey("setActive"))      active         = doc["setActive"];
  if (doc.containsKey("setThreshold"))   threshold      = doc["setThreshold"];
  if (doc.containsKey("setSensitivity")) sens           = doc["setSensitivity"];
  if (doc.containsKey("enableBuzzer"))   buzzerEnabled  = doc["enableBuzzer"];

  if (doc.containsKey("resetStats")) {
    eventsCount = 0; lastSeverity = 0; seq = 0;
  }
  if (doc.containsKey("testBuzzer") && (bool)doc["testBuzzer"] == true) {
    buzzerBeepPattern();
  }

  Serial.println("[MQTT] controle recebido -> publishStatus()");
  publishStatus(true);
}

// =================== MQTT CONNECT ===================
bool connectMqtt() {
  Serial.println("[MQTT] preparando TLS...");
  wifiClient.setCACert(ROOT_CA);         // valida o certificado do broker
  wifiClient.setHandshakeTimeout(30);    // s
  wifiClient.setTimeout(15 * 1000);      // ms

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(768);
  mqtt.setKeepAlive(30);                 // s
  mqtt.setSocketTimeout(15);             // s

  // LWT
  StaticJsonDocument<64> lwt;
  lwt["online"] = false;
  char lwtBuf[64]; serializeJson(lwt, lwtBuf, sizeof(lwtBuf));

  Serial.println("[MQTT] conectando...");
  bool ok = mqtt.connect(DEVICE_ID, MQTT_USER, MQTT_PASS,
                         topicLWT.c_str(), 1, false, lwtBuf);
  if (ok) {
    Serial.println("[MQTT] conectado!");
    mqtt.subscribe(topicCtrl.c_str(), 1);
    publishStatus(true);                 // status retained inicial
  } else {
    Serial.print("[MQTT] falhou, rc="); Serial.println(mqtt.state());
  }
  return ok;
}

// Reconexão não-bloqueante (backoff + jitter)
void ensureMqtt() {
  if (mqtt.connected()) return;
  static uint32_t nextTry = 0;
  static uint32_t tries = 0;

  if (millis() < nextTry) return;
  if (!ensureWifi()) { nextTry = millis() + 2000; return; }

  if (connectMqtt()) { tries = 0; return; }

  tries++;
  uint32_t backoff = MQTT_RETRY_BACKOFF_MS * tries;
  if (backoff > 10000) backoff = 10000;
  uint32_t jitter = random(0, 500);
  nextTry = millis() + backoff + jitter;
  Serial.printf("[MQTT] retry em %lu ms\n", backoff + jitter);
}

// =================== MPU / I2C ===================
bool initMPU() {
  // I2C explícito (DevKit v1: SDA=21, SCL=22)
  Wire.begin(21, 22);
  Wire.setTimeOut(2000);
  Wire.setClock(100000); // 100 kHz padrão

  if (!mpu.begin()) return false;
  mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  winStart = millis();
  return true;
}

void publishEvent(float ax, float ay, float az, int severity) {
  StaticJsonDocument<256> evt;
  evt["t"] = (long)(millis()/1000);
  evt["type"] = "seizure";
  evt["severity"] = severity;
  evt["ax"] = ax; evt["ay"] = ay; evt["az"] = az;
  char buf[256]; size_t n = serializeJson(evt, buf, sizeof(buf));
  mqtt.publish(topicEvents.c_str(), (const uint8_t*)buf, (unsigned int)n, false);
  Serial.println("[EVT] publish");
}

// =================== DETECÇÃO APRIMORADA ===================
// Mapear sens (0..100) para fatores de limiar
// sens mais alto -> mais sensível (limiares menores)
void computeThresholds(float& th_on, float& th_off, float& rms_th, float& gyro_th) {
  // base da sua versão anterior
  float base_th = threshold;   // 1.2 default
  // sens mapeia ~ [0.6x .. 1.6x] nos limiares:
  float k = 1.6f - (sens / 100.0f) * 1.0f;  // sens=100 => k=0.6 ; sens=0 => k=1.6
  th_on  = base_th * k;
  th_off = th_on * 0.6f;

  // thresholds auxiliares (RMS & gyro):
  // RMS: valores típicos de sm ~ 0.05-0.2 em repouso; choque/convulsão > 0.5
  rms_th  = 0.45f * k;      // mais sensível -> menor
  // Gyro magnitude (deg/s): repouso < 15, chacoalhar > 120
  gyro_th = 120.0f * k;
}

void processDetection(float ax, float ay, float az, float gx, float gy, float gz, float dt) {
  // magnitude de aceleração e alta-passagem (remove gravidade lentamente)
  float amag = sqrtf(ax*ax + ay*ay + az*az);
  base = 0.995f * base + 0.005f * amag;
  float ahp = amag - base;                 // aceleração de alta-passagem

  // suavização (EMA) + jerk
  sm = 0.8f * sm + 0.2f * ahp;
  float jerk = fabsf(sm - lastSm) / fmaxf(dt, 1e-3f); 
  lastSm = sm;

  // gyro magnitude e seu EMA
  float gmag = sqrtf(gx*gx + gy*gy + gz*gz);
  gmagEMA = (1.0f - GYRO_ALPHA) * gmagEMA + GYRO_ALPHA * gmag;

  // RMS exponencial da aceleração de alta-passagem
  float sm2 = sm*sm;
  rmsAcc = sqrtf( (1.0f - RMS_ALPHA) * (rmsAcc*rmsAcc) + RMS_ALPHA * sm2 );

  // score principal (mantido, ajustável)
  float wA=0.55f, wJ=0.30f, wG=0.15f;
  float score = wA*fabsf(sm) + wJ*jerk + wG*gmagEMA;

  // thresholds dinâmicos baseados na sens
  float th_on, th_off, rms_th, gyro_th;
  computeThresholds(th_on, th_off, rms_th, gyro_th);

  // --- Critérios de disparo ---
  bool peakMode  = (score > th_on);
  bool rmsMode   = (rmsAcc > rms_th);     // janela curta ficou "energética"
  bool gyroMode  = (gmagEMA > gyro_th);   // rotação forte sustentada

  if (peakMode) peaks++;
  if (millis() - winStart > PEAK_WIN_MS) {
    winStart = millis();
    peaks = 0;
  }

  // combinação: se (picos suficientes) OU (RMS & gyro juntos), dispara evento
  bool trigger = (peaks >= 3) || (rmsMode && gyroMode);

  if (!inEvent && trigger) {
    if (millis() - lastEvtMs > 4000) {  // refratário 4s
      inEvent = true; 
      lastEvtMs = millis();
      // severidade ~ energia: use soma normalizada de indicadores
      float sevf = ( (fabsf(sm)/fmaxf(th_on, 0.1f)) + (rmsAcc/fmaxf(rms_th,0.1f)) + (gmagEMA/fmaxf(gyro_th,1.0f)) ) / 3.0f;
      int severity = (int) roundf( fminf(3.0f, fmaxf(1.0f, sevf * 2.0f)) ); // 1..3
      lastSeverity = severity;
      eventsCount++;

      publishEvent(ax, ay, az, severity);
      if (buzzerEnabled) buzzerBeepPattern();
      Serial.printf("[EVT] seizure detectada (sev=%d)\n", severity);
    }
  }

  if (score > th_off) lastOver = millis();
  if (inEvent && (millis() - lastOver) > 700) {
    inEvent = false;
    peaks = 0;
  }
}

// =================== SETUP / LOOP ===================
void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  pinMode(BUZZER_PIN, OUTPUT);
#if BUZZER_IS_PASSIVE
  ledcSetup(BUZZER_PWM_CH, BUZZER_PWM_FREQ, BUZZER_PWM_RES);
  ledcAttachPin(BUZZER_PIN, BUZZER_PWM_CH);
  buzzerOff();
#else
  buzzerOff();
#endif

  Serial.begin(115200);
  delay(1500);
  Serial.println("\n[BOOT] setup()");

  // semente pro jitter
  randomSeed(esp_random());

  // Wi-Fi + hora (NTP) antes do TLS
  if (!ensureWifi()) {
    Serial.println("[BOOT] sem WiFi, rodando offline");
  } else {
    syncTime(); // importante para TLS
  }

  // MQTT
  ensureMqtt();

  // MPU6050
  Serial.println("[BOOT] iniciando MPU...");
  mpu_ok = initMPU();
  Serial.println(mpu_ok ? "[BOOT] MPU OK" : "[BOOT] MPU falhou (continua sem sensor)");

  base = 1.0f; sm = 0.0f; lastSm = 0.0f; winStart = millis();
}

void loop() {
  // batimento de vida
  static unsigned long hb=0; if (millis()-hb>1000){ beat("[LOOP] vivo"); hb=millis(); }

  // Wi-Fi / MQTT
  if (!ensureWifi()) { delay(500); return; }
  ensureMqtt();
  mqtt.loop();

  // leitura e detecção (proteção contra I2C intermitente)
  static unsigned long lastMs = millis();
  unsigned long now = millis();
  float dt = (now - lastMs) / 1000.0f; if (dt <= 0) dt = 0.02f;
  lastMs = now;

  if (mpu_ok) {
    sensors_event_t a, g, t;
    if (mpu.getEvent(&a, &g, &t)) {
      float ax = a.acceleration.x / 9.80665f;
      float ay = a.acceleration.y / 9.80665f;
      float az = a.acceleration.z / 9.80665f;
      float gx = g.gyro.x * 57.2958f;
      float gy = g.gyro.y * 57.2958f;
      float gz = g.gyro.z * 57.2958f;

      if (active) processDetection(ax, ay, az, gx, gy, gz, dt);
    } else {
      static uint8_t misses=0;
      if (++misses % 50 == 0) Serial.println("[I2C] falha de leitura IMU (intermitente)");
    }
  }

  // status periódico
  if (millis() - lastStatusMs > STATUS_PERIOD_MS) {
    lastStatusMs = millis();
    publishStatus(true);  // retained
  }

  // sem delay longo: baixa latência / evita bloquear Wi-Fi/MQTT
  delay(1);
}
