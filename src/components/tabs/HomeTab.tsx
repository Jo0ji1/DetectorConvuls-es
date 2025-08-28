import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Vibration, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '../../contexts/DeviceContext';
import { mockPatient, mockSeizureEvents, mockHomeData, getEmergencyContactsForDisplay } from '../../data/mockData';
import { BrainWaveAnimation } from '../ui/BrainWaveAnimation';
import { esp32Service, ESP32Status } from '../../services/esp32Service';

interface HomeTabProps {
    onLogout: () => void;
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

export default function HomeTab({ onLogout }: HomeTabProps) {
    const { device, isConnected, selectedESP32Device, refreshDeviceStatus } = useDevice();

    const [isSimulating, setIsSimulating] = useState(false);
    const [realTimeStatus, setRealTimeStatus] = useState<ESP32Status | null>(null);
    const [realTimeEvents, setRealTimeEvents] = useState<RealTimeData | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Atualizar dados em tempo real quando conectado
    useEffect(() => {
        if (!isConnected || !selectedESP32Device) {
            setRealTimeStatus(null);
            setRealTimeEvents(null);
            return;
        }

        const fetchRealTimeData = async () => {
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

        // Buscar dados imediatamente
        fetchRealTimeData();

        // Configurar atualização automática a cada 5 segundos
        const interval = setInterval(fetchRealTimeData, 5000);

        return () => clearInterval(interval);
    }, [isConnected, selectedESP32Device]);

    const getLastSeizure = () => {
        if (isConnected && realTimeEvents && realTimeEvents.eventos.length > 0) {
            // Filtrar apenas eventos de crise do dispositivo real
            const criseEvents = realTimeEvents.eventos.filter((evento) => evento.tipo === 'crise_detectada');

            if (criseEvents.length > 0) {
                const lastCrise = criseEvents[0]; // Mais recente
                return {
                    id: lastCrise.id,
                    timestamp: new Date(lastCrise.timestamp).toISOString(),
                    severity: lastCrise.aceleracao > 3.0 ? 'high' : lastCrise.aceleracao > 2.0 ? 'medium' : 'low',
                    brainWaveData: [], // Não usado na tela home
                };
            }
        }

        // Fallback para dados mock
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
            case 'connected':
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

    const handleSeizureSimulation = async () => {
        if (isSimulating) {
            // Parar simulação
            setIsSimulating(false);
            Vibration.cancel();
            Alert.alert('Simulação Finalizada', 'A simulação de crise foi interrompida.');
        } else {
            if (isConnected && selectedESP32Device) {
                // Enviar comando de teste para o ESP32 real
                try {
                    const success = await esp32Service.controlDevice(selectedESP32Device.ip, {
                        test_buzzer: true,
                    });

                    if (success) {
                        Alert.alert(
                            'Teste Enviado',
                            'Comando de teste enviado para o dispositivo ESP32. Verifique se o buzzer foi acionado.',
                            [{ text: 'OK' }],
                        );
                    } else {
                        throw new Error('Falha ao enviar comando');
                    }
                } catch (error) {
                    Alert.alert('Erro', 'Não foi possível enviar o comando para o dispositivo.');
                }
            } else {
                // Simulação local quando não conectado
                setIsSimulating(true);
                Alert.alert(
                    'Simulação Iniciada',
                    'Simulação local iniciada. O celular vibrará para simular a detecção.',
                    [{ text: 'OK' }],
                );

                const vibrationPattern = [500, 1000];
                Vibration.vibrate(vibrationPattern, true);
            }
        }
    };

    const handleSyncData = async () => {
        if (!isConnected || !selectedESP32Device) {
            Alert.alert('Dispositivo Desconectado', 'Conecte-se ao dispositivo para sincronizar os dados.');
            return;
        }

        setIsRefreshing(true);
        try {
            await refreshDeviceStatus();

            // Buscar dados atualizados
            const status = await esp32Service.getDeviceStatus(selectedESP32Device.ip);
            if (status) {
                setRealTimeStatus(status);
            }

            Alert.alert('Sincronização Completa', 'Dados atualizados com sucesso!');
        } catch (error) {
            Alert.alert('Erro na Sincronização', 'Não foi possível sincronizar os dados.');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleEmergencyCall = () => {
        Alert.alert('Ligar para Emergência', 'Deseja realmente ligar para o SAMU (192)?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Ligar',
                onPress: () => {
                    // Aqui implementaria a chamada real
                    Alert.alert('Chamada Iniciada', 'Ligando para 192...');
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
                            Alert.alert('Chamada Iniciada', `Ligando para ${primaryContact.name}...`);
                        },
                    },
                ],
            );
        } else {
            Alert.alert('Contato não Configurado', 'Configure um contato de emergência nas configurações.');
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

    const getBatteryIcon = (level: number): 'battery-full' | 'battery-half' | 'battery-dead' => {
        if (level > 50) return 'battery-full';
        if (level > 25) return 'battery-half';
        return 'battery-dead';
    };

    const getDeviceDisplayName = () => {
        if (isConnected && realTimeStatus) {
            return realTimeStatus.nome;
        }
        return device.name;
    };

    const getTotalEvents = () => {
        if (isConnected && realTimeStatus) {
            return realTimeStatus.total_eventos;
        }
        return mockSeizureEvents.length;
    };

    const getLastSyncTime = () => {
        if (isConnected && realTimeStatus) {
            return new Date(realTimeStatus.timestamp).toLocaleTimeString('pt-BR');
        }
        return new Date(mockHomeData.deviceStats.lastSyncTime).toLocaleTimeString('pt-BR');
    };

    const lastSeizure = getLastSeizure();

    return (
        <ScrollView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-blue-600 pt-12 pb-6 px-6">
                <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-1">
                        <Text className="text-white text-xl font-bold">Olá, {mockPatient.name}!</Text>
                        <View className="flex-row items-center">
                            <Text className="text-white/80 text-sm">{getDeviceDisplayName()}</Text>
                            {isConnected && <View className="ml-2 w-2 h-2 bg-green-400 rounded-full" />}
                        </View>
                    </View>
                    <TouchableOpacity onPress={onLogout} className="p-2 rounded-full bg-white/20">
                        <Ionicons name="power" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Status do Dispositivo */}
                <View className="bg-white/10 rounded-xl p-4 backdrop-blur">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-white font-semibold">Status do Dispositivo</Text>
                        {isConnected && <Text className="text-green-300 text-xs">• CONECTADO AO ESP32</Text>}
                    </View>
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
                {/* Status em Tempo Real (ESP32) */}
                {isConnected && realTimeStatus && (
                    <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border-l-4 border-green-500">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-bold text-gray-800">Status em Tempo Real</Text>
                            <View className="flex-row items-center">
                                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                                <Text className="text-green-600 text-sm font-medium">ESP32 Online</Text>
                            </View>
                        </View>

                        <View className="grid grid-cols-2 gap-4">
                            <View className="bg-gray-50 rounded-lg p-3">
                                <Text className="text-gray-500 text-sm">Sistema Ativo</Text>
                                <Text className="text-gray-800 font-semibold">
                                    {realTimeStatus.sistema_ativo ? 'SIM' : 'NÃO'}
                                </Text>
                            </View>
                            <View className="bg-gray-50 rounded-lg p-3">
                                <Text className="text-gray-500 text-sm">Aceleração Atual</Text>
                                <Text className="text-gray-800 font-semibold">
                                    {realTimeStatus.ultima_aceleracao.toFixed(2)}g
                                </Text>
                            </View>
                            <View className="bg-gray-50 rounded-lg p-3">
                                <Text className="text-gray-500 text-sm">Total de Eventos</Text>
                                <Text className="text-gray-800 font-semibold">{realTimeStatus.total_eventos}</Text>
                            </View>
                            <View className="bg-gray-50 rounded-lg p-3">
                                <Text className="text-gray-500 text-sm">Threshold</Text>
                                <Text className="text-gray-800 font-semibold">
                                    {realTimeStatus.threshold.toFixed(1)}g
                                </Text>
                            </View>
                        </View>

                        {realTimeStatus.crise_detectada && (
                            <View className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                                <View className="flex-row items-center">
                                    <Ionicons name="warning" size={20} color="#ef4444" />
                                    <Text className="text-red-600 font-medium ml-2">CRISE DETECTADA!</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

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
                            {isConnected && (
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-gray-500">Fonte:</Text>
                                    <Text className="text-blue-600 font-medium">ESP32 Real</Text>
                                </View>
                            )}
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
                            {isConnected && (
                                <Text className="text-blue-600 text-sm mt-2 font-medium">✓ Conectado ao ESP32</Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Teste do Sistema */}
                <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-4">
                        {isConnected ? 'Teste do ESP32' : 'Simulação Local'}
                    </Text>
                    <Text className="text-gray-600 text-sm mb-4">
                        {isConnected
                            ? 'Teste o buzzer do dispositivo ESP32 conectado para verificar se está funcionando.'
                            : 'Use esta função para testar o sistema de alerta localmente.'}
                    </Text>

                    <TouchableOpacity
                        onPress={handleSeizureSimulation}
                        className={`rounded-lg p-4 ${isSimulating ? 'bg-red-500' : 'bg-orange-500'}`}
                        disabled={isRefreshing}
                    >
                        <View className="flex-row items-center justify-center">
                            <Ionicons
                                name={isConnected ? 'volume-high' : isSimulating ? 'stop' : 'play'}
                                size={20}
                                color="white"
                            />
                            <Text className="text-white font-semibold ml-2">
                                {isConnected
                                    ? 'Testar Buzzer ESP32'
                                    : isSimulating
                                    ? 'Parar Simulação'
                                    : 'Simular Crise'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Ações Rápidas */}
                <View className="bg-white rounded-xl p-6 shadow-sm">
                    <Text className="text-lg font-bold text-gray-800 mb-4">Ações Rápidas</Text>
                    <View className="space-y-3">
                        <TouchableOpacity
                            className="bg-red-50 border border-red-200 rounded-lg p-4"
                            onPress={handleEmergencyCall}
                        >
                            <View className="flex-row items-center">
                                <Ionicons name="call" size={20} color="#ef4444" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-red-600 font-medium">Ligar para Emergência</Text>
                                    <Text className="text-red-400 text-xs">SAMU: 192</Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                            onPress={handleEmergencyContact}
                        >
                            <View className="flex-row items-center">
                                <Ionicons name="person-circle" size={20} color="#3b82f6" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-blue-600 font-medium">Contato de Emergência</Text>
                                    <Text className="text-blue-400 text-xs">
                                        {getEmergencyContactsForDisplay()[0]?.name || 'Não configurado'}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                            onPress={handleSyncData}
                            disabled={isRefreshing}
                        >
                            <View className="flex-row items-center">
                                <Ionicons name={isRefreshing ? 'sync' : 'sync-outline'} size={20} color="#6b7280" />
                                <View className="ml-3 flex-1">
                                    <Text className="text-gray-600 font-medium">
                                        {isConnected ? 'Sincronizar com ESP32' : 'Sincronizar Dados'}
                                    </Text>
                                    <Text className="text-gray-400 text-xs">
                                        Última sync: {getLastSyncTime()}
                                        {isConnected && ' • Total: ' + getTotalEvents() + ' eventos'}
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
