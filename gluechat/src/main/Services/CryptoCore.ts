import { decapsulate, decrypt, DsaKeyPair, encapsulate, EncapsulationResult, encrypt, generateOneTimeKeys, kemKeypair, KemKeyPair, KemLength, mlDsaKeypair, MlDsaLength, mlDsaSign, mlDsaVerify, OneTimeKey, randomBytes
} from '@glueeeed/gluechat-crypto';
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
  static decrypt(cipherText: Uint8Array, key: Uint8Array): Uint8Array {
    return decrypt(cipherText, key);
  }

  static encryptData(content: Uint8Array, key: Uint8Array): Uint8Array {
    return encrypt(content, key);
  }

  static mixKeys(newKey: Uint8Array, oldKey: Uint8Array, message: Uint8Array): Uint8Array {
    return hkdf(sha256, newKey, oldKey, message, 32);
  }

  static generateNewKeyPair(): KemKeyPair {
    return kemKeypair(KemLength.MlKem1024);
  }

  static async generateOneTimeKeys(qty: number, accountName: string, prefix: string): Promise<oneTimeKey[]> {
    const oneTimeKeys: oneTimeKey[] = [];

    const generatedOtk: OneTimeKey[] = generateOneTimeKeys(KemLength.MlKem1024, qty, accountName, prefix);

    for (const key of generatedOtk) {
      await SecretManager.setSecret(accountName, key.accountName, key.secretName, Buffer.from(key.privateKey).toString('base64'));
      const oneTimeKey = {
        id: key.id,
        pubKey: Buffer.from(key.pubKey).toString('base64'),
      };
      oneTimeKeys.push(oneTimeKey);
    }

    return oneTimeKeys;
  }

  static generateSignKeyPair(): DsaKeyPair {
    return mlDsaKeypair(MlDsaLength.MlDsa87);
  }

  static sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
    return mlDsaSign(MlDsaLength.MlDsa87, privateKey, message);
  }

  static decapsulate(capsule: Uint8Array, privateKey: Uint8Array): Uint8Array {
    return decapsulate(KemLength.MlKem1024, capsule, privateKey);
  }

  static generateRandomBytes(size: number): Uint8Array {
    return randomBytes(size);
  }

  static encapsulate(key: Uint8Array): EncapsulationResult {
    return encapsulate(KemLength.MlKem1024, key);
  }

  static verifySignature(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean {
    return mlDsaVerify(MlDsaLength.MlDsa87,publicKey, message,signature);
  }
}
