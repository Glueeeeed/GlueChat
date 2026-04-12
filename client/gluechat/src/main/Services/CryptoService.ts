import {ml_kem768_x25519 as xwing} from '@noble/post-quantum/hybrid.js';
import {randomBytes} from "@noble/post-quantum/utils.js";
import {type Cipher} from "@noble/ciphers/utils.js";
import {gcm} from "@noble/ciphers/aes.js";

export interface KeyPair {
  secretKey: Uint8Array<ArrayBufferLike>,
  publicKey: Uint8Array<ArrayBufferLike>
}

interface xwingEncapsulation {
  cipherText: Uint8Array<ArrayBufferLike>,
  sharedSecret: Uint8Array<ArrayBufferLike>
}

interface EncryptedData {
  nonce: Uint8Array<ArrayBufferLike>,
  cipherText: Uint8Array<ArrayBufferLike>,
}

interface EncryptedPackage {
  messageNumber: number,
  roomID: string,
  senderID: string,
  capsule: string | null,
  content: string | null,
  nonce: string,
  isDeleted: boolean,
}

export abstract class CryptoService {

  static activeSession = new Map<string,Uint8Array<ArrayBufferLike>>
  static messageCounter : number = 0;

  static generateNewKeyPair() : KeyPair {
    return xwing.keygen();
  }

  private static encryptData(content: string, key: Uint8Array<ArrayBufferLike>) : EncryptedData {
    const nonce : Uint8Array<ArrayBufferLike> = randomBytes(12);
    const data : Uint8Array<ArrayBufferLike> = new TextEncoder().encode(content);
    const aes : Cipher  = gcm(key, nonce);
    const cipherText : Uint8Array<ArrayBufferLike>  = aes.encrypt(data);
    return {nonce, cipherText};
  }

  static initializeEncrypt(publicKey: Uint8Array,content: string, roomID: string) : EncryptedPackage {
    if (!this.activeSession.has(roomID)) {
      return this.prepareEncryptedPackage(publicKey,content, roomID, "123");
    } else {
      return this.prepareEncryptedMessage(content, roomID, "123");
    }
  }

  private static prepareEncryptedPackage(publicKey: Uint8Array, content: string, roomID: string, senderID: string) : EncryptedPackage {
    const {cipherText, sharedSecret} : xwingEncapsulation = xwing.encapsulate(publicKey);
    this.activeSession.set(roomID, sharedSecret);
    const encrypted : EncryptedData = this.encryptData(content, sharedSecret);
    const capsule : string = Buffer.from(cipherText).toString('base64');
    const encryptedContent : string = Buffer.from(encrypted.cipherText).toString('base64');
    const nonce : string = Buffer.from(encrypted.nonce).toString('base64');
    return {
      messageNumber: this.messageCounter,
      roomID: roomID,
      senderID: senderID,
      capsule: capsule,
      content: encryptedContent,
      nonce: nonce,
      isDeleted: false,
    };
  }

  private static prepareEncryptedMessage(content: string, roomID: string, senderID: string) {
    const sharedSecret : Uint8Array<ArrayBufferLike> | undefined = this.activeSession.get(roomID);
    const encrypted : EncryptedData = this.encryptData(content, sharedSecret as Uint8Array);
    const encryptedContent : string = Buffer.from(encrypted.cipherText).toString('base64');
    const nonce : string = Buffer.from(encrypted.nonce).toString('base64');
    return {
      messageNumber: this.messageCounter,
      roomID: roomID,
      senderID: senderID,
      capsule: null,
      content: encryptedContent,
      nonce: nonce,
      isDeleted: false,
    };
  }

  private static decryptData(cipherText: Uint8Array, nonce: Uint8Array, key: Uint8Array): string {
    const aes: Cipher = gcm(key, nonce);
    const decrypted: Uint8Array = aes.decrypt(cipherText);
    return new TextDecoder().decode(decrypted);
  }

  static async initializeDecrypt(
    encryptedPackage: EncryptedPackage,
    privateKey: Uint8Array
  ): Promise<string | null> {
    let sharedSecret: Uint8Array<ArrayBufferLike> | undefined = this.activeSession.get(encryptedPackage.roomID);
    if (encryptedPackage.capsule) {
      const capsuleBytes = Buffer.from(encryptedPackage.capsule, 'base64');
      sharedSecret = xwing.decapsulate(capsuleBytes, privateKey);
      this.activeSession.set(encryptedPackage.roomID, sharedSecret);
    }

    if (!sharedSecret) {
      console.warn("Shared secret for this room not exists", encryptedPackage.roomID);
      return null;
    }

    if (!encryptedPackage.content || !encryptedPackage.nonce) return null;

    const cipherText = Buffer.from(encryptedPackage.content, 'base64');
    const nonce = Buffer.from(encryptedPackage.nonce, 'base64');

    return this.decryptData(cipherText, nonce, sharedSecret as Uint8Array);
  }



}
