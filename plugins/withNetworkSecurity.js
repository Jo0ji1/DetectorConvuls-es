const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function addNetworkSecurityConfig(androidManifest) {
    const { manifest } = androidManifest;

    if (manifest.application && manifest.application.length > 0) {
        const application = manifest.application[0];

        // Adicionar usesCleartextTraffic
        if (!application.$) {
            application.$ = {};
        }
        application.$['android:usesCleartextTraffic'] = 'true';

        // Adicionar networkSecurityConfig
        application.$['android:networkSecurityConfig'] = '@xml/network_security_config';

        console.log('✅ AndroidManifest.xml modificado: usesCleartextTraffic e networkSecurityConfig adicionados');
    }

    return androidManifest;
}

function withNetworkSecurity(config) {
    // Modificar AndroidManifest.xml
    config = withAndroidManifest(config, (config) => {
        config.modResults = addNetworkSecurityConfig(config.modResults);
        return config;
    });

    // Garantir que o arquivo XML existe
    config = withDangerousMod(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const xmlDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
            const xmlFile = path.join(xmlDir, 'network_security_config.xml');

            // Criar diretório se não existir
            if (!fs.existsSync(xmlDir)) {
                fs.mkdirSync(xmlDir, { recursive: true });
                console.log('✅ Diretório XML criado:', xmlDir);
            }

            // Verificar se o arquivo existe, senão criar
            if (!fs.existsSync(xmlFile)) {
                const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">192.168.1.128</domain>
        <domain includeSubdomains="false">localhost</domain>
        <domain includeSubdomains="false">10.0.2.2</domain>
        <domain includeSubdomains="false">172.16.60.237</domain>
    </domain-config>
</network-security-config>`;

                fs.writeFileSync(xmlFile, xmlContent);
                console.log('✅ Network security config criado:', xmlFile);
            } else {
                console.log('✅ Network security config já existe:', xmlFile);
            }

            return config;
        },
    ]);

    return config;
}

module.exports = withNetworkSecurity;
