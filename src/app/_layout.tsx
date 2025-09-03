import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DeviceProvider } from '../contexts/DeviceContext';
import '@/global.css';

export default function RootLayout() {
    return (
        <DeviceProvider>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="dashboard" />
            </Stack>
        </DeviceProvider>
    );
}
