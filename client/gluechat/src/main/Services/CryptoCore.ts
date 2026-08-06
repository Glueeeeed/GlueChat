import { randomBytes } from '@noble/post-quantum/utils.js';
import type { Cipher } from '@noble/ciphers/utils.js';
import { ml_kem768_x25519 as xwing } from '@noble/post-quantum/hybrid.js';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { SecretManager } from '../Managers/SecretManager';

export interface mixedKeys {
  rootKey: Uint8Array;
}

export interface oneTimeKey {
  id: string;
  pubKey: string;
}

export interface EncryptedData {
  nonce: Uint8Array<ArrayBufferLike>;
  cipherText: Uint8Array<ArrayBufferLike>;
}

export interface KeyPair {
  secretKey: Uint8Array<ArrayBufferLike>;
  publicKey: Uint8Array<ArrayBufferLike>;
}

interface EncapsulatedData {
  cipherText: Uint8Array;
  sharedSecret: Uint8Array;
}

export abstract class CryptoCore {
  static decryptData(cipherText: Uint8Array, nonce: Uint8Array, key: Uint8Array): string {
    const cipher: Cipher = xchacha20poly1305(key, nonce);
    const decrypted: Uint8Array = cipher.decrypt(cipherText);
    return new TextDecoder().decode(decrypted);
  }

  static decrypt(cipherText: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array {
    const cipher: Cipher = xchacha20poly1305(key, nonce);
    return cipher.decrypt(cipherText);
  }

  static encryptData(content: string | Uint8Array<ArrayBufferLike>, key: Uint8Array<ArrayBufferLike>): EncryptedData {
    const nonce: Uint8Array<ArrayBufferLike> = randomBytes(24);
    const data: Uint8Array<ArrayBufferLike> = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const cipher: Cipher = xchacha20poly1305(key, nonce);
    const cipherText: Uint8Array<ArrayBufferLike> = cipher.encrypt(data);
    return { nonce, cipherText };
  }

  static mixKeys(newKey: Uint8Array, oldKey: Uint8Array, message: Uint8Array): Uint8Array {
    return hkdf(sha256, newKey, oldKey, message, 32);
  }

  static generateNewKeyPair(): KeyPair {
    return xwing.keygen();
  }

  static async generateOneTimeKeys(qty: number, accountName: string, prefix: string): Promise<oneTimeKey[]> {
    const oneTimeKeys: oneTimeKey[] = [];
    for (let i = 0; i <= qty; i++) {
      const oneTimeKeyID: string = Buffer.from(randomBytes(4)).toString('hex');
      const keyPair: KeyPair = this.generateNewKeyPair();

      const pubKey: string = Buffer.from(keyPair.publicKey).toString('base64');
      const privateKey: string = Buffer.from(keyPair.secretKey).toString('base64');

      await SecretManager.setSecret(accountName, 'gluechat_' + accountName, `${prefix}-otk-${oneTimeKeyID}`, privateKey);

      const oneTimeKey = {
        id: oneTimeKeyID,
        pubKey: pubKey
      };

      oneTimeKeys.push(oneTimeKey);
    }
    return oneTimeKeys;
  }

  static generateSignKeyPair(): KeyPair {
    return ml_dsa87.keygen();
  }

  static sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array<ArrayBufferLike> {
    return ml_dsa87.sign(message, privateKey);
  }

  static decapsulate(capsule: Uint8Array, privateKey: Uint8Array): Uint8Array<ArrayBufferLike> {
    return xwing.decapsulate(capsule, privateKey);
  }

  static generateRandomBytes(size: number): Uint8Array {
    return randomBytes(size);
  }

  static encapsulate(key: Uint8Array): EncapsulatedData {
    return xwing.encapsulate(key);
  }

  static verifySignature(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
    return ml_dsa87.verify(signature, message, publicKey);
  }
}
