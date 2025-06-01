import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { router } from 'expo-router';
import { PulseAnimation } from '../components/ui/PulseAnimation';
import { DEFAULT_CREDENTIALS } from '../data/mockData';
import '@/global.css';

export default function LoginScreen() {
    const { login, isLoading, isAuthenticated } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);

    // Redirect se já estiver autenticado
    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/(protected)/device-connection');
        }
    }, [isAuthenticated]);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos.');
            return;
        }

        setIsLoginLoading(true);

        try {
            const success = await login(email, password);

            if (success) {
                router.replace('/(protected)/device-connection');
            } else {
                Alert.alert(
                    'Erro de Autenticação',
                    'Email ou senha incorretos. Verifique suas credenciais e tente novamente.',
                    [{ text: 'OK' }],
                );
            }
        } catch (error) {
            Alert.alert('Erro', 'Ocorreu um erro durante o login. Tente novamente.');
        } finally {
            setIsLoginLoading(false);
        }
    };

    const handleForgotPassword = () => {
        Alert.alert('Funcionalidade em Desenvolvimento', 'A recuperação de senha estará disponível em breve.', [
            { text: 'OK' },
        ]);
    };

    const handleSignUp = () => {
        Alert.alert('Funcionalidade em Desenvolvimento', 'O cadastro de novos usuários estará disponível em breve.', [
            { text: 'OK' },
        ]);
    };

    const fillDemoCredentials = () => {
        setEmail(DEFAULT_CREDENTIALS.email);
        setPassword(DEFAULT_CREDENTIALS.password);
    };

    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-900">
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View className="flex-1">
            <LinearGradient colors={['#1e3a8a', '#3b82f6', '#60a5fa']} className="flex-1">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="flex-1 justify-center px-6 py-12">
                            {/* Header com ícones médicos */}
                            <View className="items-center mb-12">
                                <View className="relative mb-6">
                                    <PulseAnimation duration={3000} minScale={0.9} maxScale={1.1}>
                                        <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center">
                                            <Image
                                                source={require('@/assets/images/brain-wave.png')}
                                                style={{
                                                    width: 60,
                                                    height: 60,
                                                    tintColor: 'white',
                                                    resizeMode: 'contain',
                                                }}
                                            />
                                        </View>
                                    </PulseAnimation>

                                    {/* Ícones médicos flutuantes */}
                                    <PulseAnimation duration={2500}>
                                        <View className="absolute -top-2 -right-8">
                                            <View className="w-8 h-8 bg-green-400 rounded-full items-center justify-center">
                                                <Ionicons name="pulse" size={16} color="white" />
                                            </View>
                                        </View>
                                    </PulseAnimation>

                                    <PulseAnimation duration={2000}>
                                        <View className="absolute -bottom-2 -left-8">
                                            <View className="w-8 h-8 bg-red-400 rounded-full items-center justify-center">
                                                <Ionicons name="heart" size={16} color="white" />
                                            </View>
                                        </View>
                                    </PulseAnimation>
                                </View>

                                <Text className="text-white text-3xl font-bold mb-2">Seizure Detector</Text>
                                <Text className="text-white/80 text-lg text-center">
                                    Sistema de Monitoramento Neurológico
                                </Text>
                                <Text className="text-white/60 text-sm text-center mt-2">Acesso Profissional</Text>
                            </View>

                            {/* Demo Credentials Info */}
                            <TouchableOpacity
                                onPress={fillDemoCredentials}
                                className="bg-white/10 rounded-lg p-3 mb-6 border border-white/20"
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-1">
                                        <Text className="text-white text-sm font-medium">
                                            💡 Credenciais de Demonstração
                                        </Text>
                                        <Text className="text-white/70 text-xs mt-1">
                                            Toque aqui para preencher automaticamente
                                        </Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={16} color="white" />
                                </View>
                            </TouchableOpacity>

                            {/* Formulário de Login */}
                            <View className="space-y-4 mb-6">
                                {/* Campo Email */}
                                <View>
                                    <Text className="text-white text-sm font-medium mb-2">Email Profissional</Text>
                                    <View className="bg-white/10 rounded-xl border border-white/20">
                                        <View className="flex-row items-center px-4 py-4">
                                            <Ionicons name="mail" size={20} color="white" />
                                            <TextInput
                                                className="flex-1 text-white text-base ml-3"
                                                placeholder="seu@email.com"
                                                placeholderTextColor="rgba(255,255,255,0.5)"
                                                value={email}
                                                onChangeText={setEmail}
                                                keyboardType="email-address"
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Campo Senha */}
                                <View>
                                    <Text className="text-white text-sm font-medium mb-2">Senha</Text>
                                    <View className="bg-white/10 rounded-xl border border-white/20">
                                        <View className="flex-row items-center px-4 py-4">
                                            <Ionicons name="lock-closed" size={20} color="white" />
                                            <TextInput
                                                className="flex-1 text-white text-base ml-3"
                                                placeholder="••••••••"
                                                placeholderTextColor="rgba(255,255,255,0.5)"
                                                value={password}
                                                onChangeText={setPassword}
                                                secureTextEntry={!showPassword}
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                            <TouchableOpacity
                                                onPress={() => setShowPassword(!showPassword)}
                                                className="p-1"
                                            >
                                                <Ionicons
                                                    name={showPassword ? 'eye-off' : 'eye'}
                                                    size={20}
                                                    color="rgba(255,255,255,0.7)"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Botão Esqueci a Senha */}
                            <TouchableOpacity onPress={handleForgotPassword} className="mb-6">
                                <Text className="text-white/80 text-sm text-center">Esqueceu sua senha?</Text>
                            </TouchableOpacity>

                            {/* Botão de Login */}
                            <TouchableOpacity
                                className={`rounded-xl py-4 px-6 ${isLoginLoading ? 'bg-gray-500' : 'bg-white'}`}
                                onPress={handleLogin}
                                disabled={isLoginLoading}
                            >
                                {isLoginLoading ? (
                                    <View className="flex-row justify-center items-center">
                                        <ActivityIndicator color="#3b82f6" size="small" />
                                        <Text className="text-blue-600 text-lg font-bold ml-2">Entrando...</Text>
                                    </View>
                                ) : (
                                    <Text className="text-blue-600 text-lg font-bold text-center">Entrar</Text>
                                )}
                            </TouchableOpacity>

                            {/* Divisor */}
                            <View className="flex-row items-center my-8">
                                <View className="flex-1 h-px bg-white/20" />
                                <Text className="text-white/60 text-sm mx-4">ou</Text>
                                <View className="flex-1 h-px bg-white/20" />
                            </View>

                            {/* Botão de Cadastro */}
                            <TouchableOpacity
                                onPress={handleSignUp}
                                className="border border-white/30 rounded-xl py-4 px-6"
                            >
                                <Text className="text-white text-lg font-medium text-center">
                                    Não tem uma conta? Cadastre-se
                                </Text>
                            </TouchableOpacity>

                            {/* Footer */}
                            <View className="mt-2 items-center">
                                <View className="flex-row items-center space-x-4">
                                    <View className="w-6 h-6 bg-white/20 rounded-full items-center justify-center">
                                        <Ionicons name="shield-checkmark" size={12} color="white" />
                                    </View>
                                    <Text className="text-white/60 text-xs">Dados protegidos por criptografia</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}
