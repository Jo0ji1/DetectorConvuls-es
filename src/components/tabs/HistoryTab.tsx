import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    mockSleepHistory,
    mockHistoryStats,
    getQualityColor,
    getQualityLabel,
    getQualityIcon,
    SleepQualityEvent,
} from '../../data/mockData';

const { width } = Dimensions.get('window');

export default function HistoryTab() {
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');
    const [selectedEvent, setSelectedEvent] = useState<SleepQualityEvent | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const filterDataByPeriod = () => {
        const now = new Date();
        const data = [...mockSleepHistory];

        switch (selectedPeriod) {
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return data.filter((event) => new Date(event.date) >= weekAgo);
            case 'month':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return data.filter((event) => new Date(event.date) >= monthAgo);
            default:
                return data;
        }
    };

    const getQualityStats = () => {
        const data = filterDataByPeriod();
        const stats = {
            crisis: data.filter((e) => e.quality === 'crisis').length,
            restless: data.filter((e) => e.quality === 'restless').length,
            normal: data.filter((e) => e.quality === 'normal').length,
            peaceful: data.filter((e) => e.quality === 'peaceful').length,
        };
        return stats;
    };

    const getTrendIcon = () => {
        switch (mockHistoryStats.lastWeekTrend) {
            case 'improving':
                return { icon: 'trending-up', color: '#10b981' };
            case 'declining':
                return { icon: 'trending-down', color: '#ef4444' };
            default:
                return { icon: 'remove', color: '#6b7280' };
        }
    };

    const openEventDetails = (event: SleepQualityEvent) => {
        setSelectedEvent(event);
        setModalVisible(true);
    };

    const getPeriodLabel = () => {
        switch (selectedPeriod) {
            case 'week':
                return 'últimos 7 dias';
            case 'month':
                return 'últimos 30 dias';
            default:
                return 'todo o período';
        }
    };

    const renderChart = () => {
        const data = filterDataByPeriod().slice(0, 7).reverse();

        return (
            <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                <Text className="text-lg font-bold text-gray-800 mb-4">Gráfico de Movimento</Text>

                {data.length === 0 ? (
                    <View className="items-center py-12">
                        <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
                            <Ionicons name="bar-chart-outline" size={32} color="#9ca3af" />
                        </View>
                        <Text className="text-gray-500 font-medium text-center">Nenhum dado encontrado</Text>
                        <Text className="text-gray-400 text-sm text-center mt-1">
                            Não há registros de movimento para {getPeriodLabel()}
                        </Text>
                    </View>
                ) : (
                    <>
                        <View className="flex-row items-end justify-between h-32 mb-4">
                            {data.map((event, index) => {
                                const maxMovements = Math.max(...data.map((d) => d.movements));
                                const height = (event.movements / maxMovements) * 100;
                                const color = getQualityColor(event.quality);

                                return (
                                    <TouchableOpacity
                                        key={event.id}
                                        onPress={() => openEventDetails(event)}
                                        className="flex-1 items-center"
                                    >
                                        <View
                                            className="w-6 rounded-t-md"
                                            style={{
                                                height: `${Math.max(height, 10)}%`,
                                                backgroundColor: color,
                                                minHeight: 8,
                                            }}
                                        />
                                        <Text className="text-xs text-gray-500 mt-2">
                                            {new Date(event.date).getDate()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View className="flex-row justify-between text-xs text-gray-500">
                            <Text>0</Text>
                            <Text>{Math.max(...data.map((d) => d.movements))} movimentos</Text>
                        </View>
                    </>
                )}
            </View>
        );
    };

    const renderLegend = () => {
        const qualities: SleepQualityEvent['quality'][] = ['crisis', 'restless', 'normal', 'peaceful'];

        return (
            <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                <Text className="text-lg font-bold text-gray-800 mb-4">Legenda</Text>
                <View className="space-y-3">
                    {qualities.map((quality) => (
                        <View key={quality} className="flex-row items-center">
                            <View
                                className="w-4 h-4 rounded-full mr-3"
                                style={{ backgroundColor: getQualityColor(quality) }}
                            />
                            <Ionicons
                                name={getQualityIcon(quality) as any}
                                size={16}
                                color={getQualityColor(quality)}
                                style={{ marginRight: 8 }}
                            />
                            <Text className="text-gray-700 flex-1">{getQualityLabel(quality)}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderStats = () => {
        const stats = getQualityStats();
        const total = Object.values(stats).reduce((a, b) => a + b, 0);
        const trend = getTrendIcon();

        return (
            <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-lg font-bold text-gray-800">Estatísticas</Text>
                    {total > 0 && (
                        <View className="flex-row items-center">
                            <Ionicons name={trend.icon as any} size={16} color={trend.color} />
                            <Text className="text-sm text-gray-600 ml-1">
                                {mockHistoryStats.lastWeekTrend === 'improving'
                                    ? 'Melhorando'
                                    : mockHistoryStats.lastWeekTrend === 'declining'
                                    ? 'Piorando'
                                    : 'Estável'}
                            </Text>
                        </View>
                    )}
                </View>

                {total === 0 ? (
                    <View className="items-center py-8">
                        <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
                            <Ionicons name="analytics-outline" size={32} color="#9ca3af" />
                        </View>
                        <Text className="text-gray-500 font-medium text-center">Nenhuma estatística disponível</Text>
                        <Text className="text-gray-400 text-sm text-center mt-1">
                            Não há dados suficientes para {getPeriodLabel()}
                        </Text>
                    </View>
                ) : (
                    <View className="space-y-3">
                        <View className="flex-row justify-between items-center">
                            <Text className="text-gray-600">Total de noites:</Text>
                            <Text className="font-semibold text-gray-800">{total}</Text>
                        </View>

                        {Object.entries(stats).map(([quality, count]) => {
                            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                                <View key={quality} className="flex-row justify-between items-center">
                                    <View className="flex-row items-center flex-1">
                                        <View
                                            className="w-3 h-3 rounded-full mr-2"
                                            style={{ backgroundColor: getQualityColor(quality as any) }}
                                        />
                                        <Text className="text-gray-600">{getQualityLabel(quality as any)}:</Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Text className="font-semibold text-gray-800 mr-2">{count}</Text>
                                        <Text className="text-sm text-gray-500">({percentage}%)</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };

    const renderEventsList = () => {
        const data = filterDataByPeriod();

        return (
            <View className="bg-white rounded-xl p-6 shadow-sm">
                <Text className="text-lg font-bold text-gray-800 mb-4">Histórico Detalhado</Text>

                {data.length === 0 ? (
                    <View className="items-center py-12">
                        <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
                            <Ionicons name="document-text-outline" size={32} color="#9ca3af" />
                        </View>
                        <Text className="text-gray-500 font-medium text-center">Nenhum registro encontrado</Text>
                        <Text className="text-gray-400 text-sm text-center mt-1">
                            Não há eventos registrados para {getPeriodLabel()}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setSelectedPeriod('all')}
                            className="mt-4 px-4 py-2 bg-blue-50 rounded-lg"
                        >
                            <Text className="text-blue-600 font-medium">Ver todos os registros</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="space-y-3">
                        {data.map((event) => (
                            <TouchableOpacity
                                key={event.id}
                                onPress={() => openEventDetails(event)}
                                className="border border-gray-200 rounded-lg p-4"
                            >
                                <View className="flex-row items-center justify-between mb-2">
                                    <View className="flex-row items-center">
                                        <View
                                            className="w-3 h-3 rounded-full mr-3"
                                            style={{ backgroundColor: getQualityColor(event.quality) }}
                                        />
                                        <Text className="font-medium text-gray-800">
                                            {new Date(event.date).toLocaleDateString('pt-BR')}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                                </View>

                                <Text className="text-sm text-gray-600 mb-2">{getQualityLabel(event.quality)}</Text>

                                <View className="flex-row justify-between">
                                    <Text className="text-xs text-gray-500">Duração: {event.duration}h</Text>
                                    <Text className="text-xs text-gray-500">Movimentos: {event.movements}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-blue-600 pt-12 pb-6 px-6">
                <Text className="text-white text-2xl font-bold mb-4">Histórico de Sono</Text>

                {/* Seletor de Período */}
                <View className="flex-row bg-white/10 rounded-lg p-1">
                    {(['week', 'month', 'all'] as const).map((period) => (
                        <TouchableOpacity
                            key={period}
                            onPress={() => setSelectedPeriod(period)}
                            className={`flex-1 py-2 px-4 rounded-md ${selectedPeriod === period ? 'bg-white/20' : ''}`}
                        >
                            <Text className="text-white text-center font-medium">
                                {period === 'week' ? '7 dias' : period === 'month' ? '30 dias' : 'Tudo'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
                {renderChart()}
                {renderStats()}
                {renderLegend()}
                {renderEventsList()}
            </ScrollView>

            {/* Modal de Detalhes */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end">
                    <View className="bg-black/50 flex-1" />
                    <View className="bg-white rounded-t-3xl p-6">
                        {selectedEvent && (
                            <>
                                <View className="flex-row items-center justify-between mb-6">
                                    <Text className="text-xl font-bold text-gray-800">
                                        {new Date(selectedEvent.date).toLocaleDateString('pt-BR', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </Text>
                                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                                        <Ionicons name="close" size={24} color="#6b7280" />
                                    </TouchableOpacity>
                                </View>

                                <View className="space-y-4">
                                    <View className="flex-row items-center">
                                        <View
                                            className="w-4 h-4 rounded-full mr-3"
                                            style={{ backgroundColor: getQualityColor(selectedEvent.quality) }}
                                        />
                                        <Text className="text-lg font-semibold text-gray-800">
                                            {getQualityLabel(selectedEvent.quality)}
                                        </Text>
                                    </View>

                                    <View className="bg-gray-50 rounded-lg p-4 space-y-3">
                                        <View className="flex-row justify-between">
                                            <Text className="text-gray-600">Duração do sono:</Text>
                                            <Text className="font-medium">{selectedEvent.duration}h</Text>
                                        </View>
                                        <View className="flex-row justify-between">
                                            <Text className="text-gray-600">Movimentos detectados:</Text>
                                            <Text className="font-medium">{selectedEvent.movements}</Text>
                                        </View>
                                        <View className="flex-row justify-between">
                                            <Text className="text-gray-600">Sono profundo:</Text>
                                            <Text className="font-medium">{selectedEvent.deepSleepHours}h</Text>
                                        </View>
                                        <View className="flex-row justify-between">
                                            <Text className="text-gray-600">Sono REM:</Text>
                                            <Text className="font-medium">{selectedEvent.remSleepHours}h</Text>
                                        </View>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
