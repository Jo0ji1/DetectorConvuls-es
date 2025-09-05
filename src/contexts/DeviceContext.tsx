// src/contexts/DeviceContext.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  discoverDevices, setManualIp, setBaseUrlFromHost, setBaseUrlFromIp,
  getStatus as getLocalStatus, getEvents as getLocalEvents, postControl as postLocalControl
} from "@/services/esp32Service";
import { CloudMqtt, CloudStatus, CloudEvent } from "@/services/cloud/mqttClient";
import { CLOUD_DEFAULTS } from "@/config/cloud";

type ConnectionMode = "local" | "cloud";

type Status = any; // unificado (Local ou Cloud)
type EventItem = { t: number; type: string; severity?: number; ax?: number; ay?: number; az?: number };

type CloudCfg = { WSS_URL: string; DEVICE_ID: string; USER: string; PASS: string; };

type Ctx = {
  mode: ConnectionMode;
  setMode: (m: ConnectionMode) => Promise<void>;
  manualIp: string | null;
  setManualIpValue: (ip: string | null) => Promise<void>;
  cloudCfg: CloudCfg;
  saveCloudCfg: (cfg: CloudCfg) => Promise<void>;

  isScanning: boolean;
  isConnected: boolean;
  status: Status | null;
  events: EventItem[];

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendControl: (cmd: object) => Promise<void>;
};

const DeviceCtx = createContext<Ctx>(null as any);
export const useDevice = () => useContext(DeviceCtx);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ConnectionMode>("local");
  const [manualIpValue, setManualIpState] = useState<string | null>(null);
  const [cloudCfg, setCloudCfg] = useState<CloudCfg>(CLOUD_DEFAULTS as CloudCfg);

  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);

  // Local polling
  const pollTimer = useRef<any>(null);
  // Cloud client
  const cloudRef = useRef<CloudMqtt | null>(null);

  // bootstrap
  useEffect(() => {
    (async () => {
      const m = await AsyncStorage.getItem("connMode");
      if (m === "cloud" || m === "local") setModeState(m);
      const ip = await AsyncStorage.getItem("manualIp");
      if (ip) { setManualIpState(ip); setManualIp(ip); }
      const s = await AsyncStorage.getItem("cloudCfg");
      if (s) setCloudCfg(JSON.parse(s));
    })();
  }, []);

  // helpers persistentes
  const setMode = async (m: ConnectionMode) => {
    setModeState(m);
    await AsyncStorage.setItem("connMode", m);
  };

  const setManualIpValue = async (ip: string | null) => {
    setManualIpState(ip);
    setManualIp(ip);
    if (ip) await AsyncStorage.setItem("manualIp", ip);
    else await AsyncStorage.removeItem("manualIp");
  };

  const saveCloudCfg = async (cfg: CloudCfg) => {
    setCloudCfg(cfg);
    await AsyncStorage.setItem("cloudCfg", JSON.stringify(cfg));
  };

  // ===== Local path =====
  const connectLocal = async () => {
    setIsScanning(true);
    try {
      const list = await discoverDevices();
      if (list.length === 0) throw new Error("Nenhum dispositivo encontrado");
      const d = list[0]; // simples: pega o primeiro
      if (d.host.endsWith(".local")) setBaseUrlFromHost(d.host);
      else setBaseUrlFromIp(d.ip);
      setIsConnected(true);

      // inicia polling
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = setInterval(async () => {
        try {
          const st = await getLocalStatus();
          setStatus(st as any);
          const ev = await getLocalEvents();
          if (Array.isArray(ev)) {
            // ordena desc por t, limita 200
            const ordered = [...ev].sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 200);
            setEvents(ordered as any);
          }
        } catch {}
      }, 2000);
    } finally {
      setIsScanning(false);
    }
  };

  const disconnectLocal = async () => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
    setIsConnected(false);
  };

  // ===== Cloud path =====
  const connectCloud = async () => {
    if (cloudRef.current) cloudRef.current.disconnect();
    const c = new CloudMqtt(cloudCfg.WSS_URL, cloudCfg.USER, cloudCfg.PASS, cloudCfg.DEVICE_ID);
    cloudRef.current = c;
    c.connect({
      onConnChange: (ok) => setIsConnected(ok),
      onStatus: (st) => setStatus(st as any),
      onEvent: (ev: CloudEvent) => {
        setEvents(prev => [{ ...ev }, ...prev].slice(0, 200));
      },
      onError: () => {}
    });
  };

  const disconnectCloud = async () => {
    cloudRef.current?.disconnect();
    cloudRef.current = null;
    setIsConnected(false);
  };

  // ===== API unificada =====
  const connect = async () => {
    if (mode === "cloud") return connectCloud();
    return connectLocal();
  };

  const disconnect = async () => {
    if (mode === "cloud") return disconnectCloud();
    return disconnectLocal();
  };

  const sendControl = async (cmd: object) => {
    if (mode === "cloud") {
      cloudRef.current?.sendControl(cmd);
      return;
    }
    await postLocalControl(cmd);
  };

  const value: Ctx = {
    mode, setMode,
    manualIp: manualIpValue, setManualIpValue,
    cloudCfg, saveCloudCfg,
    isScanning, isConnected, status, events,
    connect, disconnect, sendControl
  };

  return <DeviceCtx.Provider value={value}>{children}</DeviceCtx.Provider>;
}
