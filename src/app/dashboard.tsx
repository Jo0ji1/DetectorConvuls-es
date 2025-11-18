// src/app/dashboard.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Activity, Clock3, Settings2 } from "lucide-react-native";

import { useDevice } from "../contexts/DeviceContext";
import { HomeTab } from "../components/tabs/HomeTab";
import { HistoryTab } from "../components/tabs/HistoryTab";
import { SettingsTab } from "../components/tabs/SettingsTab";
import { BrainWaveAnimation } from "../components/ui/BrainWaveAnimation";

type DashboardTab = "home" | "history" | "settings";

function TabButton(props: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onPress: () => void;
}) {
  const { label, icon, isActive, onPress } = props;

  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center rounded-full px-3 py-2 border
      ${
        isActive
          ? "bg-emerald-500/10 border-emerald-400"
          : "bg-slate-900 border-slate-700"
      }`}
    >
      <View className="mr-1">{icon}</View>
      <Text
        className={`text-xs font-medium ${
          isActive ? "text-emerald-300" : "text-slate-300"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");

  const { mode, isConnected, status, events, disconnect } = useDevice();

  const connectionLabel = useMemo(() => {
    if (!isConnected) return "Desconectado";
    if (mode === "cloud") return "Conectado (Nuvem)";
    if (mode === "local") return "Conectado (LAN)";
    return "Conectado";
  }, [isConnected, mode]);

  const connectionColor = useMemo(() => {
    if (!isConnected) return "text-rose-400";
    if (mode === "cloud") return "text-sky-300";
    if (mode === "local") return "text-emerald-300";
    return "text-emerald-300";
  }, [isConnected, mode]);

  const lastEvent = events[0];

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* HEADER */}
      <View className="px-4 pt-2 pb-4 border-b border-slate-800">
        <Text className="text-xs font-medium text-slate-400 mb-1">
          Seizure Detector · Protótipo
        </Text>

        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-slate-50">
              Monitoramento em tempo real
            </Text>
            <Text className={`text-xs mt-1 ${connectionColor}`}>
              {connectionLabel}
            </Text>

            {status?.lastHeartbeat && (
              <Text className="text-[11px] text-slate-400 mt-1">
                Último sinal: {status.lastHeartbeat}
              </Text>
            )}

            {lastEvent && (
              <Text className="text-[11px] text-slate-400 mt-1">
                Último evento:{" "}
                <Text className="font-semibold text-slate-200">
                  {lastEvent.type === "seizure" ? "Crise detectada" : "Info"}
                </Text>{" "}
                · {lastEvent.whenFormatted ?? lastEvent.timestamp}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* HEADER VISUAL / BRAIN WAVE */}
      <View className="px-4 mt-3">
        <View className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex-row items-center">
          <View className="flex-1 mr-4">
            <Text className="text-xs text-slate-400 mb-1">
              Estado do detector
            </Text>
            <Text className="text-sm font-medium text-slate-50 mb-2">
              {status?.isDetecting
                ? "Algoritmo em execução e analisando movimentos."
                : "Detector em espera. Ative a detecção para iniciar o monitoramento."}
            </Text>

            <View className="flex-row flex-wrap gap-x-3 gap-y-1 mt-1">
              {status?.firmware && (
                <Text className="text-[11px] text-slate-400">
                  FW: <Text className="text-slate-200">{status.firmware}</Text>
                </Text>
              )}
              {status?.deviceId && (
                <Text className="text-[11px] text-slate-400">
                  ID:{" "}
                  <Text className="text-slate-200" numberOfLines={1}>
                    {status.deviceId}
                  </Text>
                </Text>
              )}
            </View>
          </View>

          <BrainWaveAnimation isActive={!!status?.isDetecting} size={72} />
        </View>
      </View>

      {/* TABS */}
      <View className="px-4 mt-4">
        <View className="flex-row gap-2 bg-slate-900/60 rounded-full p-1 border border-slate-800">
          <TabButton
            label="Monitoramento"
            isActive={activeTab === "home"}
            onPress={() => setActiveTab("home")}
            icon={<Activity size={14} color="#4ade80" />}
          />
          <TabButton
            label="Histórico"
            isActive={activeTab === "history"}
            onPress={() => setActiveTab("history")}
            icon={<Clock3 size={14} color="#a5b4fc" />}
          />
          <TabButton
            label="Configurações"
            isActive={activeTab === "settings"}
            onPress={() => setActiveTab("settings")}
            icon={<Settings2 size={14} color="#e5e7eb" />}
          />
        </View>
      </View>

      {/* CONTEÚDO DAS ABAS */}
      <ScrollView
        className="flex-1 mt-3"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View className="px-4 pb-4">
          {activeTab === "home" && <HomeTab onDisconnect={disconnect} />}

          {activeTab === "history" && <HistoryTab />}

          {activeTab === "settings" && <SettingsTab />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
