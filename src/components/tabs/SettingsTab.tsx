import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    DEFAULT_USER,
    mockEmergencyContacts,
    mockUserSettings,
    EmergencyContact,
    UserSettings,
} from '../../data/mockData';
import ContactModal from '../../components/ui/ContactModal';

interface SettingsTabProps {
    onLogout: () => void;
}

export default function SettingsTab({ onLogout }: SettingsTabProps) {
    const [settings, setSettings] = useState<UserSettings>(mockUserSettings);
    const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(mockEmergencyContacts);
    const [contactModalVisible, setContactModalVisible] = useState(false);
    const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        relationship: '',
    });

    const updateSetting = (category: keyof UserSettings, setting: string, value: boolean) => {
        setSettings((prev) => ({
            ...prev,
            [category]: {
                ...prev[category],
                [setting]: value,
            },
        }));
    };

    const handleChangePassword = () => {
        Alert.alert('Alterar Senha', 'Esta funcionalidade estará disponível em breve.', [{ text: 'OK' }]);
    };

    const handleAddContact = () => {
        setEditingContact(null);
        setNewContact({ name: '', phone: '', relationship: '' });
        setContactModalVisible(true);
    };

    const handleEditContact = (contact: EmergencyContact) => {
        setEditingContact(contact);
        setNewContact({
            name: contact.name,
            phone: contact.phone,
            relationship: contact.relationship,
        });
        setContactModalVisible(true);
    };

    const handleSaveContact = () => {
        if (!newContact.name.trim() || !newContact.phone.trim()) {
            Alert.alert('Erro', 'Por favor, preencha nome e telefone.');
            return;
        }

        if (editingContact) {
            // Editando contato existente
            setEmergencyContacts((prev) =>
                prev.map((contact) => (contact.id === editingContact.id ? { ...contact, ...newContact } : contact)),
            );
        } else {
            // Adicionando novo contato
            const newContactData: EmergencyContact = {
                id: `EC${Date.now()}`,
                ...newContact,
                isPrimary: emergencyContacts.length === 0,
            };
            setEmergencyContacts((prev) => [...prev, newContactData]);
        }

        setContactModalVisible(false);
        setNewContact({ name: '', phone: '', relationship: '' });
    };

    const handleDeleteContact = (contactId: string) => {
        Alert.alert('Remover Contato', 'Tem certeza que deseja remover este contato de emergência?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover',
                style: 'destructive',
                onPress: () => {
                    setEmergencyContacts((prev) => prev.filter((c) => c.id !== contactId));
                },
            },
        ]);
    };

    const togglePrimaryContact = (contactId: string) => {
        setEmergencyContacts((prev) =>
            prev.map((contact) => ({
                ...contact,
                isPrimary: contact.id === contactId,
            })),
        );
    };

    const renderAccountSection = () => (
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Informações da Conta</Text>

            <View className="space-y-4">
                <View className="flex-row items-center">
                    <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">
                        <Ionicons name="person" size={24} color="#3b82f6" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-gray-800 font-semibold">{DEFAULT_USER.name}</Text>
                        <Text className="text-gray-500 text-sm">{DEFAULT_USER.email}</Text>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="create-outline" size={20} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                <View className="border-t border-gray-200 pt-4">
                    <TouchableOpacity
                        onPress={handleChangePassword}
                        className="flex-row items-center justify-between py-3"
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="lock-closed" size={20} color="#6b7280" />
                            <Text className="text-gray-700 ml-3">Alterar senha</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderEmergencyContactsSection = () => (
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-gray-800">Contatos de Emergência</Text>
                <TouchableOpacity
                    onPress={handleAddContact}
                    className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center"
                >
                    <Ionicons name="add" size={20} color="#3b82f6" />
                </TouchableOpacity>
            </View>

            <View className="space-y-3">
                {emergencyContacts.map((contact) => (
                    <View key={contact.id} className="border border-gray-200 rounded-lg p-4">
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-row items-center flex-1">
                                <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3">
                                    <Ionicons name="call" size={18} color="#ef4444" />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center">
                                        <Text className="text-gray-800 font-semibold">{contact.name}</Text>
                                        {contact.isPrimary && (
                                            <View className="ml-2 px-2 py-1 bg-blue-100 rounded-full">
                                                <Text className="text-blue-600 text-xs font-medium">Principal</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text className="text-gray-500 text-sm">{contact.phone}</Text>
                                    <Text className="text-gray-400 text-xs">{contact.relationship}</Text>
                                </View>
                            </View>

                            <View className="flex-row">
                                <TouchableOpacity onPress={() => handleEditContact(contact)} className="p-2">
                                    <Ionicons name="create-outline" size={16} color="#6b7280" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteContact(contact.id)} className="p-2">
                                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {!contact.isPrimary && (
                            <TouchableOpacity
                                onPress={() => togglePrimaryContact(contact.id)}
                                className="mt-2 px-3 py-1 bg-gray-100 rounded-md self-start"
                            >
                                <Text className="text-gray-600 text-xs">Definir como principal</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );

    const renderNotificationsSection = () => (
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Notificações</Text>

            <View className="space-y-4">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <Ionicons name="notifications" size={20} color="#6b7280" />
                        <View className="ml-3">
                            <Text className="text-gray-700 font-medium">Push Notifications</Text>
                            <Text className="text-gray-500 text-sm">Receber notificações no dispositivo</Text>
                        </View>
                    </View>
                    <Switch
                        value={settings.notifications.pushEnabled}
                        onValueChange={(value) => updateSetting('notifications', 'pushEnabled', value)}
                        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                        thumbColor={settings.notifications.pushEnabled ? '#3b82f6' : '#9ca3af'}
                    />
                </View>

                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <Ionicons name="mail" size={20} color="#6b7280" />
                        <View className="ml-3">
                            <Text className="text-gray-700 font-medium">Email</Text>
                            <Text className="text-gray-500 text-sm">Receber notificações por email</Text>
                        </View>
                    </View>
                    <Switch
                        value={settings.notifications.emailEnabled}
                        onValueChange={(value) => updateSetting('notifications', 'emailEnabled', value)}
                        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                        thumbColor={settings.notifications.emailEnabled ? '#3b82f6' : '#9ca3af'}
                    />
                </View>

                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <Ionicons name="chatbubble" size={20} color="#6b7280" />
                        <View className="ml-3">
                            <Text className="text-gray-700 font-medium">SMS</Text>
                            <Text className="text-gray-500 text-sm">Receber notificações por SMS</Text>
                        </View>
                    </View>
                    <Switch
                        value={settings.notifications.smsEnabled}
                        onValueChange={(value) => updateSetting('notifications', 'smsEnabled', value)}
                        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                        thumbColor={settings.notifications.smsEnabled ? '#3b82f6' : '#9ca3af'}
                    />
                </View>

                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <Ionicons name="warning" size={20} color="#ef4444" />
                        <View className="ml-3">
                            <Text className="text-gray-700 font-medium">Alertas de Emergência</Text>
                            <Text className="text-gray-500 text-sm">Notificações críticas sempre ativas</Text>
                        </View>
                    </View>
                    <Switch
                        value={settings.notifications.emergencyAlerts}
                        onValueChange={(value) => updateSetting('notifications', 'emergencyAlerts', value)}
                        trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
                        thumbColor={settings.notifications.emergencyAlerts ? '#ef4444' : '#9ca3af'}
                    />
                </View>
            </View>
        </View>
    );

    const renderDeviceSection = () => (
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Configurações do Dispositivo</Text>

            <View className="space-y-4">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <Ionicons name="sync" size={20} color="#6b7280" />
                        <View className="ml-3">
                            <Text className="text-gray-700 font-medium">Sincronização Automática</Text>
                            <Text className="text-gray-500 text-sm">Sincronizar dados automaticamente</Text>
                        </View>
                    </View>
                    <Switch
                        value={settings.device.autoSync}
                        onValueChange={(value) => updateSetting('device', 'autoSync', value)}
                        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                        thumbColor={settings.device.autoSync ? '#3b82f6' : '#9ca3af'}
                    />
                </View>

                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <Ionicons name="battery-charging" size={20} color="#6b7280" />
                        <View className="ml-3">
                            <Text className="text-gray-700 font-medium">Alertas de Bateria</Text>
                            <Text className="text-gray-500 text-sm">Notificar quando bateria estiver baixa</Text>
                        </View>
                    </View>
                    <Switch
                        value={settings.device.batteryAlerts}
                        onValueChange={(value) => updateSetting('device', 'batteryAlerts', value)}
                        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                        thumbColor={settings.device.batteryAlerts ? '#3b82f6' : '#9ca3af'}
                    />
                </View>

                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                        <Ionicons name="wifi" size={20} color="#6b7280" />
                        <View className="ml-3">
                            <Text className="text-gray-700 font-medium">Alertas de Conexão</Text>
                            <Text className="text-gray-500 text-sm">Notificar problemas de conexão</Text>
                        </View>
                    </View>
                    <Switch
                        value={settings.device.connectionAlerts}
                        onValueChange={(value) => updateSetting('device', 'connectionAlerts', value)}
                        trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                        thumbColor={settings.device.connectionAlerts ? '#3b82f6' : '#9ca3af'}
                    />
                </View>
            </View>
        </View>
    );

    const renderActionsSection = () => (
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Ações</Text>

            <View className="space-y-3">
                <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-100">
                    <View className="flex-row items-center">
                        <Ionicons name="help-circle" size={20} color="#6b7280" />
                        <Text className="text-gray-700 ml-3">Ajuda e Suporte</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                </TouchableOpacity>

                <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-100">
                    <View className="flex-row items-center">
                        <Ionicons name="document-text" size={20} color="#6b7280" />
                        <Text className="text-gray-700 ml-3">Termos de Uso</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                </TouchableOpacity>

                <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-100">
                    <View className="flex-row items-center">
                        <Ionicons name="shield-checkmark" size={20} color="#6b7280" />
                        <Text className="text-gray-700 ml-3">Política de Privacidade</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                </TouchableOpacity>

                <TouchableOpacity onPress={onLogout} className="flex-row items-center justify-between py-3">
                    <View className="flex-row items-center">
                        <Ionicons name="log-out" size={20} color="#ef4444" />
                        <Text className="text-red-600 ml-3 font-medium">Sair da Conta</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-blue-600 pt-12 pb-6 px-6">
                <Text className="text-white text-2xl font-bold">Configurações</Text>
                <Text className="text-white/80 text-sm mt-1">Gerencie suas preferências e conta</Text>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
                {renderAccountSection()}
                {renderEmergencyContactsSection()}
                {renderNotificationsSection()}
                {renderDeviceSection()}
                {renderActionsSection()}
            </ScrollView>

            {/* Modal de Contato */}
            <ContactModal
                visible={contactModalVisible}
                onClose={() => setContactModalVisible(false)}
                onSave={handleSaveContact}
                editingContact={editingContact}
                newContact={newContact}
                setNewContact={setNewContact}
            />
        </View>
    );
}
