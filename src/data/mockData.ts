export interface DeviceData {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'connecting' | 'connected';
    batteryLevel: number;
    signalStrength: number;
    lastActivity: string;
}

export interface SeizureEvent {
    id: string;
    timestamp: string;
    duration: number; // em segundos
    severity: 'low' | 'medium' | 'high';
    brainWaveData: number[];
}

export interface PatientData {
    id: string;
    name: string;
    age: number;
    emergencyContact: {
        name: string;
        phone: string;
    };
}

export interface LoginCredentials {
    email: string;
    password: string;
}

// Dados fictícios do usuário
export const DEFAULT_USER = {
    id: '001',
    email: 'usuario@seizuredetector.com',
    name: 'João Silva',
    role: 'Usuário',
};

// Credenciais de login padrão
export const DEFAULT_CREDENTIALS: LoginCredentials = {
    email: 'usuario@seizuredetector.com',
    password: '123456',
};

// Dados fictícios do dispositivo
export const mockDevice: DeviceData = {
    id: 'SD_001',
    name: 'Seizure Detector v2.1',
    status: 'active', // Pode ser 'active', 'inactive', 'connecting', 'connected'
    batteryLevel: 87,
    signalStrength: 95,
    lastActivity: '2024-01-15T10:30:00Z',
};

// Dados fictícios do paciente
export const mockPatient: PatientData = {
    id: 'P001',
    name: 'Maria Santos',
    age: 28,
    emergencyContact: {
        name: 'Carlos Santos',
        phone: '+55 11 99999-9999',
    },
};

// Eventos de crise fictícios
export const mockSeizureEvents: SeizureEvent[] = [
    {
        id: 'SE001',
        timestamp: '2024-01-15T08:15:30Z',
        duration: 45,
        severity: 'medium',
        brainWaveData: [0.2, 0.8, 1.5, 2.1, 1.8, 0.9, 0.3],
    },
    {
        id: 'SE002',
        timestamp: '2024-01-14T14:22:15Z',
        duration: 23,
        severity: 'low',
        brainWaveData: [0.1, 0.4, 0.7, 1.2, 0.8, 0.5, 0.2],
    },
    {
        id: 'SE003',
        timestamp: '2024-01-13T19:45:10Z',
        duration: 78,
        severity: 'high',
        brainWaveData: [0.5, 1.2, 2.8, 3.5, 2.9, 1.7, 0.8],
    },
];

// Função para simular mudança de status do dispositivo
export const updateDeviceStatus = (newStatus: DeviceData['status']): DeviceData => {
    return {
        ...mockDevice,
        status: newStatus,
        lastActivity: new Date().toISOString(),
    };
};

// Função para validar credenciais de login
export const validateLogin = (email: string, password: string): boolean => {
    return email === DEFAULT_CREDENTIALS.email && password === DEFAULT_CREDENTIALS.password;
};
