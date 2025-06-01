import React from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmergencyContact } from '../../data/mockData';

interface ContactModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: () => void;
    editingContact: EmergencyContact | null;
    newContact: {
        name: string;
        phone: string;
        relationship: string;
    };
    setNewContact: React.Dispatch<
        React.SetStateAction<{
            name: string;
            phone: string;
            relationship: string;
        }>
    >;
}

const ContactModal: React.FC<ContactModalProps> = ({
    visible,
    onClose,
    onSave,
    editingContact,
    newContact,
    setNewContact,
}) => {
    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View className="flex-1 justify-end">
                <View className="bg-black/50 flex-1" />
                <View className="bg-white rounded-t-3xl p-6">
                    <View className="flex-row items-center justify-between mb-6">
                        <Text className="text-xl font-bold text-gray-800">
                            {editingContact ? 'Editar Contato' : 'Novo Contato'}
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <View className="space-y-4">
                        <View>
                            <Text className="text-gray-700 font-medium mb-2">Nome</Text>
                            <TextInput
                                value={newContact.name}
                                onChangeText={(text) => setNewContact((prev) => ({ ...prev, name: text }))}
                                placeholder="Digite o nome"
                                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                            />
                        </View>

                        <View>
                            <Text className="text-gray-700 font-medium mb-2">Telefone</Text>
                            <TextInput
                                value={newContact.phone}
                                onChangeText={(text) => setNewContact((prev) => ({ ...prev, phone: text }))}
                                placeholder="+55 11 99999-9999"
                                keyboardType="phone-pad"
                                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                            />
                        </View>

                        <View>
                            <Text className="text-gray-700 font-medium mb-2">Relacionamento</Text>
                            <TextInput
                                value={newContact.relationship}
                                onChangeText={(text) => setNewContact((prev) => ({ ...prev, relationship: text }))}
                                placeholder="Ex: Cônjuge, Mãe, Médico"
                                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                            />
                        </View>

                        <TouchableOpacity onPress={onSave} className="bg-blue-600 rounded-lg py-4 mt-6">
                            <Text className="text-white font-semibold text-center">
                                {editingContact ? 'Salvar Alterações' : 'Adicionar Contato'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default ContactModal;
