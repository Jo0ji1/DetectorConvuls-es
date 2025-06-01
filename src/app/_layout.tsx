import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { DeviceProvider } from '../contexts/DeviceContext';
import '@/global.css';

export default function RootLayout() {
    return (
        <AuthProvider>
            <DeviceProvider>
                <StatusBar style="light" />
                <Stack
                    screenOptions={{
                        headerShown: false,
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(protected)" />
                </Stack>
            </DeviceProvider>
        </AuthProvider>
    );
}
