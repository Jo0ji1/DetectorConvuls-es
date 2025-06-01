import { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import '@/global.css';

export default function ProtectedLayout() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Redirecionar para login se não estiver autenticado
            router.replace('/');
        }
    }, [isAuthenticated, isLoading]);

    // Mostrar loading enquanto verifica autenticação
    if (isLoading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-900">
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    // Se não estiver autenticado, não renderizar nada (vai redirecionar)
    if (!isAuthenticated) {
        return null;
    }

    // Se estiver autenticado, renderizar as rotas protegidas
    return <Slot />;
}
