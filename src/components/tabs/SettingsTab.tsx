// src/components/tabs/SettingsTab.tsx
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, ScrollView } from "react-native";
import { useDevice } from "@/contexts/DeviceContext";

export default function SettingsTab() {
  const {
    mode, setMode,
    manualIp, setManualIpValue,
    cloudCfg, saveCloudCfg,
    isConnected, connect, disconnect, sendControl, status
  } = useDevice();

  const [ip, setIp] = useState(manualIp || "");
  const [cfg, setCfg] = useState(cloudCfg);

  useEffect(() => { setIp(manualIp || ""); }, [manualIp]);
  useEffect(() => { setCfg(cloudCfg); }, [cloudCfg]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontWeight: "bold", fontSize: 18 }}>Configurações</Text>

      <Text style={{ marginTop: 8 }}>Modo de Conexão</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title={`Local ${mode==='local'?'✓':''}`} onPress={()=>setMode('local')} />
        <Button title={`Cloud ${mode==='cloud'?'✓':''}`} onPress={()=>setMode('cloud')} />
      </View>

      {mode === 'local' && (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Text style={{ fontWeight: "bold" }}>Conexão Local (HTTP)</Text>
          <Text>IP manual (opcional)</Text>
          <TextInput
            placeholder="ex: 192.168.1.50"
            value={ip}
            onChangeText={setIp}
            autoCapitalize="none"
            style={{ borderWidth:1, padding:8, borderRadius:8 }}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="Salvar IP" onPress={()=>setManualIpValue(ip || null)} />
            {!isConnected ? <Button title="Conectar" onPress={connect} /> : <Button title="Desconectar" onPress={disconnect} />}
          </View>
          <Text style={{ marginTop: 8, fontWeight: "bold" }}>Status</Text>
          <Text selectable>{status ? JSON.stringify(status, null, 2) : "Sem dados"}</Text>
        </View>
      )}

      {mode === 'cloud' && (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Text style={{ fontWeight: "bold" }}>Conexão Cloud (HiveMQ)</Text>
          <Text>WSS URL</Text>
          <TextInput
            placeholder="wss://<host>:8884/mqtt"
            value={cfg.WSS_URL}
            onChangeText={(v)=>setCfg({...cfg, WSS_URL:v})}
            autoCapitalize="none"
            style={{ borderWidth:1, padding:8, borderRadius:8 }}
          />
          <Text>Device ID</Text>
          <TextInput
            placeholder="esp32-ABC123"
            value={cfg.DEVICE_ID}
            onChangeText={(v)=>setCfg({...cfg, DEVICE_ID:v})}
            autoCapitalize="none"
            style={{ borderWidth:1, padding:8, borderRadius:8 }}
          />
          <Text>User</Text>
          <TextInput
            placeholder="app-client"
            value={cfg.USER}
            onChangeText={(v)=>setCfg({...cfg, USER:v})}
            autoCapitalize="none"
            style={{ borderWidth:1, padding:8, borderRadius:8 }}
          />
          <Text>Password</Text>
          <TextInput
            placeholder="******"
            value={cfg.PASS}
            onChangeText={(v)=>setCfg({...cfg, PASS:v})}
            secureTextEntry
            autoCapitalize="none"
            style={{ borderWidth:1, padding:8, borderRadius:8 }}
          />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="Salvar" onPress={()=>saveCloudCfg(cfg)} />
            {!isConnected ? <Button title="Conectar" onPress={connect} /> : <Button title="Desconectar" onPress={disconnect} />}
          </View>

          <Text style={{ marginTop: 8, fontWeight: "bold" }}>Status</Text>
          <Text selectable>{status ? JSON.stringify(status, null, 2) : "Sem dados"}</Text>

          <Text style={{ marginTop: 8, fontWeight: "bold" }}>Comandos rápidos</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Button title="Ativar" onPress={()=>sendControl({ setActive: true })} />
            <Button title="Desativar" onPress={()=>sendControl({ setActive: false })} />
            <Button title="Threshold +0.1" onPress={()=>sendControl({ setThreshold: (status?.threshold||1)+0.1 })} />
            <Button title="Sens +5" onPress={()=>sendControl({ setSensitivity: Math.min(100,(status?.sens||80)+5) })} />
            <Button title="Reset Stats" onPress={()=>sendControl({ resetStats: true })} />
            <Button title="Test Buzzer" onPress={()=>sendControl({ testBuzzer: true })} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}
