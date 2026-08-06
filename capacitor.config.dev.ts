import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lcp.app',
  appName: 'LCP Dev',
  webDir: 'dist/lcp/browser',
  server: {
    // Replace with your actual IP from ipconfig
    url: 'http://192.168.31.232:4200',
    cleartext: true,
    // Optional: allow all hosts
    allowNavigation: ['*'],
  },
  android: {
    // Enable WebView debugging
    webContentsDebuggingEnabled: true,
  },
};

export default config;
