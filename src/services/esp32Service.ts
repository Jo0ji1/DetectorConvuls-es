export interface ESP32Device {
    ip: string;
    port: number;
    device: string;
    nome: string;
    versao: string;
    online: boolean;
    mdns?: string;
}

export interface ESP32Status {
    device: string;
    nome: string;
    timestamp: number;
    sistema_ativo: boolean;
    crise_detectada: boolean;
    ultima_aceleracao: number;
    threshold: number;
    sensibilidade: number;
    total_eventos: number;
    uptime: number;
    wifi_rssi: number;
    ip: string;
    memoria_livre: number;
    ultima_atividade: number;
    versao: string;
}

class ESP32Service {
    private readonly DISCOVERY_TIMEOUT = 5000; // 5 segundos
    private readonly CONNECTION_TIMEOUT = 3000; // 3 segundos
    private readonly COMMON_IPS = [
        '192.168.1.',
        '192.168.0.',
        '10.0.0.',
        '172.16.0.',
        '/172.16.60.48'
    ];

    // Descobrir dispositivos na rede local
    async discoverDevices(): Promise<ESP32Device[]> {
        const devices: ESP32Device[] = [];
        const promises: Promise<void>[] = [];

        console.log('🔍 Iniciando descoberta de dispositivos...');

        // 1. Tentar mDNS primeiro (se disponível)
        try {
            const mdnsDevice = await this.tryMdnsDiscovery();
            if (mdnsDevice) {
                devices.push(mdnsDevice);
                console.log('✅ Dispositivo encontrado via mDNS:', mdnsDevice);
            }
        } catch (error) {
            console.log('⚠️ mDNS não disponível ou falhou');
        }

        // 2. Varredura de IPs comuns (primeiros 20 IPs de cada range)
        for (const baseIP of this.COMMON_IPS) {
            for (let i = 1; i <= 20; i++) {
                const ip = `${baseIP}${i}`;
                promises.push(this.checkDevice(ip, devices));
            }
        }

        // Aguardar todas as verificações com timeout
        await Promise.allSettled(promises);

        console.log(`🎯 Descoberta concluída. ${devices.length} dispositivo(s) encontrado(s)`);
        return devices;
    }

    // Tentar descoberta via mDNS
    private async tryMdnsDiscovery(): Promise<ESP32Device | null> {
        try {
            const response = await fetch('http://seizure-detector.local/descoberta', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    ip: data.ip,
                    port: data.porta,
                    device: data.device,
                    nome: data.nome,
                    versao: data.versao,
                    online: data.online,
                    mdns: 'seizure-detector.local'
                };
            }
        } catch (error) {
            // mDNS não disponível
        }
        return null;
    }

    // Verificar se um IP específico possui nosso dispositivo
    private async checkDevice(ip: string, devices: ESP32Device[]): Promise<void> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.DISCOVERY_TIMEOUT);

            const response = await fetch(`http://${ip}/descoberta`, {
                method: 'GET',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' }
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                
                // Verificar se é nosso dispositivo
                if (data.device && data.device.includes('SeizureDetector')) {
                    const device: ESP32Device = {
                        ip: data.ip,
                        port: data.porta || 80,
                        device: data.device,
                        nome: data.nome,
                        versao: data.versao,
                        online: data.online
                    };

                    // Evitar duplicatas
                    if (!devices.some(d => d.ip === device.ip)) {
                        devices.push(device);
                        console.log('✅ Dispositivo encontrado:', ip, '-', data.nome);
                    }
                }
            }
        } catch (error) {
            // IP não responde ou não é nosso dispositivo - isso é normal
        }
    }

    // Conectar a um dispositivo específico
    async connectToDevice(device: ESP32Device): Promise<boolean> {
        try {
            console.log('🔄 Conectando ao dispositivo:', device.ip);

            const response = await fetch(`http://${device.ip}/ping`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Conexão estabelecida:', data);
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Erro ao conectar:', error);
            return false;
        }
    }

    // Obter status completo do dispositivo
    async getDeviceStatus(ip: string): Promise<ESP32Status | null> {
        try {
            const response = await fetch(`http://${ip}/status`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                return data as ESP32Status;
            }

            return null;
        } catch (error) {
            console.error('❌ Erro ao obter status:', error);
            return null;
        }
    }

    // Controlar o dispositivo
    async controlDevice(ip: string, commands: any): Promise<boolean> {
        try {
            const response = await fetch(`http://${ip}/controle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commands)
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Erro ao controlar dispositivo:', error);
            return false;
        }
    }

    // Testar conectividade simples
    async pingDevice(ip: string): Promise<boolean> {
        try {
            const response = await fetch(`http://${ip}/ping`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

export const esp32Service = new ESP32Service();