import type { CapacitorConfig } from '@capacitor/cli';

// Source of truth for production. `npm run cap:config:prod` (also run
// automatically by build:android:release / build:ios:release) copies this
// over capacitor.config.ts, which is what Capacitor's CLI actually reads.
// No server.url here - the app loads the bundled web assets from webDir,
// not a dev machine's IP.
const config: CapacitorConfig = {
  appId: 'com.lcp.app',
  appName: 'LCP',
  webDir: 'dist/lcp/browser',
  android: {
    webContentsDebuggingEnabled: false,
  },
};

export default config;
