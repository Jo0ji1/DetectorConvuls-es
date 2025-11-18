import React, { useEffect, useState } from "react";
import { View, Text, Button, ScrollView } from "react-native";
import mqtt from "mqtt/dist/mqtt";

export default function App() {
  const [client, setClient] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("Aguardando conexão...");

  // CONFIGURAÇÕES - ALTERE PARA SUA INSTÂNCIA HIVE MQ CLOUD
  const MQTT_HOST = "wss://9a41abb938cd484e9dc8b865088f234b.s1.eu.hivemq.cloud:8884/mqtt";
  const MQTT_USER = "device-esp32-ABC123";
  const MQTT_PASS = "Esp32224180";
  const DEVICE_ID = "esp32-ABC123"; // mesmo que usado no ESP32

  const TOPIC_EVENTS = `devices/${DEVICE_ID}/events`;

  function connectMQTT() {
    setStatusMessage("Conectando ao broker...");

    const c = mqtt.connect(MQTT_HOST, {
      username: MQTT_USER,
      password: MQTT_PASS,
      reconnectPeriod: 2000,
    });

    c.on("connect", () => {
      setConnected(true);
      setStatusMessage("Conectado ao MQTT!");
      c.subscribe(TOPIC_EVENTS);
    });

    c.on("message", (topic, msg) => {
      const text = msg.toString();
      setEvents(prev => [`${new Date().toLocaleTimeString()} — ${text}`, ...prev]);
    });

    c.on("error", (err) => {
      setStatusMessage("Erro na conexão MQTT: " + err.message);
    });

    c.on("close", () => {
      setConnected(false);
      setStatusMessage("Desconectado do broker.");
    });

    setClient(c);
  }

  function disconnectMQTT() {
    if (client) {
      client.end();
      setStatusMessage("Conexão encerrada.");
      setConnected(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0f172a", padding: 20 }}>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "600", marginBottom: 10 }}>
        Seizure Detector · App Provisório
      </Text>

      <Text style={{ color: "#94a3b8", marginBottom: 20 }}>{statusMessage}</Text>

      {!connected ? (
        <Button title="Conectar ao MQTT" onPress={connectMQTT} color="#10b981" />
      ) : (
        <Button title="Desconectar" onPress={disconnectMQTT} color="#ef4444" />
      )}

      <Text
        style={{
          color: "#e2e8f0",
          marginTop: 30,
          fontSize: 18,
          fontWeight: "600",
        }}
      >
        Eventos recebidos:
      </Text>

      <ScrollView style={{ marginTop: 10, flex: 1 }}>
        {events.length === 0 && (
          <Text style={{ color: "#64748b" }}>Nenhum evento recebido ainda.</Text>
        )}

        {events.map((e, i) => (
          <Text key={i} style={{ color: "#f1f5f9", marginBottom: 6 }}>
            {e}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
