import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { mockEmergencyContacts, EmergencyContact } from '../../data/mockData';
import ContactModal from '../../components/ui/ContactModal';

interface SettingsTabProps {
    onDisconnect: () => void;
}

export default function SettingsTab({ onDisconnect }: SettingsTabProps) {
    const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(mockEmergencyContacts);
    const [contactModalVisible, setContactModalVisible] = useState(false);
    const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        relationship: '',
    });

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

    const handleAbout = () => {
        Alert.alert(
            'Sobre o Seizure Detector',
            'Aplicativo desenvolvido para monitoramento de crises epilépticas.\n\nVersão: 1.0.0\nDesenvolvido para fins acadêmicos.',
            [{ text: 'OK' }],
        );
    };

    const renderEmergencyContactsSection = () => (
        <View className="mb-8">
            {/* Título da Seção */}
            <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 bg-red-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="call" size={16} color="#ef4444" />
                </View>
                <Text className="text-2xl font-bold text-gray-800">Contatos de Emergência</Text>
            </View>

            {/* Card com View Branca */}
            <View className="bg-white rounded-2xl p-6 shadow-sm">
                <View className="flex-row items-center justify-between mb-6">
                    <Text className="text-lg font-bold text-gray-800">Gerenciar Contatos</Text>
                    <TouchableOpacity
                        onPress={handleAddContact}
                        className="w-10 h-10 rounded-full bg-red-100 items-center justify-center"
                    >
                        <Ionicons name="add" size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                <View className="mb-4">
                    {emergencyContacts.map((contact, index) => (
                        <View
                            key={contact.id}
                            className={`border border-gray-200 rounded-lg p-4 ${index > 0 ? 'mt-3' : ''}`}
                        >
                            <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center flex-1">
                                    <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-3">
                                        <Ionicons name="person" size={18} color="#ef4444" />
                                    </View>
                                    <View className="flex-1">
                                        <View className="flex-row items-center">
                                            <Text className="text-gray-800 font-semibold">{contact.name}</Text>
                                            {contact.isPrimary && (
                                                <View className="ml-2 px-2 py-1 bg-red-100 rounded-full">
                                                    <Text className="text-red-600 text-xs font-medium">Principal</Text>
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

                    {emergencyContacts.length === 0 && (
                        <View className="items-center py-8">
                            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                                <Ionicons name="person-add" size={32} color="#6b7280" />
                            </View>
                            <Text className="text-gray-500 text-center">
                                Nenhum contato de emergência configurado.{'\n'}Toque no + para adicionar um contato.
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    const renderDeviceInfoSection = () => (
        <View className="mb-8">
            {/* Título da Seção */}
            <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="hardware-chip" size={16} color="#3b82f6" />
                </View>
                <Text className="text-2xl font-bold text-gray-800">Informações do Dispositivo</Text>
            </View>

            {/* Card com View Branca */}
            <View className="bg-white rounded-2xl p-6 shadow-sm">
                <View className="mb-4">
                    <View className="flex-row items-center mb-4">
                        <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-4">
                            <Ionicons name="hardware-chip" size={24} color="#3b82f6" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-800 font-semibold text-lg">ESP32 Seizure Detector</Text>
                            <Text className="text-gray-500 text-sm">Dispositivo de monitoramento</Text>
                        </View>
                    </View>

                    <View className="border-t border-gray-200 pt-4">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-gray-600">Modelo:</Text>
                            <Text className="text-gray-800 font-medium">ESP32-WROOM-32</Text>
                        </View>
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-gray-600">Firmware:</Text>
                            <Text className="text-gray-800 font-medium">v2.1.0</Text>
                        </View>
                        <View className="flex-row justify-between items-center">
                            <Text className="text-gray-600">Protocolo:</Text>
                            <Text className="text-gray-800 font-medium">WiFi + HTTP</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderActionsSection = () => (
        <View className="mb-6">
            {/* Título da Seção */}
            <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="settings" size={16} color="#6b7280" />
                </View>
                <Text className="text-2xl font-bold text-gray-800">Configurações</Text>
            </View>

            {/* Card com View Branca */}
            <View className="bg-white rounded-2xl p-6 shadow-sm">
                <View className="mb-4">
                    <TouchableOpacity
                        onPress={handleAbout}
                        className="flex-row items-center justify-between py-4 border-b border-gray-100"
                    >
                        <View className="flex-row items-center">
                            <Ionicons name="information-circle" size={20} color="#6b7280" />
                            <Text className="text-gray-700 ml-3">Sobre o Aplicativo</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onDisconnect} className="flex-row items-center justify-between py-4">
                        <View className="flex-row items-center">
                            <Ionicons name="power" size={20} color="#ef4444" />
                            <Text className="text-red-600 ml-3 font-medium">Desconectar Dispositivo</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <LinearGradient
                colors={['#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="pt-16 pb-8 px-6"
            >
                <Text className="text-white text-2xl font-bold">Configurações</Text>
                <Text className="text-white/80 text-sm mt-1">Gerencie contatos e preferências</Text>
            </LinearGradient>

            {/* Content */}
            <ScrollView className="flex-1 px-6 py-6">
                {renderEmergencyContactsSection()}
                {renderDeviceInfoSection()}
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
