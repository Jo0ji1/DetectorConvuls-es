// src/app/(protected)/cloud-connection.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Button, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CloudMqtt, CloudStatus, CloudEvent } from "@/services/cloud/mqttClient.tsx";
import { CLOUD_DEFAULTS } from "@/config/cloud.ts"; // troque para cloud.ts se quiser pegar credenciais reais

type CloudCfg = {
  WSS_URL: string; DEVICE_ID: string; USER: string; PASS: string;
};

export default function CloudConnectionScreen() {
  const [cfg, setCfg] = useState<CloudCfg>(CLOUD_DEFAULTS as CloudCfg);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const mqttRef = useRef<CloudMqtt | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await AsyncStorage.getItem("cloudCfg");
      if (s) setCfg(JSON.parse(s));
    })();
  }, []);

  const saveCfg = async () => {
    await AsyncStorage.setItem("cloudCfg", JSON.stringify(cfg));
  };

  const connect = async () => {
    setErr(null);
    const m = new CloudMqtt(cfg.WSS_URL, cfg.USER, cfg.PASS, cfg.DEVICE_ID);
    mqttRef.current = m;
    m.connect({
      onConnChange: (ok) => setConnected(ok),
      onStatus: (st) => setStatus(st),
      onEvent: (ev) => setEvents((prev) => [ev, ...prev].slice(0, 100)),
      onError: (e) => setErr(e.message),
    });
  };

  const disconnect = () => {
    mqttRef.current?.disconnect();
    setConnected(false);
  };

  const send = (cmd: object) => {
    try { mqttRef.current?.sendControl(cmd); } catch (e: any) { setErr(e.message); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontWeight: "bold", fontSize: 18 }}>Conexão Cloud (HiveMQ)</Text>

      <Text>WSS URL</Text>
      <TextInput value={cfg.WSS_URL} onChangeText={(v)=>setCfg({...cfg, WSS_URL:v})}
        placeholder="wss://<host>:8884/mqtt" style={{ borderWidth:1, padding:8, borderRadius:8 }} />
      <Text>Device ID</Text>
      <TextInput value={cfg.DEVICE_ID} onChangeText={(v)=>setCfg({...cfg, DEVICE_ID:v})}
        placeholder="esp32-ABC123" style={{ borderWidth:1, padding:8, borderRadius:8 }} />
      <Text>User</Text>
      <TextInput value={cfg.USER} onChangeText={(v)=>setCfg({...cfg, USER:v})}
        placeholder="app-client" style={{ borderWidth:1, padding:8, borderRadius:8 }} />
      <Text>Password</Text>
      <TextInput value={cfg.PASS} onChangeText={(v)=>setCfg({...cfg, PASS:v})}
        placeholder="******" secureTextEntry style={{ borderWidth:1, padding:8, borderRadius:8 }} />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="Salvar" onPress={saveCfg} />
        {!connected ? <Button title="Conectar" onPress={connect} /> : <Button title="Desconectar" onPress={disconnect} />}
      </View>

      {err && <Text style={{ color: "red" }}>Erro: {err}</Text>}
      <Text style={{ marginTop: 12, fontWeight: "bold" }}>Status</Text>
      <Text>{connected ? "Conectado ✅" : "Desconectado ❌"}</Text>
      <Text>{status ? JSON.stringify(status, null, 2) : "Sem dados"}</Text>

      <Text style={{ marginTop: 12, fontWeight: "bold" }}>Comandos</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button title="Ativar" onPress={()=>send({ setActive: true })} />
        <Button title="Desativar" onPress={()=>send({ setActive: false })} />
        <Button title="Threshold +0.1" onPress={()=>send({ setThreshold: (status?.threshold||1)+0.1 })} />
        <Button title="Sens +5" onPress={()=>send({ setSensitivity: Math.min(100,(status?.sens||80)+5) })} />
        <Button title="Reset Stats" onPress={()=>send({ resetStats: true })} />
        <Button title="Test Buzzer" onPress={()=>send({ testBuzzer: true })} />
      </View>

      <Text style={{ marginTop: 12, fontWeight: "bold" }}>Últimos Eventos</Text>
      {events.length === 0 ? <Text>Sem eventos</Text> : events.map((e, i) => (
        <Text key={i} selectable>{new Date(e.t*1000).toLocaleString()} — {e.type} — sev {e.severity}</Text>
      ))}
    </ScrollView>
  );
}
