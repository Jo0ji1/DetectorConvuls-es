// src/services/esp32Service.ts
// Serviço para o Modo Local: descoberta por mDNS/IP e chamadas HTTP ao ESP32.

export type LocalDevice = { host: string; ip: string; name: string };
export type LocalStatus = {
  online: boolean;
  active: boolean;
  threshold: number;
  sens: number;
  uptime?: number;
  fw?: string;
};
export type LocalEvent = { t: number; type: string; severity?: number; ax?: number; ay?: number; az?: number };

const DEFAULT_TIMEOUT = 2500;

// Ajuste os ranges conforme sua rede (adicione ou remova prefixos)
const COMMON_IPS = ['192.168.1.', '192.168.0.', '192.168.15.', '10.0.0.', '172.16.0.'];

let BASE_URL: string | null = null;
let MANUAL_IP: string | null = null;

export function setManualIp(ip: string | null) { MANUAL_IP = ip; }
export function setBaseUrlFromIp(ip: string) { BASE_URL = `http://${ip}`; }
export function setBaseUrlFromHost(host: string) { BASE_URL = `http://${host}`; }
export function getBaseUrl() { return BASE_URL; }

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function tryDiscoverAt(hostOrIp: string): Promise<LocalDevice | null> {
  try {
    const url = `http://${hostOrIp}/descoberta`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    const ip = data?.ip || hostOrIp;
    const name = data?.name || "seizure-detector";
    return { host: hostOrIp, ip, name };
  } catch {
    return null;
  }
}

export async function discoverDevices(): Promise<LocalDevice[]> {
  const found: LocalDevice[] = [];

  // 1) mDNS
  const mdns = await tryDiscoverAt("seizure-detector.local");
  if (mdns) { found.push(mdns); return found; }

  // 2) IP manual
  if (MANUAL_IP) {
    const manual = await tryDiscoverAt(MANUAL_IP);
    if (manual) { found.push(manual); return found; }
  }

  // 3) Varredura básica (rápida: testa blocos 1..254 em saltos)
  const promises: Promise<void>[] = [];
  for (const pref of COMMON_IPS) {
    for (let i = 2; i < 255; i += 4) { // salto de 4 para acelerar
      const ip = `${pref}${i}`;
      promises.push((async () => {
        const d = await tryDiscoverAt(ip);
        if (d) found.push(d);
      })());
    }
  }
  await Promise.allSettled(promises);
  // remove duplicatas (mesmo ip)
  const uniq = new Map(found.map(d => [d.ip, d]));
  return Array.from(uniq.values());
}

function ensureBaseUrl() {
  if (!BASE_URL) throw new Error("Device not connected (BASE_URL undefined)");
}

export async function getStatus(): Promise<LocalStatus> {
  ensureBaseUrl();
  const res = await fetchWithTimeout(`${BASE_URL}/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getEvents(): Promise<LocalEvent[]> {
  ensureBaseUrl();
  const res = await fetchWithTimeout(`${BASE_URL}/eventos`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function postControl(body: object): Promise<boolean> {
  ensureBaseUrl();
  const res = await fetchWithTimeout(`${BASE_URL}/controle`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.ok;
}
