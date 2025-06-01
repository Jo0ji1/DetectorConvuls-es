import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useDevice } from '../../contexts/DeviceContext';
import { router } from 'expo-router';
import { mockPatient, mockSeizureEvents } from '../../data/mockData';
import '../../../global.css';

export default function DashboardScreen() {
    const { user, logout } = useAuth();
    const { device, disconnectDevice } = useDevice();

    const handleLogout = async () => {
        Alert.alert('Desconectar', 'Tem certeza que deseja desconectar do dispositivo?', [
            {
                text: 'Cancelar',
                style: 'cancel',
            },
            {
                text: 'Desconectar',
                style: 'destructive',
                onPress: async () => {
                    disconnectDevice();
                    await logout();
                    router.replace('/');
                },
            },
        ]);
    };

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

    const lastSeizure = getLastSeizure();

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-blue-600 pt-12 pb-6 px-6">
                <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                        <Text className="text-white text-lg font-semibold">Olá, {mockPatient.name}!</Text>
                        <Text className="text-white/80 text-sm">Dispositivo: {device.name}</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} className="p-2 rounded-full bg-white/20">
                        <Ionicons name="power" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
                {/* Status Cards */}
                <View className="flex-row justify-between mb-6 space-x-3">
                    <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-gray-500 text-sm">Status</Text>
                                <Text className="text-green-600 font-bold">Ativo</Text>
                            </View>
                            <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center">
                                <Ionicons name="pulse" size={20} color="#10b981" />
                            </View>
                        </View>
                    </View>

                    <View className="flex-1 bg-white rounded-xl p-4 shadow-sm">
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-gray-500 text-sm">Bateria</Text>
                                <Text className="text-blue-600 font-bold">{device.batteryLevel}%</Text>
                            </View>
                            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                                <Ionicons name="battery-half" size={20} color="#3b82f6" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Patient Info */}
                <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-4">Informações do Paciente</Text>
                    <View className="space-y-3">
                        <View className="flex-row justify-between">
                            <Text className="text-gray-500">Nome:</Text>
                            <Text className="text-gray-800 font-medium">{mockPatient.name}</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-gray-500">Idade:</Text>
                            <Text className="text-gray-800 font-medium">{mockPatient.age} anos</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-gray-500">Contato de Emergência:</Text>
                            <Text className="text-gray-800 font-medium">{mockPatient.emergencyContact.name}</Text>
                        </View>
                    </View>
                </View>

                {/* Last Seizure */}
                {lastSeizure && (
                    <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                        <Text className="text-lg font-bold text-gray-800 mb-4">Última Crise Detectada</Text>
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
                )}

                {/* Quick Actions */}
                <View className="bg-white rounded-xl p-6 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-4">Ações Rápidas</Text>
                    <View className="space-y-3">
                        <TouchableOpacity className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <View className="flex-row items-center">
                                <Ionicons name="call" size={20} color="#ef4444" />
                                <Text className="text-red-600 font-medium ml-3">Ligar para Emergência</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <View className="flex-row items-center">
                                <Ionicons name="analytics" size={20} color="#3b82f6" />
                                <Text className="text-blue-600 font-medium ml-3">Ver Histórico de Crises</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
