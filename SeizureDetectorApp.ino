#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>
#include <ESPmDNS.h>
#include <time.h>

// Configurações WiFi
const char* ssid = "UernNatal";
const char* password = "uern5322";

// Configurações de tempo (NTP)
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = -3 * 3600; // UTC-3 (Brasília)
const int daylightOffset_sec = 0; // Sem horário de verão

// Pinos e configurações - ATUALIZADOS
#define BUZZER_PIN 23      // Mudado de 32 para 23
#define LED_PIN 12
#define WEB_SERVER_PORT 80

// Objetos
Adafruit_MPU6050 mpu;
WebServer server(WEB_SERVER_PORT);

// Variáveis de controle
bool criseDetectada = false;
bool sistemaAtivo = true;
unsigned long ultimaCrise = 0;
const unsigned long intervaloCrise = 2000; // Reduzido para 2 segundos
float thresholdAceleracao = 2.5; // Threshold em "g"
int sensibilidade = 50;

// Variáveis para detecção de mudanças bruscas
float aceleracaoBase = 0;
float ultimaMagnitude = 0;
bool sistemaCalibrado = false;
unsigned long tempoCalibracaoInicio = 0;
const unsigned long tempoCalibracaoMs = 3000; // 3 segundos para calibrar

// Estatísticas e histórico
int totalEventos = 0;
float ultimaAceleracao = 0;
unsigned long sistemaStartTime = 0;
unsigned long ultimaAtividade = 0;

// Array para histórico de eventos (últimos 20)
struct Evento {
  unsigned long timestamp;
  float aceleracao;
  String tipo;
  String data_formatada;
};

Evento historicoEventos[20];
int indiceHistorico = 0;
int totalEventosHistorico = 0;

// Timer manual (substitui BlynkTimer)
unsigned long ultimaVerificacao = 0;
const unsigned long intervaloVerificacao = 200; // 200ms

// Timer para prints detalhados dos sensores
unsigned long ultimoPrintDetalhado = 0;
const unsigned long intervaloPrintDetalhado = 300; // 300ms

