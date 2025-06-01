import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Vibration, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '../../contexts/DeviceContext';
import { mockPatient, mockSeizureEvents, mockHomeData } from '../../data/mockData';
import { BrainWaveAnimation } from '../ui/BrainWaveAnimation';

interface HomeTabProps {
    onLogout: () => void;
}

export default function HomeTab({ onLogout }: HomeTabProps) {
    const { device } = useDevice();
    const [isSimulating, setIsSimulating] = useState(false);

    const getLastSeizure = () => {
        if (mockSeizureEvents.length === 0) return null;
        return mockSeizureEvents[0];
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'low':
                return '#10b981';
            case 'medium':
                return '#f59e0b';
            case 'high':
                return '#ef4444';
            default:
                return '#6b7280';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return '#10b981';
            case 'inactive':
                return '#6b7280';
            case 'connecting':
                return '#f59e0b';
            default:
                return '#6b7280';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active':
                return 'Ativo';
            case 'inactive':
                return 'Inativo';
            case 'connecting':
                return 'Conectando';
            case 'connected':
                return 'Conectado';
            default:
                return 'Desconhecido';
        }
    };

    const handleSeizureSimulation = () => {
        if (isSimulating) {
            // Parar simulação
            setIsSimulating(false);
            Vibration.cancel();
            Alert.alert('Simulação Finalizada', 'A simulação de crise foi interrompida.');
        } else {
            // Iniciar simulação
            setIsSimulating(true);
            Alert.alert(
                'Simulação Iniciada',
                'O dispositivo iniciará a simulação de uma crise. O celular vibrará para simular a detecção.',
                [{ text: 'OK' }],
            );

            // Vibração contínua para simular detecção
            const vibrationPattern = [500, 1000];
            Vibration.vibrate(vibrationPattern, true);
        }
    };

    const formatOperationTime = (hours: number) => {
        if (hours < 24) {
            return `${hours.toFixed(1)}h`;
        }
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours.toFixed(0)}h`;
    };

    const getBatteryIcon = (level: number) => {
        if (level > 75) return 'battery-full';
        if (level > 50) return 'battery-half';
        if (level > 25) return 'battery-low';
        return 'battery-dead';
    };

    const lastSeizure = getLastSeizure();

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-blue-600 pt-12 pb-6 px-6">
                <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-1">
                        <Text className="text-white text-xl font-bold">Olá, {mockPatient.name}!</Text>
                        <Text className="text-white/80 text-sm">{device.name}</Text>
                    </View>
                    <TouchableOpacity onPress={onLogout} className="p-2 rounded-full bg-white/20">
                        <Ionicons name="power" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Status do Dispositivo */}
                <View className="bg-white/10 rounded-xl p-4 backdrop-blur">
                    <Text className="text-white font-semibold mb-3">Status do Dispositivo</Text>
                    <View className="flex-row justify-between items-center">
                        <View className="flex-1 items-center">
                            <View
                                className="w-8 h-8 rounded-full items-center justify-center mb-1"
                                style={{ backgroundColor: getStatusColor(device.status) }}
                            >
                                <Ionicons name="pulse" size={16} color="white" />
                            </View>
                            <Text className="text-white/80 text-xs">Status</Text>
                            <Text className="text-white font-medium text-xs">{getStatusText(device.status)}</Text>
                        </View>

                        <View className="flex-1 items-center">
                            <View className="w-8 h-8 rounded-full bg-blue-400 items-center justify-center mb-1">
                                <Ionicons name={getBatteryIcon(device.batteryLevel)} size={16} color="white" />
                            </View>
                            <Text className="text-white/80 text-xs">Bateria</Text>
                            <Text className="text-white font-medium text-xs">{device.batteryLevel}%</Text>
                        </View>

                        <View className="flex-1 items-center">
                            <View className="w-8 h-8 rounded-full bg-green-400 items-center justify-center mb-1">
                                <Ionicons name="wifi" size={16} color="white" />
                            </View>
                            <Text className="text-white/80 text-xs">Sinal</Text>
                            <Text className="text-white font-medium text-xs">{device.signalStrength}%</Text>
                        </View>

                        <View className="flex-1 items-center">
                            <View className="w-8 h-8 rounded-full bg-purple-400 items-center justify-center mb-1">
                                <Ionicons name="time" size={16} color="white" />
                            </View>
                            <Text className="text-white/80 text-xs">Operação</Text>
                            <Text className="text-white font-medium text-xs">
                                {formatOperationTime(device.operationTime)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <View className="px-6 py-6">
                {/* Última Crise Detectada */}
                {lastSeizure ? (
                    <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-800">Última Crise Detectada</Text>
                            <View
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getSeverityColor(lastSeizure.severity) }}
                            />
                        </View>

                        <View className="space-y-3">
                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-500">Data/Hora:</Text>
                                <Text className="text-gray-800 font-medium">
                                    {new Date(lastSeizure.timestamp).toLocaleString('pt-BR')}
                                </Text>
                            </View>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-500">Duração:</Text>
                                <Text className="text-gray-800 font-medium">{lastSeizure.duration}s</Text>
                            </View>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-500">Severidade:</Text>
                                <View
                                    className="px-3 py-1 rounded-full"
                                    style={{ backgroundColor: `${getSeverityColor(lastSeizure.severity)}20` }}
                                >
                                    <Text
                                        className="font-medium capitalize"
                                        style={{ color: getSeverityColor(lastSeizure.severity) }}
                                    >
                                        {lastSeizure.severity === 'low'
                                            ? 'Baixa'
                                            : lastSeizure.severity === 'medium'
                                            ? 'Média'
                                            : 'Alta'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                        <View className="items-center py-8">
                            <BrainWaveAnimation isActive={true} size={120} />
                            <Text className="text-gray-800 font-semibold text-lg mt-4">Monitoramento Ativo</Text>
                            <Text className="text-gray-500 text-center mt-2">
                                Nenhuma crise detectada recentemente.{'\n'}O dispositivo está funcionando normalmente.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Simulação de Crise */}
                <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-4">Teste de Simulação</Text>
                    <Text className="text-gray-600 text-sm mb-4">
                        Use esta função para testar o sistema de alerta e verificar se tudo está funcionando
                        corretamente.
                    </Text>

                    <TouchableOpacity
                        onPress={handleSeizureSimulation}
                        className={`rounded-lg p-4 ${isSimulating ? 'bg-red-500' : 'bg-orange-500'}`}
                    >
                        <View className="flex-row items-center justify-center">
                            <Ionicons name={isSimulating ? 'stop' : 'play'} size={20} color="white" />
                            <Text className="text-white font-semibold ml-2">
                                {isSimulating ? 'Parar Simulação' : 'Simular Crise'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Ações Rápidas */}
                <View className="bg-white rounded-xl p-6 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-4">Ações Rápidas</Text>
                    <View className="space-y-3">
                        <TouchableOpacity className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <View className="flex-row items-center">
                                <Ionicons name="call" size={20} color="#ef4444" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-red-600 font-medium">Ligar para Emergência</Text>
                                    <Text className="text-red-400 text-xs">SAMU: 192</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <View className="flex-row items-center">
                                <Ionicons name="person-circle" size={20} color="#3b82f6" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-blue-600 font-medium">Contato de Emergência</Text>
                                    <Text className="text-blue-400 text-xs">{mockPatient.emergencyContact.name}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <View className="flex-row items-center">
                                <Ionicons name="sync" size={20} color="#6b7280" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-gray-600 font-medium">Sincronizar Dados</Text>
                                    <Text className="text-gray-400 text-xs">
                                        Última sync:{' '}
                                        {new Date(mockHomeData.deviceStats.lastSyncTime).toLocaleTimeString('pt-BR')}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
