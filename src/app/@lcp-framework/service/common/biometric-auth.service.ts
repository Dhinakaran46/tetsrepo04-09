import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from 'capacitor-native-biometric';

// One fixed "server" key groups all saved credentials for this app in the
// device's secure credential store (Android Keystore / iOS Keychain) - the
// plugin scopes get/set/delete calls by this key, not by the credentials
// themselves.
const BIOMETRIC_SERVER_KEY = 'lcp-app-login';

// The plugin only exposes get/setCredentials as a single gated username+
// password pair (getCredentials isn't itself required to follow a successful
// verifyIdentity() call - that ordering is the app's own responsibility, so
// we never call it without a scan in front of it). To show "Continue as
// x@y.com" on the login screen without pulling the password into JS just to
// render a label, the (non-secret) email is mirrored in plain localStorage.
const BIOMETRIC_EMAIL_KEY = 'biometric_login_email';

export interface BiometricCredentials {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  // Biometric login only makes sense inside the native shell - a browser tab
  // has no fingerprint sensor to call into, and the plugin's web stub would
  // just reject every call.
  get isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  async isAvailable(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch {
      return false;
    }
  }

  async hasSavedCredentials(): Promise<boolean> {
    if (!this.isSupported) return false;
    try {
      const credentials = await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER_KEY });
      return !!(credentials?.username && credentials?.password);
    } catch {
      // The plugin rejects when nothing has been saved yet for this server key.
      return false;
    }
  }

  async saveCredentials(credentials: BiometricCredentials): Promise<void> {
    if (!this.isSupported) return;
    await NativeBiometric.setCredentials({
      username: credentials.email,
      password: credentials.password,
      server: BIOMETRIC_SERVER_KEY,
    });
    localStorage.setItem(BIOMETRIC_EMAIL_KEY, credentials.email);
  }

  // Non-gated label for the login screen ("Continue as x@y.com") - does not
  // touch the credential store, so it's safe to read without a fingerprint
  // scan.
  getSavedEmail(): string {
    return localStorage.getItem(BIOMETRIC_EMAIL_KEY) || '';
  }

  // Standard "enroll" flow: make the user actually scan their fingerprint
  // once to confirm it before we store anything, rather than saving silently
  // in the background. Throws (user cancelled / scan failed) if enrollment
  // didn't complete - callers should leave nothing saved in that case.
  async enrollCredentials(credentials: BiometricCredentials): Promise<void> {
    await NativeBiometric.verifyIdentity({
      reason: 'Confirm your fingerprint to enable quick login',
      title: 'Enable Fingerprint Login',
      subtitle: 'Scan your fingerprint to confirm',
      maxAttempts: 5,
    });
    await this.saveCredentials(credentials);
  }

  async clearSavedCredentials(): Promise<void> {
    localStorage.removeItem(BIOMETRIC_EMAIL_KEY);
    if (!this.isSupported) return;
    try {
      await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER_KEY });
    } catch {
      // Nothing was saved - fine.
    }
  }

  // Prompts the OS fingerprint/face dialog, then hands back the credentials
  // that were saved behind it. Throws if the user cancels or verification
  // fails - callers should catch and just silently fall back to the manual
  // login form rather than surfacing a raw plugin error.
  async loginWithBiometrics(): Promise<BiometricCredentials> {
    await NativeBiometric.verifyIdentity({
      reason: 'Log in to LCP',
      title: 'Fingerprint Login',
      subtitle: 'Use your fingerprint to log in',
      maxAttempts: 5,
    });

    const credentials = await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER_KEY });
    return { email: credentials.username, password: credentials.password };
  }
}
