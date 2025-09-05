// src/services/cloud/mqttClient.ts
import { Client, Message } from "paho-mqtt";

export type CloudStatus = {
  online: boolean;
  uptime?: number;
  rssi?: number;
  active: boolean;
  threshold: number;
  sens: number;
  fw: string;
};

export type CloudEvent = {
  t: number;
  type: "seizure";
  severity: number;
  ax?: number; ay?: number; az?: number;
};

export type ConnHandlers = {
  onStatus?: (s: CloudStatus) => void;
  onEvent?: (e: CloudEvent) => void;
  onConnChange?: (ok: boolean) => void;
  onError?: (err: Error) => void;
};

export class CloudMqtt {
  private client: Client | null = null;
  private reconnectTimer: any = null;
  private connected = false;

  constructor(
    private hostWssUrl: string,
    private user: string,
    private pass: string,
    private deviceId: string
  ) {}

  connect(h: ConnHandlers = {}) {
    const { onStatus, onEvent, onConnChange, onError } = h;
    const cid = "app-" + Math.random().toString(16).slice(2);

    const doConnect = () => {
      this.client = new Client(this.hostWssUrl, cid);

      this.client.onConnectionLost = () => {
        this.connected = false;
        onConnChange?.(false);
        this.scheduleReconnect(h);
      };

      this.client.onMessageArrived = (msg) => {
        try {
          const topic = msg.destinationName || "";
          const payload = JSON.parse(msg.payloadString || "{}");
          if (topic.endsWith("/status")) onStatus?.(payload as any);
          else if (topic.endsWith("/events")) onEvent?.(payload as any);
        } catch (e: any) {
          onError?.(e);
        }
      };

      this.client.connect({
        userName: this.user,
        password: this.pass,
        useSSL: true,
        onSuccess: () => {
          this.connected = true;
          onConnChange?.(true);
          this.client?.subscribe(`devices/${this.deviceId}/status`, { qos: 1 });
          this.client?.subscribe(`devices/${this.deviceId}/events`, { qos: 1 });
        },
        onFailure: (res) => {
          this.connected = false;
          onConnChange?.(false);
          onError?.(new Error(res.errorMessage || "MQTT connect failed"));
          this.scheduleReconnect(h);
        },
        keepAliveInterval: 30,
        reconnect: false
      });
    };

    doConnect();
  }

  private scheduleReconnect(h: ConnHandlers) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(h);
    }, 3000);
  }

  isConnected() {
    return this.connected && this.client?.isConnected();
  }

  sendControl(cmd: object) {
    if (!this.isConnected()) throw new Error("MQTT disconnected");
    const m = new Message(JSON.stringify(cmd));
    m.destinationName = `devices/${this.deviceId}/control`;
    m.qos = 1;
    this.client!.send(m);
  }

  disconnect() {
    try { this.client?.disconnect(); } catch {}
    this.connected = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }
}
