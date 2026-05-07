import { randomBytes } from '@noble/post-quantum/utils.js'
import type { Cipher } from '@noble/ciphers/utils.js'
import { gcm } from '@noble/ciphers/aes.js'
import { ml_kem768_x25519 as xwing } from '@noble/post-quantum/hybrid.js'
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'

export interface mixedKeys {
  nextChainKey: Uint8Array
  messageKey: Uint8Array
}

export interface oneTimeKey {
  id : string
  pubKey : string
}

export interface EncryptedData {
  nonce: Uint8Array<ArrayBufferLike>
  cipherText: Uint8Array<ArrayBufferLike>
}

export interface KeyPair {
  secretKey: Uint8Array<ArrayBufferLike>
  publicKey: Uint8Array<ArrayBufferLike>
}

interface EncapsulatedData {
  cipherText : Uint8Array
  sharedSecret : Uint8Array
}



export abstract class CryptoCore {
  static decryptData(cipherText: Uint8Array, nonce: Uint8Array, key: Uint8Array): string {
    const aes: Cipher = gcm(key, nonce)
    const decrypted: Uint8Array = aes.decrypt(cipherText)
    return new TextDecoder().decode(decrypted)
  }

  static encryptData(content: string, key: Uint8Array<ArrayBufferLike>): EncryptedData {
    const nonce: Uint8Array<ArrayBufferLike> = randomBytes(12)
    const data: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(content)
    const aes: Cipher = gcm(key, nonce)
    const cipherText: Uint8Array<ArrayBufferLike> = aes.encrypt(data)
    return { nonce, cipherText }
  }

   static mixKeys(newKey: Uint8Array, oldKey: Uint8Array, message: Uint8Array): mixedKeys {
    const derived = hkdf(sha256, newKey, oldKey, message, 64)
    return {
      nextChainKey: derived.slice(0, 32),
      messageKey: derived.slice(32, 64)
    }
  }

  static generateNewKeyPair(): KeyPair {
    return xwing.keygen()
  }

  static generateSignKeyPair() : KeyPair {
    return ml_dsa87.keygen()
  }

  static sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array<ArrayBufferLike> {
    return ml_dsa87.sign(message, privateKey)
  }

  static decapsulate(capsule : Uint8Array, privateKey : Uint8Array) : Uint8Array<ArrayBufferLike> {
    return xwing.decapsulate(capsule, privateKey)
  }

  static encapsulate(key : Uint8Array) : EncapsulatedData {
    return xwing.encapsulate(key)
  }

  static verifySignature(
    signature: Uint8Array,
    message: Uint8Array,
    publicKey: Uint8Array
  ): boolean {
    return ml_dsa87.verify(signature, message, publicKey)
  }
}
