import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amka.perception',
  appName: 'AMKA Perception',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // Pour le dev, pointe vers le serveur Next.js local
    // url: 'http://192.168.1.X:3000',
    // cleartext: true,
  },
  plugins: {
    BarcodeScanner: {
      // Si le FlexyPOS a un scanner intégré
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
