// src/config/cloud.example.ts
// Copie este arquivo para src/config/cloud.ts e preencha os valores reais.
// NUNCA commitar cloud.ts (estará no .gitignore mais abaixo).
export const CLOUD_DEFAULTS = {
  // WSS do seu cluster HiveMQ Cloud: wss://<host>:8884/mqtt
  WSS_URL: "wss://SEU_HOST_HIVEMQ:8884/mqtt",
  DEVICE_ID: "esp32-ABC123",
  USER: "app-client",
  PASS: "SUA_SENHA_AQUI"
};
