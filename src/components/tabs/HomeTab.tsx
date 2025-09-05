import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '../../contexts/DeviceContext';
import { getEmergencyContactsForDisplay } from '../../data/mockData';
import { BrainWaveAnimation } from '../ui/BrainWaveAnimation';
import { esp32Service, ESP32Status } from '../../services/esp32Service';
import { Linking } from 'react-native';

interface HomeTabProps {
    onDisconnect: () => void;
}

interface RealTimeData {
    eventos: Array<{
        id: string;
        timestamp: number;
        aceleracao: number;
        tipo: string;
        data_formatada: string;
    }>;
    total: number;
    historico_disponivel: number;
}

export default function HomeTab({ onDisconnect }: HomeTabProps) {
    const { isConnected, selectedESP32Device } = useDevice();
    const [realTimeStatus, setRealTimeStatus] = useState<ESP32Status | null>(null);
    const [realTimeEvents, setRealTimeEvents] = useState<RealTimeData | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Função para buscar dados em tempo real
    const fetchRealTimeData = async () => {
        if (!isConnected || !selectedESP32Device) {
            setRealTimeStatus(null);
            setRealTimeEvents(null);
            return;
        }

        try {
            // Buscar status do dispositivo
            const status = await esp32Service.getDeviceStatus(selectedESP32Device.ip);
            if (status) {
                setRealTimeStatus(status);
            }

            // Buscar eventos recentes
            const response = await fetch(`http://${selectedESP32Device.ip}/eventos`);
            if (response.ok) {
                const eventsData = await response.json();
                setRealTimeEvents(eventsData);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar dados em tempo real:', error);
        }
    };

    // Atualizar dados automaticamente
    useEffect(() => {
        fetchRealTimeData();

        if (isConnected) {
            const interval = setInterval(fetchRealTimeData, 2000); // Request a cada 2 segundos
            return () => clearInterval(interval);
        }
    }, [isConnected, selectedESP32Device]);

    // Pull to refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchRealTimeData();
        setIsRefreshing(false);
    };

    const getLastCrisis = () => {
        if (isConnected && realTimeEvents && realTimeEvents.eventos.length > 0) {
            const criseEvents = realTimeEvents.eventos.filter((evento) => evento.tipo === 'crise_detectada');
            if (criseEvents.length > 0) {
                return criseEvents[0]; // Mais recente
            }
        }
        return null;
    };

    const handleEmergencyCall = () => {
        Alert.alert('Ligar para Emergência', 'Deseja realmente ligar para o SAMU (192)?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Ligar',
                onPress: () => {
                    Linking.openURL('tel:192');
                },
            },
        ]);
    };

    const handleEmergencyContact = () => {
        const emergencyContacts = getEmergencyContactsForDisplay();
        const primaryContact = emergencyContacts[0];

        if (primaryContact && primaryContact.phone !== '192') {
            Alert.alert(
                'Contato de Emergência',
                `Deseja ligar para ${primaryContact.name} (${primaryContact.phone})?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Ligar',
                        onPress: () => {
                            Linking.openURL(`tel:${primaryContact.phone}`);
                        },
                    },
                ],
            );
        } else {
            Alert.alert('Contato não Configurado', 'Configure um contato de emergência nas configurações.');
        }
    };

    const handleTestDevice = async () => {
        if (isConnected && selectedESP32Device) {
            try {
                const success = await esp32Service.controlDevice(selectedESP32Device.ip, {
                    test_buzzer: true,
                });

                if (success) {
                    Alert.alert('Teste Enviado', 'Comando de teste enviado para o dispositivo. Verifique o buzzer.', [
                        { text: 'OK' },
                    ]);
                } else {
                    throw new Error('Falha ao enviar comando');
                }
            } catch (error) {
                Alert.alert('Erro', 'Não foi possível enviar o comando para o dispositivo.');
            }
        } else {
            Alert.alert('Dispositivo Desconectado', 'Conecte-se ao dispositivo primeiro.');
        }
    };

    const lastCrisis = getLastCrisis();

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        >
            {/* Header Minimalista */}
            <LinearGradient
                colors={['#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="pt-16 pb-8 px-6"
            >
                <View className="flex-row justify-between items-center">
                    <View className="flex-1">
                        <Text className="text-white text-2xl font-bold mb-1">Seizure Detector</Text>
                        <View className="flex-row items-center">
                            <View
                                className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
                            />
                            <Text className="text-white/90 text-sm">
                                {isConnected ? `Conectado: ${selectedESP32Device?.nome}` : 'Dispositivo desconectado'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onDisconnect} className="p-3 rounded-full bg-white/10">
                        <Ionicons name="power" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Container principal com padding e espaçamento adequado */}
            <View className="px-6 py-6">
                {/* Status em Tempo Real - ESP32 */}
                {isConnected && realTimeStatus ? (
                    <View className="mb-8">
                        {/* Título da Seção */}
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                                <Ionicons name="pulse" size={16} color="#3b82f6" />
                            </View>
                            <Text className="text-2xl font-bold text-gray-800">Status em Tempo Real</Text>
                        </View>

                        {/* Card com View Branca */}
                        <View className="bg-white rounded-2xl p-6 shadow-sm">
                            {/* Grid de Status - 2 colunas com espaçamento */}
                            <View className="mb-4">
                                <View className="flex-row mb-4" style={{ gap: 16 }}>
                                    <View className="flex-1 bg-blue-50 rounded-xl p-4 items-center">
                                        <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center mb-3">
                                            <Ionicons
                                                name={
                                                    realTimeStatus.sistema_ativo ? 'shield-checkmark' : 'shield-outline'
                                                }
                                                size={24}
                                                color="white"
                                            />
                                        </View>
                                        <Text className="text-gray-600 text-sm mb-1">Sistema</Text>
                                        <Text className="text-gray-800 font-bold">
                                            {realTimeStatus.sistema_ativo ? 'Ativo' : 'Inativo'}
                                        </Text>
                                    </View>

                                    <View className="flex-1 bg-orange-50 rounded-xl p-4 items-center">
                                        <View className="w-12 h-12 bg-orange-500 rounded-full items-center justify-center mb-3">
                                            <Ionicons name="speedometer" size={24} color="white" />
                                        </View>
                                        <Text className="text-gray-600 text-sm mb-1">Aceleração</Text>
                                        <Text className="text-gray-800 font-bold">
                                            {realTimeStatus.ultima_aceleracao.toFixed(2)}g
                                        </Text>
                                    </View>
                                </View>

                                <View className="flex-row" style={{ gap: 16 }}>
                                    <View className="flex-1 bg-purple-50 rounded-xl p-4 items-center">
                                        <View className="w-12 h-12 bg-purple-500 rounded-full items-center justify-center mb-3">
                                            <Ionicons name="pulse" size={24} color="white" />
                                        </View>
                                        <Text className="text-gray-600 text-sm mb-1">Eventos</Text>
                                        <Text className="text-gray-800 font-bold">{realTimeStatus.total_eventos}</Text>
                                    </View>

                                    <View className="flex-1 bg-gray-100 rounded-xl p-4 items-center">
                                        <View className="w-12 h-12 bg-gray-500 rounded-full items-center justify-center mb-3">
                                            <Ionicons name="settings" size={24} color="white" />
                                        </View>
                                        <Text className="text-gray-600 text-sm mb-1">Threshold</Text>
                                        <Text className="text-gray-800 font-bold">
                                            {realTimeStatus.threshold.toFixed(1)}g
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Alerta de Crise dentro do card */}
                            {realTimeStatus.crise_detectada && (
                                <View className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 mt-4">
                                    <View className="flex-row items-center">
                                        <View className="w-10 h-10 bg-red-500 rounded-full items-center justify-center mr-3">
                                            <Ionicons name="warning" size={20} color="white" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-red-800 font-bold text-lg">CRISE DETECTADA!</Text>
                                            <Text className="text-red-600 text-sm">
                                                Informações salvas com sucesso.
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                ) : isConnected ? (
                    <View className="bg-white rounded-2xl p-6 shadow-sm mb-8">
                        <View className="items-center py-8">
                            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                                <Ionicons name="sync" size={32} color="#6b7280" />
                            </View>
                            <Text className="text-gray-800 font-semibold text-lg mb-2">Carregando Status</Text>
                            <Text className="text-gray-500 text-center">
                                Obtendo dados em tempo real do dispositivo...
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View className="bg-white rounded-2xl p-6 shadow-sm mb-8">
                        <View className="items-center py-8">
                            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
                                <Ionicons name="wifi" size={32} color="#ef4444" />
                            </View>
                            <Text className="text-gray-800 font-semibold text-lg mb-2">Dispositivo Desconectado</Text>
                            <Text className="text-gray-500 text-center">
                                Conecte-se ao dispositivo ESP32 para monitoramento em tempo real.
                            </Text>
                        </View>
                    </View>
                )}

                {/* Última Crise ou Status de Monitoramento */}
                {lastCrisis ? (
                    <View className="mb-8">
                        {/* Título da Seção */}
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-3">
                                <Ionicons name="warning" size={16} color="#f59e0b" />
                            </View>
                            <Text className="text-2xl font-bold text-gray-800">Última Detecção</Text>
                        </View>

                        {/* Card com View Branca */}
                        <View className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-orange-500">
                            <View className="mb-4">
                                <View className="flex-row items-center mb-4">
                                    <View className="w-10 h-10 bg-orange-100 rounded-full items-center justify-center mr-3">
                                        <Ionicons name="time" size={20} color="#f59e0b" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-600 text-sm">Data e Hora</Text>
                                        <Text className="text-gray-800 font-medium">
                                            {new Date(lastCrisis.timestamp).toLocaleString('pt-BR')}
                                        </Text>
                                    </View>
                                </View>

                                <View className="flex-row items-center mb-4">
                                    <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
                                        <Ionicons name="speedometer" size={20} color="#ef4444" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-600 text-sm">Intensidade</Text>
                                        <Text className="text-gray-800 font-medium">
                                            {lastCrisis.aceleracao.toFixed(2)}g
                                        </Text>
                                    </View>
                                </View>

                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                                        <Ionicons name="hardware-chip" size={20} color="#3b82f6" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-gray-600 text-sm">Fonte</Text>
                                        <Text className="text-blue-600 font-medium">ESP32 Real</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View className="mb-8">
                        {/* Título da Seção */}
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 bg-green-100 rounded-full items-center justify-center mr-3">
                                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                            </View>
                            <Text className="text-2xl font-bold text-gray-800">Monitoramento</Text>
                        </View>

                        {/* Card com View Branca */}
                        <View className="bg-white rounded-2xl p-6 shadow-sm">
                            <View className="items-center py-8">
                                <BrainWaveAnimation isActive={isConnected} size={100} />
                                <Text className="text-gray-800 font-semibold text-xl mt-6 mb-2">Sistema Ativo</Text>
                                <Text className="text-gray-500 text-center">
                                    {isConnected
                                        ? 'Funcionando normalmente.\nNenhuma crise detectada.'
                                        : 'Conecte o dispositivo para iniciar o monitoramento.'}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Ações de Emergência */}
                <View className="mb-8">
                    {/* Título da Seção */}
                    <View className="flex-row items-center mb-4">
                        <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center mr-3">
                            <Ionicons name="medical" size={16} color="#ef4444" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-800">Emergência</Text>
                    </View>

                    {/* Card com View Branca */}
                    <View className="bg-white rounded-2xl p-6 shadow-sm">
                        <View className="mb-4">
                            <TouchableOpacity
                                className="bg-red-500 rounded-xl p-4 mb-4"
                                onPress={handleEmergencyCall}
                                activeOpacity={0.8}
                            >
                                <View className="flex-row items-center">
                                    <View className="w-12 h-12 bg-white rounded-full items-center justify-center mr-4">
                                        <Ionicons name="call" size={24} color="#ef4444" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-bold text-lg">SAMU - 192</Text>
                                        <Text className="text-white/80 text-sm">Emergência médica</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="white" />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="bg-blue-500 rounded-xl p-4"
                                onPress={handleEmergencyContact}
                                activeOpacity={0.8}
                            >
                                <View className="flex-row items-center">
                                    <View className="w-12 h-12 bg-white rounded-full items-center justify-center mr-4">
                                        <Ionicons name="person" size={24} color="#3b82f6" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-white font-bold text-lg">Contato Principal</Text>
                                        <Text className="text-white/80 text-sm">
                                            {getEmergencyContactsForDisplay()[0]?.name || 'Não configurado'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="white" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Teste do Dispositivo */}
                {isConnected && (
                    <View className="mb-6">
                        {/* Título da Seção */}
                        <View className="flex-row items-center mb-4">
                            <View className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center mr-3">
                                <Ionicons name="settings" size={16} color="#f59e0b" />
                            </View>
                            <Text className="text-2xl font-bold text-gray-800">Teste do Sistema</Text>
                        </View>

                        {/* Card com View Branca */}
                        <View className="bg-white rounded-2xl p-6 shadow-sm">
                            <Text className="text-gray-600 text-sm mb-6">
                                Teste o buzzer do dispositivo para verificar se está funcionando corretamente.
                            </Text>

                            <TouchableOpacity
                                className="bg-orange-500 rounded-xl p-4"
                                onPress={handleTestDevice}
                                activeOpacity={0.8}
                            >
                                <View className="flex-row items-center justify-center">
                                    <View className="w-10 h-10 bg-white rounded-full items-center justify-center mr-3">
                                        <Ionicons name="volume-high" size={20} color="#f59e0b" />
                                    </View>
                                    <Text className="text-white font-bold text-lg">Testar Buzzer</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
