// encryption.service.ts
import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EncryptionService {
  //private SECRET_KEY = CryptoJS.enc.Utf8.parse('12345678901234567890123456789012'); // 32-byte
  //private IV = CryptoJS.enc.Utf8.parse('1234567890123456'); // 16-byte
  private SECRET_KEY = CryptoJS.enc.Utf8.parse(environment.PAYLOAD_ENCRYPTION_KEY);
  private IV = CryptoJS.enc.Utf8.parse(environment.PAYLOAD_ENCRYPTION_IV);

  encrypt(data: any): string {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), this.SECRET_KEY, {
      iv: this.IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString();
    return encrypted;
  }

  decrypt(encryptedData: string): any {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, this.SECRET_KEY, {
      iv: this.IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    }).toString(CryptoJS.enc.Utf8);

    return JSON.parse(decrypted);
  }
}
