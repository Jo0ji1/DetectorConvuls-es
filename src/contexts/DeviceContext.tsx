import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeviceData, mockDevice, updateDeviceStatus } from '../data/mockData';

interface DeviceContextType {
    device: DeviceData;
    isConnecting: boolean;
    isConnected: boolean;
    connectToDevice: () => Promise<boolean>;
    disconnectDevice: () => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: React.ReactNode }) {
    const [device, setDevice] = useState<DeviceData>(mockDevice);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const connectToDevice = async (): Promise<boolean> => {
        try {
            setIsConnecting(true);

            // Simular processo de conexão
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Verificar se o dispositivo está ativo
            if (device.status === 'active') {
                const connectedDevice = updateDeviceStatus('connected');
                setDevice(connectedDevice);
                setIsConnected(true);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Erro ao conectar com o dispositivo:', error);
            return false;
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectDevice = () => {
        const disconnectedDevice = updateDeviceStatus('active');
        setDevice(disconnectedDevice);
        setIsConnected(false);
    };

    const value: DeviceContextType = {
        device,
        isConnecting,
        isConnected,
        connectToDevice,
        disconnectDevice,
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
