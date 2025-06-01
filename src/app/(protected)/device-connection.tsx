import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '../../contexts/DeviceContext';
import { router } from 'expo-router';
import { BrainWaveAnimation } from '../../components/ui/BrainWaveAnimation';
import '@/global.css';

const { width, height } = Dimensions.get('window');

export default function DeviceConnectionScreen() {
    const { device, isConnecting, isConnected, connectToDevice } = useDevice();
    const [showWaves, setShowWaves] = useState(false);

    useEffect(() => {
        // Iniciar animação das ondas após 500ms
        const timer = setTimeout(() => setShowWaves(true), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isConnected) {
            // Aguardar um pouco para mostrar o sucesso antes de navegar
            const timer = setTimeout(() => {
                router.replace('/(protected)/dashboard');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isConnected]);

    const handleConnect = async () => {
        const success = await connectToDevice();

        if (!success) {
            Alert.alert(
                'Falha na Conexão',
                'Não foi possível conectar ao dispositivo. Verifique se o dispositivo está ligado e próximo ao celular.',
                [{ text: 'OK' }],
            );
        }
    };

    const getStatusColor = () => {
        switch (device.status) {
            case 'active':
                return '#10b981'; // verde
            case 'connected':
                return '#3b82f6'; // azul
            case 'connecting':
                return '#f59e0b'; // amarelo
            default:
                return '#ef4444'; // vermelho
        }
    };

    const getStatusText = () => {
        if (isConnected) return 'Conectado';
        if (isConnecting) return 'Conectando...';
        if (device.status === 'active') return 'Disponível';
        return 'Inativo';
    };

    return (
        <View className="flex-1">
            <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} className="flex-1">
                <View className="flex-1 justify-center items-center px-6">
                    {/* Header */}
                    <View className="items-center mb-32">
                        <Text className="text-white text-2xl font-bold mb-2">Conectar Dispositivo</Text>
                        <Text className="text-gray-300 text-base text-center">
                            Procurando por dispositivos próximos...
                        </Text>
                    </View>

                    {/* Brain Wave Animation Container */}
                    <View className="relative items-center justify-center mb-32">
                        {/* Ondas de fundo */}
                        <View className="absolute">
                            <BrainWaveAnimation isActive={showWaves && !isConnected} size={280} />
                        </View>

                        {/* Imagem do cérebro */}
                        <View className="relative">
                            <View
                                className="rounded-full items-center justify-center"
                                style={{
                                    width: 200,
                                    height: 200,
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    borderWidth: 2,
                                    borderColor: isConnected ? '#10b981' : '#3b82f6',
                                }}
                            >
                                <Image
                                    source={require('@/assets/images/brain-wave.png')}
                                    style={{
                                        width: 160,
                                        height: 160,
                                        resizeMode: 'contain',
                                        tintColor: isConnected ? '#10b981' : '#3b82f6',
                                    }}
                                />
                            </View>

                            {/* Indicador de status */}
                            <View
                                className="absolute -top-2 -right-2 rounded-full border-4 border-gray-800"
                                style={{
                                    width: 32,
                                    height: 32,
                                    backgroundColor: getStatusColor(),
                                }}
                            >
                                {isConnecting && (
                                    <View className="flex-1 justify-center items-center">
                                        <ActivityIndicator size="small" color="white" />
                                    </View>
                                )}
                                {isConnected && (
                                    <View className="flex-1 justify-center items-center">
                                        <Ionicons name="checkmark" size={16} color="white" />
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Device Info */}
                    <View className="bg-gray-800/50 rounded-2xl p-6 mb-8 w-full max-w-sm">
                        <View className="items-center mb-4">
                            <Text className="text-white text-xl font-semibold mb-1">{device.name}</Text>
                            <Text className="text-sm font-medium" style={{ color: getStatusColor() }}>
                                {getStatusText()}
                            </Text>
                        </View>

                        <View className="space-y-3">
                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-300">ID do Dispositivo:</Text>
                                <Text className="text-white font-medium">{device.id}</Text>
                            </View>

                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-300">Bateria:</Text>
                                <View className="flex-row items-center">
                                    <Ionicons
                                        name="battery-half"
                                        size={16}
                                        color={device.batteryLevel > 20 ? '#10b981' : '#ef4444'}
                                    />
                                    <Text className="text-white font-medium ml-1">{device.batteryLevel}%</Text>
                                </View>
                            </View>

                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-300">Sinal:</Text>
                                <View className="flex-row items-center">
                                    <Ionicons
                                        name="wifi"
                                        size={16}
                                        color={device.signalStrength > 50 ? '#10b981' : '#f59e0b'}
                                    />
                                    <Text className="text-white font-medium ml-1">{device.signalStrength}%</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Connect Button */}
                    {!isConnected && (
                        <TouchableOpacity
                            className={`w-full max-w-sm rounded-full py-4 px-8 ${
                                isConnecting ? 'bg-gray-600' : 'bg-blue-600'
                            }`}
                            onPress={handleConnect}
                            disabled={isConnecting}
                        >
                            {isConnecting ? (
                                <View className="flex-row justify-center items-center">
                                    <ActivityIndicator color="white" size="small" />
                                    <Text className="text-white text-lg font-bold ml-2">Conectando...</Text>
                                </View>
                            ) : (
                                <Text className="text-white text-lg font-bold text-center">
                                    Conectar ao Dispositivo
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {isConnected && (
                        <View className="items-center">
                            <View className="bg-green-600 rounded-full py-4 px-8 mb-4">
                                <Text className="text-white text-lg font-bold">✓ Conectado com Sucesso</Text>
                            </View>
                            <Text className="text-gray-300 text-center">Redirecionando para o painel...</Text>
                        </View>
                    )}
                </View>
            </LinearGradient>
        </View>
    );
}
