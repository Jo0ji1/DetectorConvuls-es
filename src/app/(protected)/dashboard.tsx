import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useDevice } from '../../contexts/DeviceContext';
import { router } from 'expo-router';
import HomeTab from '../../components/tabs/HomeTab';
import HistoryTab from '../../components/tabs/HistoryTab';
import '../../../global.css';

export default function DashboardScreen() {
    const { user, logout } = useAuth();
    const { device, disconnectDevice } = useDevice();
    const [activeTab, setActiveTab] = useState<'home' | 'history' | 'settings'>('home');

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

    const renderTabContent = () => {
        switch (activeTab) {
            case 'home':
                return <HomeTab onLogout={handleLogout} />;
            case 'history':
                return <HistoryTab />;
            case 'settings':
                return (
                    <View className="flex-1 justify-center items-center bg-gray-50">
                        <Text className="text-gray-600">Configurações - Em desenvolvimento</Text>
                    </View>
                );
            default:
                return null;
        }
    };

    const getTabIcon = (tab: string) => {
        switch (tab) {
            case 'home':
                return 'home';
            case 'history':
                return 'analytics';
            case 'settings':
                return 'settings';
            default:
                return 'home';
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Content */}
            <View className="flex-1">{renderTabContent()}</View>

            {/* Bottom Navigation */}
            <View className="bg-white border-t border-gray-200 px-6 py-3 pb-6">
                <View className="flex-row justify-around items-center">
                    {(['home', 'history', 'settings'] as const).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            className={`flex-1 items-center py-2 ${activeTab === tab ? 'opacity-100' : 'opacity-50'}`}
                        >
                            <View
                                className={`w-10 h-10 rounded-full items-center justify-center ${
                                    activeTab === tab ? 'bg-blue-100' : 'bg-transparent'
                                }`}
                            >
                                <Ionicons
                                    name={getTabIcon(tab) as any}
                                    size={24}
                                    color={activeTab === tab ? '#3b82f6' : '#6b7280'}
                                />
                            </View>
                            <Text
                                className={`text-xs mt-1 font-medium ${
                                    activeTab === tab ? 'text-blue-600' : 'text-gray-500'
                                }`}
                            >
                                {tab === 'home' ? 'Home' : tab === 'history' ? 'Histórico' : 'Configurações'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
}