void setup() {
  Serial.begin(115200);
  
  // Configuração dos pinos
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  digitalWrite(LED_PIN, HIGH);
  digitalWrite(BUZZER_PIN, LOW);
  
  sistemaStartTime = millis();
  
  // Inicialização I2C e MPU6050 - ATUALIZADO para usar pinos padrão
  Wire.begin(); // Usando pinos padrão do ESP32 (SDA=21, SCL=22)
  
  if (!mpu.begin(0x68)) {
    Serial.println("❌ Falha ao conectar MPU6050!");
    while (1) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
  }
  
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_250_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  
  Serial.println("✅ MPU6050 inicializado!");
  
  // Conectar WiFi
  WiFi.begin(ssid, password);
  Serial.print("🔄 Conectando ao WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n✅ WiFi conectado!");
  Serial.print("📍 IP: ");
  Serial.println(WiFi.localIP());
  
  // Configurar NTP para obter data/hora real
  Serial.println("🕒 Sincronizando com servidor de tempo...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  // Aguardar sincronização
  time_t now = time(nullptr);
  int tentativas = 0;
  while (now < 8 * 3600 * 24 && tentativas < 15) { // Esperar até ter um tempo válido
    delay(1000);
    now = time(nullptr);
    tentativas++;
    Serial.print(".");
  }
  
  if (now > 8 * 3600 * 24) {
    Serial.println("\n✅ Sincronização de tempo concluída!");
    Serial.printf("📅 Data/Hora atual: %s", ctime(&now));
  } else {
    Serial.println("\n⚠️  Falha na sincronização de tempo, usando tempo relativo");
  }
  
  // Configurar mDNS para descoberta automática
  if (MDNS.begin("seizure-detector")) {
    Serial.println("✅ mDNS iniciado: seizure-detector.local");
    MDNS.addService("http", "tcp", 80);
  }
  
  // Configurar rotas da API
  setupWebServerRoutes();
  
  // Iniciar servidor web
  server.begin();
  Serial.println("🌐 Servidor Web iniciado!");
  Serial.printf("📡 API disponível em: http://%s/\n", WiFi.localIP().toString().c_str());
  Serial.printf("🔍 Ou acesse: http://seizure-detector.local/\n");
  
  // Sinal de inicialização completa
  for(int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
  
  Serial.println("🚀 Sistema de detecção ativo!");
  Serial.println("📱 App React Native pode descobrir este dispositivo automaticamente!");
  
  // Iniciar calibração do sistema
  Serial.println("\n🔄 Iniciando calibração do sensor...");
  Serial.println("⚠️  Mantenha o dispositivo PARADO por 3 segundos!");
  tempoCalibracaoInicio = millis();
  sistemaCalibrado = false;
  
  // Log de informações úteis
  Serial.println("\n=== INFORMAÇÕES DO DISPOSITIVO ===");
  Serial.printf("🏷️  Nome: SeizureDetector_001\n");
  Serial.printf("📍 IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("🌐 URL: http://%s/\n", WiFi.localIP().toString().c_str());
  Serial.printf("🔍 mDNS: http://seizure-detector.local/\n");
  Serial.printf("📡 Porta: %d\n", WEB_SERVER_PORT);
  Serial.println("===================================\n");
  
  delay(1000);
}

void loop() {
  server.handleClient(); // Processar requisições HTTP
  
  // Verificar se ainda está em calibração
  if (!sistemaCalibrado) {
    calibrarSensor();
    return; // Não executa outras funções durante calibração
  }
  
  // Timer manual para verificação de movimento
  if (millis() - ultimaVerificacao >= intervaloVerificacao) {
    ultimaVerificacao = millis();
    verificarMovimento();
  }
  
  // Timer para prints detalhados dos sensores
  if (millis() - ultimoPrintDetalhado >= intervaloPrintDetalhado) {
    ultimoPrintDetalhado = millis();
    printSensorDetalhado();
  }
  
  // Verificar conexão WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi desconectado, tentando reconectar...");
    WiFi.begin(ssid, password);
    delay(5000);
  }
  
  // Atualizar LED de status (pisca se sistema ativo)
  if (sistemaAtivo && !criseDetectada) {
    // Piscar LED lentamente quando sistema ativo
    if ((millis() / 2000) % 2 == 0) {
      digitalWrite(LED_PIN, HIGH);
    } else {
      digitalWrite(LED_PIN, LOW);
    }
  }
}

void setupWebServerRoutes() {
  // CORS headers para todas as rotas
  server.onNotFound([]() {
    addCORSHeaders();
    
    if (server.method() == HTTP_OPTIONS) {
      server.send(200);
      return;
    }
    
    StaticJsonDocument<200> doc;
    doc["error"] = "Endpoint não encontrado";
    doc["available_endpoints"] = "/, /status, /eventos, /controle, /descoberta, /ping";
    
    String response;
    serializeJson(doc, response);
    server.send(404, "application/json", response);
  });

  // GET /status - Status completo do dispositivo
  server.on("/status", HTTP_GET, []() {
    addCORSHeaders();
    
    StaticJsonDocument<600> doc;
    doc["device"] = "SeizureDetector_001";
    doc["nome"] = "Sistema de Detecção de Crises";
    doc["timestamp"] = obterTimestampUnix(); // Timestamp Unix real
    doc["data_hora"] = obterDataHoraAtual(); // Data/hora formatada
    doc["sistema_ativo"] = sistemaAtivo;
    doc["crise_detectada"] = criseDetectada;
    doc["ultima_aceleracao"] = ultimaAceleracao;
    doc["threshold"] = thresholdAceleracao;
    doc["sensibilidade"] = sensibilidade;
    doc["total_eventos"] = totalEventos;
    doc["uptime"] = millis() - sistemaStartTime; // Tempo de funcionamento em ms
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["ip"] = WiFi.localIP().toString();
    doc["memoria_livre"] = ESP.getFreeHeap();
    doc["ultima_atividade"] = ultimaAtividade > 0 ? ultimaAtividade : obterTimestampUnix(); // Timestamp Unix
    doc["versao"] = "2.1.0";
    doc["compilado_em"] = __DATE__ " " __TIME__;
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });

  // GET /eventos - Histórico de eventos
  server.on("/eventos", HTTP_GET, []() {
    addCORSHeaders();
    
    StaticJsonDocument<2000> doc;
    JsonArray eventos = doc.createNestedArray("eventos");
    
    // Adicionar eventos do histórico (do mais recente para o mais antigo)
    for (int i = 0; i < 20; i++) {
      int index = (indiceHistorico - 1 - i + 20) % 20;
      
      if (historicoEventos[index].timestamp > 0) {
        JsonObject evento = eventos.createNestedObject();
        evento["timestamp"] = historicoEventos[index].timestamp;
        evento["aceleracao"] = historicoEventos[index].aceleracao;
        evento["tipo"] = historicoEventos[index].tipo;
        evento["data_formatada"] = historicoEventos[index].data_formatada;
        evento["id"] = String(historicoEventos[index].timestamp) + "_" + String(index);
      }
    }
    
    doc["total"] = totalEventos;
    doc["historico_disponivel"] = totalEventosHistorico;
    doc["limite_historico"] = 20;
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });

  // POST /controle - Controlar o sistema
  server.on("/controle", HTTP_POST, []() {
    addCORSHeaders();
    
    if (server.hasArg("plain")) {
      StaticJsonDocument<300> doc;
      DeserializationError error = deserializeJson(doc, server.arg("plain"));
      
      if (error) {
        server.send(400, "application/json", "{\"success\":false,\"error\":\"JSON inválido\"}");
        return;
      }
      
      String acoes = "";
      
      if (doc.containsKey("sistema_ativo")) {
        bool novoStatus = doc["sistema_ativo"];
        sistemaAtivo = novoStatus;
        
        if (!sistemaAtivo) {
          criseDetectada = false;
          digitalWrite(BUZZER_PIN, LOW);
          digitalWrite(LED_PIN, LOW);
        }
        
        acoes += "Sistema " + String(sistemaAtivo ? "ATIVADO" : "DESATIVADO") + "; ";
        Serial.printf("🔄 Sistema %s via API\n", sistemaAtivo ? "ATIVADO" : "DESATIVADO");
        
        // Adicionar ao histórico
        adicionarAoHistorico(ultimaAceleracao, sistemaAtivo ? "sistema_ativado" : "sistema_desativado");
      }
      
      if (doc.containsKey("threshold")) {
        thresholdAceleracao = doc["threshold"];
        acoes += "Threshold alterado para " + String(thresholdAceleracao, 2) + "g; ";
        Serial.printf("🎛️ Threshold alterado para: %.2f g\n", thresholdAceleracao);
      }
      
      if (doc.containsKey("sensibilidade")) {
        sensibilidade = doc["sensibilidade"];
        acoes += "Sensibilidade alterada para " + String(sensibilidade) + "%; ";
        Serial.printf("🎛️ Sensibilidade alterada para: %d%%\n", sensibilidade);
      }
      
      if (doc.containsKey("reset_stats") && doc["reset_stats"]) {
        totalEventos = 0;
        totalEventosHistorico = 0;
        
        // Limpar histórico
        for (int i = 0; i < 20; i++) {
          historicoEventos[i].timestamp = 0;
          historicoEventos[i].aceleracao = 0;
          historicoEventos[i].tipo = "";
          historicoEventos[i].data_formatada = "";
        }
        indiceHistorico = 0;
        
        acoes += "Estatísticas resetadas; ";
        Serial.println("🔄 Estatísticas resetadas via API");
      }
      
      if (doc.containsKey("test_buzzer") && doc["test_buzzer"]) {
        // Teste com melodia diferenciada
        tone(BUZZER_PIN, 1000, 200);
        delay(250);
        tone(BUZZER_PIN, 1500, 200);
        delay(250);
        tone(BUZZER_PIN, 2000, 200);
        
        acoes += "Buzzer testado; ";
        Serial.println("🔊 Teste de buzzer via API");
        
        adicionarAoHistorico(ultimaAceleracao, "test_buzzer");
      }
      
      ultimaAtividade = obterTimestampUnix(); // Usar timestamp Unix real
      
      StaticJsonDocument<300> response;
      response["success"] = true;
      response["message"] = "Comandos executados";
      response["acoes"] = acoes;
      response["timestamp"] = obterTimestampUnix();
      response["data_hora"] = obterDataHoraAtual();
      
      String responseStr;
      serializeJson(response, responseStr);
      server.send(200, "application/json", responseStr);
      
    } else {
      server.send(400, "application/json", "{\"success\":false,\"error\":\"Dados JSON necessários\"}");
    }
  });

  // GET /descoberta - Para descoberta automática pelo app
  server.on("/descoberta", HTTP_GET, []() {
    addCORSHeaders();
    
    StaticJsonDocument<400> doc;
    doc["device"] = "SeizureDetector_001";
    doc["nome"] = "Sistema de Detecção de Crises";
    doc["ip"] = WiFi.localIP().toString();
    doc["porta"] = WEB_SERVER_PORT;
    doc["versao"] = "2.1.0";
    doc["online"] = true;
    doc["timestamp"] = obterTimestampUnix();
    doc["data_hora"] = obterDataHoraAtual();
    doc["uptime"] = millis() - sistemaStartTime;
    doc["sistema_ativo"] = sistemaAtivo;
    doc["total_eventos"] = totalEventos;
    doc["mdns"] = "seizure-detector.local";
    doc["wifi_rssi"] = WiFi.RSSI();
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });

  // GET /ping - Health check
  server.on("/ping", HTTP_GET, []() {
    addCORSHeaders();
    
    StaticJsonDocument<200> doc;
    doc["pong"] = true;
    doc["timestamp"] = obterTimestampUnix();
    doc["data_hora"] = obterDataHoraAtual();
    doc["uptime"] = millis() - sistemaStartTime;
    doc["memoria_livre"] = ESP.getFreeHeap();
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
  });

  // GET / - Página inicial com documentação
  server.on("/", HTTP_GET, []() {
    String html = "<!DOCTYPE html><html><head><meta charset='utf-8'>";
    html += "<title>🏥 Seizure Detector</title>";
    html += "<style>body{font-family:Arial,sans-serif;margin:40px;background:#f5f5f5;}";
    html += ".container{background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}";
    html += ".status{padding:10px;border-radius:5px;margin:10px 0;}";
    html += ".online{background:#d4edda;color:#155724;border:1px solid #c3e6cb;}";
    html += ".offline{background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;}";
    html += "h1{color:#333;margin-top:0;}h2{color:#666;}";
    html += ".endpoint{background:#f8f9fa;padding:10px;margin:5px 0;border-left:4px solid #007bff;border-radius:3px;}";
    html += ".stat{display:inline-block;margin:10px 15px 10px 0;padding:10px;background:#e9ecef;border-radius:5px;}";
    html += "</style></head><body><div class='container'>";
    
    html += "<h1>🏥 Sistema de Detecção de Crises Epiléticas</h1>";
    
    // Status atual
    html += "<div class='status " + String(sistemaAtivo ? "online" : "offline") + "'>";
    html += "📊 <strong>Status:</strong> " + String(sistemaAtivo ? "SISTEMA ATIVO" : "SISTEMA INATIVO");
    html += "</div>";
    
    // Estatísticas
    html += "<h2>📈 Estatísticas Atuais</h2>";
    html += "<div class='stat'>📊 <strong>Eventos:</strong> " + String(totalEventos) + "</div>";
    html += "<div class='stat'>📡 <strong>Aceleração:</strong> " + String(ultimaAceleracao, 2) + " g</div>";
    html += "<div class='stat'>📶 <strong>WiFi:</strong> " + String(WiFi.RSSI()) + " dBm</div>";
    html += "<div class='stat'>⏱️ <strong>Uptime:</strong> " + String((millis() - sistemaStartTime) / 60000) + " min</div>";
    html += "<div class='stat'>💾 <strong>RAM Livre:</strong> " + String(ESP.getFreeHeap()) + " bytes</div>";
    
    // Informações de rede
    html += "<h2>🌐 Informações de Rede</h2>";
    html += "<div class='stat'>📍 <strong>IP:</strong> " + WiFi.localIP().toString() + "</div>";
    html += "<div class='stat'>🔍 <strong>mDNS:</strong> seizure-detector.local</div>";
    html += "<div class='stat'>🚪 <strong>Porta:</strong> " + String(WEB_SERVER_PORT) + "</div>";
    
    // API Endpoints
    html += "<h2>📡 API Endpoints</h2>";
    html += "<div class='endpoint'><strong>GET /status</strong> - Status completo do dispositivo</div>";
    html += "<div class='endpoint'><strong>GET /eventos</strong> - Histórico de eventos</div>";
    html += "<div class='endpoint'><strong>POST /controle</strong> - Controlar o sistema</div>";
    html += "<div class='endpoint'><strong>GET /descoberta</strong> - Informações para descoberta automática</div>";
    html += "<div class='endpoint'><strong>GET /ping</strong> - Health check</div>";
    
    // Instruções
    html += "<h2>📱 Como Usar</h2>";
    html += "<p>1. <strong>App React Native:</strong> Use a função 'Descobrir Dispositivos' para encontrar este dispositivo automaticamente.</p>";
    html += "<p>2. <strong>Teste Manual:</strong> Acesse <code>http://" + WiFi.localIP().toString() + "/status</code> para ver o status em JSON.</p>";
    html += "<p>3. <strong>mDNS:</strong> Este dispositivo também pode ser acessado via <code>http://seizure-detector.local/</code></p>";
    
    html += "<h2>🔧 Configurações</h2>";
    html += "<div class='stat'>🎯 <strong>Threshold:</strong> " + String(thresholdAceleracao, 2) + " g</div>";
    html += "<div class='stat'>🎛️ <strong>Sensibilidade:</strong> " + String(sensibilidade) + "%</div>";
    
    html += "</div></body></html>";
    
    server.send(200, "text/html", html);
  });
}

void addCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

String formatarTimestamp(unsigned long timestamp) {
  unsigned long segundos = timestamp / 1000;
  unsigned long minutos = segundos / 60;
  unsigned long horas = minutos / 60;
  
  return String(horas % 24) + "h" + String(minutos % 60) + "m" + String(segundos % 60) + "s";
}

// Função para obter timestamp Unix real (segundos desde 1970)
unsigned long obterTimestampUnix() {
  time_t now;
  time(&now);
  return (unsigned long)now;
}

// Função para formatar data/hora real
String formatarDataHora(unsigned long timestampUnix) {
  if (timestampUnix < 8 * 3600 * 24) {
    // Se não temos tempo válido, usar tempo relativo
    return formatarTimestamp(millis());
  }
  
  time_t rawtime = (time_t)timestampUnix;
  struct tm * timeinfo;
  timeinfo = localtime(&rawtime);
  
  char buffer[20];
  strftime(buffer, sizeof(buffer), "%d/%m/%Y %H:%M:%S", timeinfo);
  return String(buffer);
}

// Função para formatar data/hora atual
String obterDataHoraAtual() {
  return formatarDataHora(obterTimestampUnix());
}

void adicionarAoHistorico(float aceleracao, String tipo) {
  unsigned long timestampUnix = obterTimestampUnix();
  
  historicoEventos[indiceHistorico].timestamp = timestampUnix;
  historicoEventos[indiceHistorico].aceleracao = aceleracao;
  historicoEventos[indiceHistorico].tipo = tipo;
  historicoEventos[indiceHistorico].data_formatada = formatarDataHora(timestampUnix);
  
  indiceHistorico = (indiceHistorico + 1) % 20; // Circular buffer
  totalEventosHistorico++;
}

void calibrarSensor() {
  unsigned long tempoDecorrido = millis() - tempoCalibracaoInicio;
  
  if (tempoDecorrido < tempoCalibracaoMs) {
    // Ainda em calibração
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    
    // Converter para "g" (dividindo por 9.8)
    float magnitude = sqrt(a.acceleration.x * a.acceleration.x + 
                          a.acceleration.y * a.acceleration.y + 
                          a.acceleration.z * a.acceleration.z) / 9.8;
    
    // Atualizar média da aceleração base
    if (aceleracaoBase == 0) {
      aceleracaoBase = magnitude;
    } else {
      aceleracaoBase = (aceleracaoBase + magnitude) / 2.0;
    }
    
    // Piscar LED durante calibração
    if ((millis() / 200) % 2 == 0) {
      digitalWrite(LED_PIN, HIGH);
    } else {
      digitalWrite(LED_PIN, LOW);
    }
    
    // Print de progresso
    if (tempoDecorrido % 500 < 50) { // A cada 500ms
      Serial.printf("🔄 Calibrando... %.1fs restantes (Base: %.2fg)\n", 
                    (tempoCalibracaoMs - tempoDecorrido) / 1000.0, aceleracaoBase);
    }
    
  } else {
    // Calibração concluída
    sistemaCalibrado = true;
    ultimaMagnitude = aceleracaoBase;
    
    Serial.printf("✅ Calibração concluída!\n");
    Serial.printf("📊 Aceleração base: %.2fg\n", aceleracaoBase);
    Serial.printf("🎯 Threshold para detecção: %.2fg\n", thresholdAceleracao);
    Serial.println("🚨 Sistema pronto para detectar crises!\n");
    
    // Sinal sonoro de calibração concluída
    for(int i = 0; i < 2; i++) {
      tone(BUZZER_PIN, 1500, 150);
      delay(200);
    }
    
    digitalWrite(LED_PIN, HIGH); // LED fixo após calibração
  }
}

void printSensorDetalhado() {
  if (!sistemaAtivo) return; // Só imprime se sistema ativo
  
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  
  // Print detalhado dos dados do sensor
  Serial.print("Acceleration X: ");
  Serial.print(a.acceleration.x, 2);
  Serial.print(", Y: ");
  Serial.print(a.acceleration.y, 2);
  Serial.print(", Z: ");
  Serial.print(a.acceleration.z, 2);
  Serial.print(" m/s^2");
  
  // Adicionar magnitude em "g"
  float magnitude = sqrt(a.acceleration.x * a.acceleration.x + 
                        a.acceleration.y * a.acceleration.y + 
                        a.acceleration.z * a.acceleration.z) / 9.8;
  Serial.print(" | Magnitude: ");
  Serial.print(magnitude, 2);
  Serial.println("g");

  Serial.print("Rotation X: ");
  Serial.print(g.gyro.x, 2);
  Serial.print(", Y: ");
  Serial.print(g.gyro.y, 2);
  Serial.print(", Z: ");
  Serial.print(g.gyro.z, 2);
  Serial.println(" rad/s");

  Serial.print("Temperature: ");
  Serial.print(temp.temperature, 2);
  Serial.println(" degC");
  
  Serial.println(""); // Linha em branco para melhor legibilidade
}

void verificarMovimento() {
  if (!sistemaAtivo || !sistemaCalibrado) return;
  
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  
  // Converter para "g" (dividindo por 9.8 - gravidade da Terra)
  float magnitude = sqrt(a.acceleration.x * a.acceleration.x + 
                        a.acceleration.y * a.acceleration.y + 
                        a.acceleration.z * a.acceleration.z) / 9.8;
  
  ultimaAceleracao = magnitude;
  
  // Calcular diferença em relação à aceleração base
  float diferencaBase = abs(magnitude - aceleracaoBase);
  
  // Calcular mudança brusca (diferença entre leituras consecutivas)
  float mudancaBrusca = abs(magnitude - ultimaMagnitude);
  
  // Ajustar threshold baseado na sensibilidade
  float thresholdAtual = thresholdAceleracao * (sensibilidade / 50.0);
  
  // Log resumido (apenas se não estiver em crise)
  if (!criseDetectada) {
    static int contadorLog = 0;
    if (contadorLog++ % 15 == 0) {
      Serial.printf("📊 Atual: %.2fg | Base: %.2fg | Diff: %.2fg | Mudança: %.2fg | Threshold: %.2fg\n", 
                    magnitude, aceleracaoBase, diferencaBase, mudancaBrusca, thresholdAtual);
    }
  }
  
  // Verificar se está dentro do intervalo de cooldown
  if (millis() - ultimaCrise < intervaloCrise) {
    ultimaMagnitude = magnitude;
    return;
  }
  
  // DETECÇÃO MELHORADA: Combina diferença da base + mudança brusca
  bool movimentoSuspeito = (diferencaBase > thresholdAtual) || (mudancaBrusca > (thresholdAtual * 0.8));
  
  if (movimentoSuspeito) {
    if (!criseDetectada) {
      Serial.printf("🚨 MOVIMENTO SUSPEITO DETECTADO!\n");
      Serial.printf("📈 Diferença da base: %.2fg | Mudança brusca: %.2fg\n", diferencaBase, mudancaBrusca);
      detectarCrise(magnitude);
    }
  } else {
    // Reset da detecção se movimento voltou ao normal
    if (criseDetectada && diferencaBase < (thresholdAtual * 0.5) && mudancaBrusca < (thresholdAtual * 0.3)) {
      criseDetectada = false;
      digitalWrite(BUZZER_PIN, LOW);
      
      adicionarAoHistorico(magnitude, "movimento_normalizado");
      Serial.println("✅ Movimento normalizado - Sistema resetado");
    }
  }
  
  // Atualizar a magnitude anterior
  ultimaMagnitude = magnitude;
}

void detectarCrise(float aceleracao) {
  criseDetectada = true;
  ultimaCrise = millis();
  totalEventos++;
  ultimaAtividade = obterTimestampUnix(); // Usar timestamp Unix real
  
  Serial.println("\n🚨🚨🚨 CRISE DETECTADA! 🚨🚨🚨");
  Serial.printf("📈 Aceleração: %.2f g\n", aceleracao);
  Serial.printf("⏰ Data/Hora: %s\n", obterDataHoraAtual().c_str());
  Serial.printf("📊 Total de eventos: %d\n", totalEventos);
  Serial.println("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨\n");
  
  // Adicionar ao histórico
  adicionarAoHistorico(aceleracao, "crise_detectada");
  
  // Ativar buzzer com padrão de emergência
  for (int i = 0; i < 3; i++) {
    tone(BUZZER_PIN, 2000, 300);
    delay(350);
    tone(BUZZER_PIN, 2500, 300);
    delay(350);
  }
  
  // Piscar LED rapidamente
  for(int i = 0; i < 10; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(50);
    digitalWrite(LED_PIN, HIGH);
    delay(50);
  }
  
  // 🎯 AQUI PODEMOS ADICIONAR:
  // - Envio de SMS via API externa
  // - Email de emergência
  // - Webhook para outros serviços
  // - Notificação para familiares
  // - Integração com sistema de emergência
  
  Serial.println("📱 Dados disponíveis via API para React Native");
}