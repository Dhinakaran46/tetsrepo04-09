import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor's CLI never reads this file directly (there's no --config flag
// in this version to point it here). `npm run cap:config:dev` copies this
// file's content over capacitor.config.ts, which IS what Capacitor reads -
// that's what makes live-reload dev builds actually pick this up.
const config: CapacitorConfig = {
  appId: 'com.lcp.app',
  appName: 'LCP Dev',
  webDir: 'dist/lcp/browser',
  server: {
    // Replace with your actual IP from ipconfig
    url: 'http://10.71.200.224:4200',
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
