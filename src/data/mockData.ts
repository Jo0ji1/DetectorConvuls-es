export interface SeizureEvent {
    id: string;
    timestamp: string;
    duration: number; // em segundos
    severity: 'low' | 'medium' | 'high';
    brainWaveData: number[];
}

export interface SleepQualityEvent {
    id: string;
    date: string;
    quality: 'crisis' | 'restless' | 'normal' | 'peaceful';
    duration: number; // em horas
    movements: number;
    deepSleepHours: number;
    remSleepHours: number;
}

export interface HistoryStats {
    totalNights: number;
    crisisNights: number;
    averageSleepQuality: number;
    lastWeekTrend: 'improving' | 'stable' | 'declining';
}

export interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship: string;
    isPrimary: boolean;
}

// ===== DADOS CENTRALIZADOS =====

// Contatos de emergência
export const mockEmergencyContacts: EmergencyContact[] = [
    {
        id: 'EC001',
        name: 'Carlos Santos',
        phone: '+55 11 99999-9999',
        relationship: 'Cônjuge',
        isPrimary: true,
    },
    {
        id: 'EC002',
        name: 'Maria Silva',
        phone: '+55 11 88888-8888',
        relationship: 'Mãe',
        isPrimary: false,
    },
    {
        id: 'EC003',
        name: 'Dr. Roberto',
        phone: '+55 11 77777-7777',
        relationship: 'Médico',
        isPrimary: false,
    },
];

// Eventos de crise fictícios (apenas para o histórico)
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

// Dados históricos de qualidade do sono
export const mockSleepHistory: SleepQualityEvent[] = [
    {
        id: 'SH001',
        date: '2024-01-15',
        quality: 'crisis',
        duration: 6.5,
        movements: 45,
        deepSleepHours: 1.2,
        remSleepHours: 1.8,
    },
    {
        id: 'SH002',
        date: '2024-01-14',
        quality: 'restless',
        duration: 7.2,
        movements: 28,
        deepSleepHours: 2.1,
        remSleepHours: 2.3,
    },
    {
        id: 'SH003',
        date: '2024-01-13',
        quality: 'normal',
        duration: 8.1,
        movements: 15,
        deepSleepHours: 2.8,
        remSleepHours: 2.9,
    },
    {
        id: 'SH004',
        date: '2024-01-12',
        quality: 'peaceful',
        duration: 8.5,
        movements: 8,
        deepSleepHours: 3.2,
        remSleepHours: 3.1,
    },
    {
        id: 'SH005',
        date: '2024-01-11',
        quality: 'normal',
        duration: 7.8,
        movements: 12,
        deepSleepHours: 2.9,
        remSleepHours: 2.7,
    },
    {
        id: 'SH006',
        date: '2024-01-10',
        quality: 'restless',
        duration: 6.8,
        movements: 32,
        deepSleepHours: 1.8,
        remSleepHours: 2.1,
    },
    {
        id: 'SH007',
        date: '2024-01-09',
        quality: 'peaceful',
        duration: 8.3,
        movements: 6,
        deepSleepHours: 3.4,
        remSleepHours: 3.0,
    },
    {
        id: 'SH008',
        date: '2024-01-08',
        quality: 'normal',
        duration: 7.9,
        movements: 14,
        deepSleepHours: 2.7,
        remSleepHours: 2.8,
    },
    {
        id: 'SH009',
        date: '2024-01-07',
        quality: 'crisis',
        duration: 5.2,
        movements: 52,
        deepSleepHours: 0.8,
        remSleepHours: 1.2,
    },
    {
        id: 'SH010',
        date: '2024-01-06',
        quality: 'restless',
        duration: 7.1,
        movements: 25,
        deepSleepHours: 2.0,
        remSleepHours: 2.4,
    },
];

// Estatísticas históricas
export const mockHistoryStats: HistoryStats = {
    totalNights: 30,
    crisisNights: 3,
    averageSleepQuality: 3.2,
    lastWeekTrend: 'improving',
};

// ===== FUNÇÕES UTILITÁRIAS =====

// Obter contato primário de emergência
export const getPrimaryEmergencyContact = (): EmergencyContact | null => {
    return mockEmergencyContacts.find((contact) => contact.isPrimary) || null;
};

// Obter contatos para exibição na Home (primário + emergência)
export const getEmergencyContactsForDisplay = () => {
    const primary = getPrimaryEmergencyContact();
    return [
        ...(primary
            ? [
                  {
                      id: primary.id,
                      name: primary.name,
                      phone: primary.phone,
                      relationship: primary.relationship,
                  },
              ]
            : []),
        {
            id: 'emergency',
            name: 'SAMU',
            phone: '192',
            relationship: 'Emergência',
        },
    ];
};

// Funções utilitárias para histórico
export const getQualityColor = (quality: SleepQualityEvent['quality']) => {
    switch (quality) {
        case 'crisis':
            return '#ef4444';
        case 'restless':
            return '#f59e0b';
        case 'normal':
            return '#10b981';
        case 'peaceful':
            return '#3b82f6';
        default:
            return '#6b7280';
    }
};

export const getQualityLabel = (quality: SleepQualityEvent['quality']) => {
    switch (quality) {
        case 'crisis':
            return 'Crise Detectada';
        case 'restless':
            return 'Noite Agitada';
        case 'normal':
            return 'Noite Normal';
        case 'peaceful':
            return 'Noite Tranquila';
        default:
            return 'Desconhecido';
    }
};

export const getQualityIcon = (quality: SleepQualityEvent['quality']) => {
    switch (quality) {
        case 'crisis':
            return 'warning';
        case 'restless':
            return 'alert-circle';
        case 'normal':
            return 'checkmark-circle';
        case 'peaceful':
            return 'heart';
        default:
            return 'help-circle';
    }
};
