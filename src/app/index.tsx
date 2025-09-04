import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDevice } from '../contexts/DeviceContext';
import { router } from 'expo-router';
import { BrainWaveAnimation } from '../components/ui/BrainWaveAnimation';
import { ESP32Device } from '../services/esp32Service';
import '@/global.css';

export default function DeviceConnectionScreen() {
    const {
        device,
        availableDevices,
        isScanning,
        isConnecting,
        isConnected,
        connectionError,
        scanForDevices,
        connectToDevice,
        selectedESP32Device,
    } = useDevice();

    const [showWaves, setShowWaves] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<ESP32Device | null>(null);

    useEffect(() => {
        // Iniciar animação das ondas após 500ms
        const timer = setTimeout(() => setShowWaves(true), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isConnected) {
            // Aguardar um pouco para mostrar o sucesso antes de navegar
            const timer = setTimeout(() => {
                router.replace('/dashboard');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isConnected]);

    // Auto-selecionar primeiro dispositivo disponível
    useEffect(() => {
        if (availableDevices.length > 0 && !selectedDevice) {
            setSelectedDevice(availableDevices[0]);
        }
    }, [availableDevices]);

    const handleConnect = async () => {
        if (selectedDevice) {
            const success = await connectToDevice(selectedDevice);

            if (!success) {
                Alert.alert(
                    'Falha na Conexão',
                    connectionError ||
                        'Não foi possível conectar ao dispositivo. Verifique se o dispositivo está ligado e na mesma rede WiFi.',
                    [{ text: 'Tentar Novamente', onPress: () => scanForDevices() }, { text: 'OK' }],
                );
            }
        } else {
            // Tentar escanear e conectar automaticamente
            await scanForDevices();
            if (availableDevices.length > 0) {
                await connectToDevice(availableDevices[0]);
            } else {
                Alert.alert(
                    'Nenhum Dispositivo Encontrado',
                    'Certifique-se de que:\n• O dispositivo ESP32 está ligado\n• Está conectado à mesma rede WiFi\n• O dispositivo está próximo',
                    [{ text: 'OK' }],
                );
            }
        }
    };

    const handleScan = async () => {
        await scanForDevices();
    };

    const getStatusColor = () => {
        if (isConnected) return '#10b981'; // verde
        if (isConnecting) return '#f59e0b'; // amarelo
        if (selectedDevice) return '#3b82f6'; // azul
        return '#ef4444'; // vermelho
    };

    const getStatusText = () => {
        if (isConnected) return 'Conectado';
        if (isConnecting) return 'Conectando...';
        if (isScanning) return 'Escaneando...';
        if (selectedDevice) return 'Disponível';
        if (connectionError) return 'Erro de Conexão';
        return 'Nenhum dispositivo';
    };

    const renderDeviceList = () => {
        if (availableDevices.length === 0) {
            return null;
        }

        return (
            <View className="w-full max-w-sm mb-6">
                <Text className="text-white text-lg font-semibold mb-3 text-center">
                    Dispositivos Encontrados ({availableDevices.length})
                </Text>
                {availableDevices.map((esp32Device, index) => (
                    <TouchableOpacity
                        key={`${esp32Device.ip}-${index}`}
                        className={`bg-gray-800/50 rounded-xl p-4 mb-2 border-2 ${
                            selectedDevice?.ip === esp32Device.ip ? 'border-blue-500' : 'border-transparent'
                        }`}
                        onPress={() => setSelectedDevice(esp32Device)}
                    >
                        <View className="flex-row justify-between items-center">
                            <View className="flex-1">
                                <Text className="text-white font-medium">{esp32Device.nome}</Text>
                                <Text className="text-gray-300 text-sm">{esp32Device.device}</Text>
                                <Text className="text-gray-400 text-xs">IP: {esp32Device.ip}</Text>
                                {esp32Device.mdns && (
                                    <Text className="text-blue-400 text-xs">mDNS: {esp32Device.mdns}</Text>
                                )}
                            </View>
                            <View className="items-center">
                                <View
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: esp32Device.online ? '#10b981' : '#ef4444' }}
                                />
                                <Text className="text-gray-300 text-xs mt-1">v{esp32Device.versao}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View className="flex-1">
            <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} className="flex-1">
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ flexGrow: 1 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isScanning}
                            onRefresh={handleScan}
                            colors={['#3b82f6']}
                            tintColor="#3b82f6"
                        />
                    }
                >
                    <View className="flex-1 justify-center items-center px-6 py-12">
                        {/* Header */}
                        <View className="items-center mb-8">
                            <Text className="text-white text-3xl font-bold mb-2">Seizure Detector</Text>
                            <Text className="text-white text-2xl font-bold mb-2">Conectar Dispositivo</Text>
                            <Text className="text-gray-300 text-base text-center">
                                {isScanning
                                    ? 'Escaneando rede local...'
                                    : availableDevices.length > 0
                                    ? 'Selecione um dispositivo:'
                                    : 'Puxe para baixo para escanear'}
                            </Text>
                        </View>

                        {/* Brain Wave Animation Container */}
                        <View className="relative items-center justify-center mb-8">
                            {/* Ondas de fundo */}
                            <View className="absolute">
                                <BrainWaveAnimation
                                    isActive={showWaves && (isScanning || isConnecting || isConnected)}
                                    size={280}
                                />
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
                                        borderColor: getStatusColor(),
                                    }}
                                >
                                    <Image
                                        source={require('@/assets/images/brain-wave.png')}
                                        style={{
                                            width: 160,
                                            height: 160,
                                            resizeMode: 'contain',
                                            tintColor: getStatusColor(),
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
                                    {(isConnecting || isScanning) && (
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

                        {/* Status atual */}
                        <View className="items-center mb-6">
                            <Text className="text-xl font-semibold mb-1" style={{ color: getStatusColor() }}>
                                {getStatusText()}
                            </Text>
                            {connectionError && (
                                <Text className="text-red-400 text-sm text-center">{connectionError}</Text>
                            )}
                        </View>

                        {/* Lista de dispositivos */}
                        {renderDeviceList()}

                        {/* Device Info - apenas se um dispositivo estiver selecionado */}
                        {selectedDevice && (
                            <View className="bg-gray-800/50 rounded-2xl p-6 mb-8 w-full max-w-sm">
                                <View className="items-center mb-4">
                                    <Text className="text-white text-xl font-semibold mb-1">{selectedDevice.nome}</Text>
                                    <Text className="text-sm font-medium" style={{ color: getStatusColor() }}>
                                        {selectedDevice.device}
                                    </Text>
                                </View>

                                <View className="space-y-3">
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-gray-300">Endereço IP:</Text>
                                        <Text className="text-white font-medium">{selectedDevice.ip}</Text>
                                    </View>

                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-gray-300">Porta:</Text>
                                        <Text className="text-white font-medium">{selectedDevice.port}</Text>
                                    </View>

                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-gray-300">Versão:</Text>
                                        <Text className="text-white font-medium">v{selectedDevice.versao}</Text>
                                    </View>

                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-gray-300">Status:</Text>
                                        <View className="flex-row items-center">
                                            <View
                                                className="w-2 h-2 rounded-full mr-2"
                                                style={{
                                                    backgroundColor: selectedDevice.online ? '#10b981' : '#ef4444',
                                                }}
                                            />
                                            <Text className="text-white font-medium">
                                                {selectedDevice.online ? 'Online' : 'Offline'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View className="w-full max-w-sm space-y-3">
                            {!isConnected && (
                                <>
                                    <TouchableOpacity
                                        className={`w-full rounded-full py-4 px-8 mb-3 ${
                                            isConnecting
                                                ? 'bg-gray-600'
                                                : selectedDevice
                                                ? 'bg-blue-600'
                                                : 'bg-gray-600'
                                        }`}
                                        onPress={handleConnect}
                                        disabled={isConnecting || !selectedDevice}
                                    >
                                        {isConnecting ? (
                                            <View className="flex-row justify-center items-center">
                                                <ActivityIndicator color="white" size="small" />
                                                <Text className="text-white text-lg font-bold ml-2">Conectando...</Text>
                                            </View>
                                        ) : (
                                            <Text className="text-white text-lg font-bold text-center">
                                                {selectedDevice
                                                    ? 'Conectar ao Dispositivo'
                                                    : 'Nenhum dispositivo selecionado'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        className={`w-full rounded-full py-3 px-8 border-2 border-blue-500 ${
                                            isScanning ? 'bg-blue-500/20' : 'bg-transparent'
                                        }`}
                                        onPress={handleScan}
                                        disabled={isScanning}
                                    >
                                        {isScanning ? (
                                            <View className="flex-row justify-center items-center">
                                                <ActivityIndicator color="#3b82f6" size="small" />
                                                <Text className="text-blue-400 text-base font-medium ml-2">
                                                    Escaneando...
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text className="text-blue-400 text-base font-medium text-center">
                                                🔍 Escanear Novamente
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}

                            {isConnected && (
                                <View className="items-center">
                                    <View className="bg-green-600 rounded-full py-4 px-8 mb-4">
                                        <Text className="text-white text-lg font-bold">✓ Conectado com Sucesso</Text>
                                    </View>
                                    <Text className="text-gray-300 text-center">Redirecionando para o painel...</Text>
                                    <Text className="text-gray-400 text-sm text-center mt-2">
                                        Conectado a: {selectedESP32Device?.ip}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}
