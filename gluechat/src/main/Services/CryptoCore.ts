import { decapsulate, decrypt, encapsulate, EncapsulationResult, encrypt, generateKemKeypair, generateOneTimeKeys, KemLength, KeyPair, OneTimeKey, randomBytes
} from '@glueeeed/gluechat-crypto';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
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

export interface KeyPairDsa {
  secretKey: Uint8Array<ArrayBufferLike>;
  publicKey: Uint8Array<ArrayBufferLike>;
}

export abstract class CryptoCore {
  static decrypt(cipherText: string, key: string): string {
    return decrypt(cipherText, key);
  }

  static encryptData(content: string, key: string): string {
    return encrypt(content, key);
  }

  static mixKeys(newKey: Uint8Array, oldKey: Uint8Array, message: Uint8Array): Uint8Array {
    return hkdf(sha256, newKey, oldKey, message, 32);
  }

  static generateNewKeyPair(): KeyPair {
    return generateKemKeypair(KemLength.MlKem1024);
  }

  static async generateOneTimeKeys(qty: number, accountName: string, prefix: string): Promise<oneTimeKey[]> {
    const oneTimeKeys : oneTimeKey[] = [];

    const generatedOtk : OneTimeKey[] = generateOneTimeKeys(KemLength.MlKem1024, qty, accountName, prefix);

    for (const key of generatedOtk) {
      await SecretManager.setSecret(accountName,key.accountName, key.secretName, key.privateKey);
      const oneTimeKey = {
        id: key.id,
        pubKey: key.pubKey,
      };
      oneTimeKeys.push(oneTimeKey)
    }

    return oneTimeKeys;
  }

  static generateSignKeyPair(): KeyPairDsa {
    return ml_dsa87.keygen();
  }

  static sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array<ArrayBufferLike> {
    return ml_dsa87.sign(message, privateKey);
  }

  static decapsulate(capsule: Uint8Array, privateKey: Uint8Array): string {
    const capsule64: string = Buffer.from(capsule).toString('base64');
    const privateKey64: string = Buffer.from(privateKey).toString('base64');
    return decapsulate(KemLength.MlKem1024, capsule64, privateKey64);
  }

  static generateRandomBytes(size: number): Uint8Array {
    return randomBytes(size);
  }

  static encapsulate(key: Uint8Array): EncapsulationResult {
    const key64: string = Buffer.from(key).toString('base64');
    return encapsulate(KemLength.MlKem1024, key64);
  }

  static verifySignature(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
    return ml_dsa87.verify(signature, message, publicKey);
  }
}
