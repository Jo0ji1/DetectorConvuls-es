import React, { createContext, useContext, useState, useEffect } from 'react';
import { esp32Service, ESP32Device, ESP32Status } from '../services/esp32Service';

interface DeviceData {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'connecting' | 'connected';
    batteryLevel: number;
    signalStrength: number;
    lastActivity: string;
    operationTime: number; // em horas
}

interface DeviceContextType {
    device: DeviceData | null;
    availableDevices: ESP32Device[];
    isScanning: boolean;
    isConnecting: boolean;
    isConnected: boolean;
    connectionError: string | null;
    scanForDevices: () => Promise<void>;
    connectToDevice: (esp32Device?: ESP32Device) => Promise<boolean>;
    disconnectDevice: () => void;
    refreshDeviceStatus: () => Promise<void>;
    selectedESP32Device: ESP32Device | null;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
    const [device, setDevice] = useState<DeviceData | null>(null);
    const [availableDevices, setAvailableDevices] = useState<ESP32Device[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [selectedESP32Device, setSelectedESP32Device] = useState<ESP32Device | null>(null);

    // Função para converter dados do ESP32 para o formato DeviceData
    const convertESP32ToDeviceData = (esp32Status: ESP32Status, esp32Device: ESP32Device): DeviceData => {
        // Calcular battery level baseado na qualidade do WiFi e status
        const batteryLevel = Math.max(50, Math.min(100, esp32Status.wifi_rssi + 120)); // Simulação baseada no RSSI

        // Calcular signal strength
        const signalStrength = Math.max(0, Math.min(100, esp32Status.wifi_rssi + 120));

        // Determinar status
        let status: DeviceData['status'] = 'inactive';
        if (esp32Status.sistema_ativo) {
            status = isConnected ? 'connected' : 'active';
        }

        return {
            id: esp32Status.device,
            name: esp32Status.nome,
            status: status,
            batteryLevel: batteryLevel,
            signalStrength: signalStrength,
            lastActivity: new Date(esp32Status.ultima_atividade || Date.now()).toISOString(),
            operationTime: esp32Status.uptime / (1000 * 60 * 60), // converter ms para horas
        };
    };

    // Escanear por dispositivos na rede
    const scanForDevices = async (): Promise<void> => {
        try {
            setIsScanning(true);
            setConnectionError(null);
            console.log('🔍 Iniciando escaneamento...');

            const foundDevices = await esp32Service.discoverDevices();
            setAvailableDevices(foundDevices);

            console.log(`📱 ${foundDevices.length} dispositivo(s) encontrado(s)`);

            if (foundDevices.length === 0) {
                setConnectionError('Nenhum dispositivo encontrado na rede');
            }
        } catch (error) {
            console.error('❌ Erro no escaneamento:', error);
            setConnectionError('Erro ao escanear dispositivos');
        } finally {
            setIsScanning(false);
        }
    };

    // Conectar ao dispositivo (ESP32 real ou primeiro disponível)
    const connectToDevice = async (esp32Device?: ESP32Device): Promise<boolean> => {
        try {
            setIsConnecting(true);
            setConnectionError(null);

            let targetDevice = esp32Device;

            // Se não foi especificado um dispositivo, tentar encontrar um
            if (!targetDevice) {
                if (availableDevices.length === 0) {
                    console.log('🔍 Nenhum dispositivo disponível, iniciando escaneamento...');
                    await scanForDevices();
                }

                if (availableDevices.length === 0) {
                    throw new Error('Nenhum dispositivo encontrado');
                }

                targetDevice = availableDevices[0]; // Usar o primeiro encontrado
            }

            console.log('🔄 Tentando conectar a:', targetDevice.ip);

            // Tentar conectar
            const connectionSuccess = await esp32Service.connectToDevice(targetDevice);

            if (!connectionSuccess) {
                throw new Error('Falha na conexão com o dispositivo');
            }

            // Obter status completo do dispositivo
            const deviceStatus = await esp32Service.getDeviceStatus(targetDevice.ip);

            if (!deviceStatus) {
                throw new Error('Não foi possível obter status do dispositivo');
            }

            // Converter e atualizar estado
            const convertedDevice = convertESP32ToDeviceData(deviceStatus, targetDevice);
            setDevice(convertedDevice);
            setSelectedESP32Device(targetDevice);
            setIsConnected(true);

            console.log('✅ Conectado com sucesso!');
            console.log('📊 Status do dispositivo:', deviceStatus);

            return true;
        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            setConnectionError(error instanceof Error ? error.message : 'Erro desconhecido');
            return false;
        } finally {
            setIsConnecting(false);
        }
    };

    // Desconectar do dispositivo
    const disconnectDevice = () => {
        setIsConnected(false);
        setSelectedESP32Device(null);
        setDevice(null); // Limpar dados do dispositivo
        console.log('🔌 Dispositivo desconectado');
    };

    // Atualizar status do dispositivo conectado
    const refreshDeviceStatus = async (): Promise<void> => {
        if (!selectedESP32Device || !isConnected) {
            return;
        }

        try {
            const deviceStatus = await esp32Service.getDeviceStatus(selectedESP32Device.ip);

            if (deviceStatus) {
                const convertedDevice = convertESP32ToDeviceData(deviceStatus, selectedESP32Device);
                setDevice(convertedDevice);
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar status:', error);
            // Em caso de erro, considerar dispositivo desconectado
            setConnectionError('Dispositivo desconectado');
            setIsConnected(false);
        }
    };

    // Auto-refresh do status a cada 10 segundos quando conectado
    useEffect(() => {
        if (!isConnected || !selectedESP32Device) {
            return;
        }

        const interval = setInterval(refreshDeviceStatus, 10000);
        return () => clearInterval(interval);
    }, [isConnected, selectedESP32Device]);

    // Escanear automaticamente ao iniciar
    useEffect(() => {
        scanForDevices();
    }, []);

    const value: DeviceContextType = {
        device,
        availableDevices,
        isScanning,
        isConnecting,
        isConnected,
        connectionError,
        scanForDevices,
        connectToDevice,
        disconnectDevice,
        refreshDeviceStatus,
        selectedESP32Device,
    };

    return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice() {
    const context = useContext(DeviceContext);
    if (context === undefined) {
        throw new Error('useDevice deve ser usado dentro de um DeviceProvider');
    }
    return context;
}
