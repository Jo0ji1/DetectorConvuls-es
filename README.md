# Seizure Detector App

Uma aplicação mobile moderna desenvolvida com React Native e Expo Router, focada em proporcionar uma experiência única e intuitiva para usuários brasileiros.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter as seguintes ferramentas instaladas:

-   **Node.js** versão **22.11.0** ou superior
-   **npm** ou **yarn**
-   **Expo CLI** (instalado globalmente)
-   **Android Studio** (para desenvolvimento Android)
-   **Xcode** (para desenvolvimento iOS - apenas macOS)

### Verificando a versão do Node.js

```bash
node --version
```
⚠️ **Importante**: Este projeto requer Node.js versão 22.11.0 ou superior para funcionar corretamente.

## 🛠️ Instalação e Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/SeizureDetectorApp.git
cd SeizureDetectorApp
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Instale o Expo CLI globalmente (se ainda não tiver)

```bash
npm install -g @expo/eas-cli expo-cli
```

## 🚀 Como Executar o Projeto

### Executando no Dispositivo Físico

#### Iniciar o servidor de desenvolvimento

```bash
npx expo start
```

1. Instale o app **Expo Go** no seu dispositivo
2. Execute `npm expo start` no terminal
3. Escaneie o QR Code com o Expo Go (Android) ou com a câmera (iOS)

#### Executar no Android

```bash
npm run android
```

#### Executar no iOS

```bash
npm run ios
```

#### Executar no Web

```bash
npm run web
```



## 📦 Build para Produção

### EAS Build (Recomendado)

#### Configurar EAS Build

```bash
eas build:configure
```

#### Build para Android (APK)

```bash
eas build --platform android --profile preview
```

#### Build para Android (AAB - Google Play)

```bash
eas build --platform android --profile production
```

#### Build para iOS

```bash
eas build --platform ios --profile production
```

## 🧪 Testes

Execute os testes unitários:

```bash
npx expo doctor
```