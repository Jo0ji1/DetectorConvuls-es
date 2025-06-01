import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_USER, validateLogin } from '../data/mockData';

interface User {
    id: string;
    email: string;
    name: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Verificar se já está logado ao iniciar o app
        checkAuthState();
    }, []);

    const checkAuthState = async () => {
        try {
            const userData = await AsyncStorage.getItem('@seizure_detector:user');
            if (userData) {
                setUser(JSON.parse(userData));
            }
        } catch (error) {
            console.error('Erro ao verificar estado de autenticação:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            setIsLoading(true);

            // Simular delay de requisição
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Validar credenciais
            const isValid = validateLogin(email, password);

            if (isValid) {
                const userData = DEFAULT_USER;

                // Salvar dados do usuário
                await AsyncStorage.setItem('@seizure_detector:user', JSON.stringify(userData));
                setUser(userData);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Erro no login:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            setIsLoading(true);
            await AsyncStorage.removeItem('@seizure_detector:user');
            setUser(null);
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const value: AuthContextType = {
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
}
