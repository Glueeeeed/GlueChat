import {ml_kem768_x25519 as xwing} from '@noble/post-quantum/hybrid.js';
import {randomBytes} from "@noble/post-quantum/utils.js";
import {type Cipher} from "@noble/ciphers/utils.js";
import {gcm} from "@noble/ciphers/aes.js";
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import keytar from "keytar";

export interface KeyPair {
  secretKey: Uint8Array<ArrayBufferLike>,
  publicKey: Uint8Array<ArrayBufferLike>
}


interface EncryptedData {
  nonce: Uint8Array<ArrayBufferLike>,
  cipherText: Uint8Array<ArrayBufferLike>,
}

interface SessionState {
  rootKey: Uint8Array<ArrayBufferLike>,
  alicePrivateKey: Uint8Array<ArrayBufferLike>,
  bobPublicKey: Uint8Array<ArrayBufferLike>,
}

interface DataToSave {
  rootKey: string,
  alicePrivateKey: string,
  bobPublicKey: string,
}

interface EncryptedPackage {
  messageNumber: number,
  roomID: string,
  senderID: string,
  capsule: string | null,
  ephemeralPubKey: string | null;
  salt: string | null;
  content: string | null,
  nonce: string,
  isDeleted: boolean,
}

export abstract class CryptoService {

  static activeSession = new Map<string,SessionState>
  static sessionCounters = new Map<string, number>();
  static lastSender = new Map<string, string>();
  static currentMessageKey : Uint8Array | null = null ;
  static messageCounter : number = 0;


  // soon

  // private static async loadSession(roomID: string): Promise<boolean> {
  //   const savedData = await keytar.getPassword('gluechat', roomID);
  //   if (savedData) {
  //     try {
  //       const data: DataToSave = JSON.parse(savedData);
  //       this.activeSession.set(roomID, {
  //         rootKey: Buffer.from(data.rootKey, 'base64'),
  //         alicePrivateKey: Buffer.from(data.alicePrivateKey, 'base64'),
  //         bobPublicKey: Buffer.from(data.bobPublicKey, 'base64'),
  //       });
  //       return true;
  //     } catch (e) {
  //       console.error("Failed to parse session data from keytar", e);
  //     }
  //   }
  //   return false;
  // }


  static generateNewKeyPair() : KeyPair {
    return xwing.keygen();
  }

  private static mixKeys(newKey: Uint8Array, oldKey: Uint8Array, message: Uint8Array): { nextChainKey: Uint8Array, messageKey: Uint8Array } {
    const derived = hkdf(sha256, newKey, oldKey, message, 64);
    return {
      nextChainKey: derived.slice(0, 32),
      messageKey: derived.slice(32, 64)
    };
  }

  private static encryptData(content: string, key: Uint8Array<ArrayBufferLike>) : EncryptedData {
    const nonce : Uint8Array<ArrayBufferLike> = randomBytes(12);
    const data : Uint8Array<ArrayBufferLike> = new TextEncoder().encode(content);
    const aes : Cipher  = gcm(key, nonce);
    const cipherText : Uint8Array<ArrayBufferLike>  = aes.encrypt(data);
    return {nonce, cipherText};
  }

  static async initializeEncrypt(publicKey: Uint8Array, content: string, roomID: string, senderID: string): Promise<EncryptedPackage> {

    const currentCounter = this.sessionCounters.get(roomID) || 1;
    const previousSender = this.lastSender.get(roomID);


    if (!this.activeSession.has(roomID) || currentCounter >= 10 || previousSender !== senderID) {
      // await this.loadSession(roomID); // soon
      this.lastSender.set(roomID, senderID);
      this.sessionCounters.set(roomID, 1);

      return await this.prepareEncryptedPackage(publicKey, content, roomID, senderID);
    } else {
      this.sessionCounters.set(roomID, currentCounter + 1);

      return await this.prepareEncryptedMessage(content, roomID, senderID);
    }
  }


  private static async prepareEncryptedPackage(publicKey: Uint8Array, content: string, roomID: string,senderID: string): Promise<EncryptedPackage> {

    const existingSession= this.activeSession.get(roomID);

    const pubKey = existingSession ? existingSession.bobPublicKey : publicKey;
    const { cipherText, sharedSecret: networkSecret } = xwing.encapsulate(pubKey);

    // If old root Key doesn't exist, we use random generated salt
    const salt : Uint8Array = randomBytes(32);
    const oldRootKey : Uint8Array = existingSession ? existingSession.rootKey : salt
    if (!existingSession) {
      console.log("Current session dont exits");
      console.log("using random generated salt");
    }
    const info = new TextEncoder().encode(roomID);
    const { nextChainKey, messageKey } = this.mixKeys(networkSecret, oldRootKey, info);
    const nextEphemeral = xwing.keygen();

    this.activeSession.set(roomID, {
      rootKey: nextChainKey,
      alicePrivateKey: nextEphemeral.secretKey,
      bobPublicKey:  pubKey,
    });

    const encrypted = this.encryptData(content, messageKey);


    const dataToSave : DataToSave = {
      rootKey: Buffer.from(nextChainKey).toString("base64"),
      alicePrivateKey: Buffer.from(nextEphemeral.publicKey).toString("base64"),
      bobPublicKey: Buffer.from(pubKey).toString("base64"),
    }


    await keytar.setPassword('gluechat', roomID, JSON.stringify(dataToSave));

    return {
      messageNumber: this.messageCounter,
      roomID: roomID,
      senderID: senderID,
      salt: existingSession ? null : Buffer.from(salt).toString("base64"),
      capsule: Buffer.from(cipherText).toString('base64'),
      ephemeralPubKey: Buffer.from(nextEphemeral.publicKey).toString('base64'),
      content: Buffer.from(encrypted.cipherText).toString('base64'),
      nonce: Buffer.from(encrypted.nonce).toString('base64'),
      isDeleted: false,
    };
  }

  private static async prepareEncryptedMessage(content: string, roomID: string, senderID: string): Promise<EncryptedPackage> {
    const session = this.activeSession.get(roomID);
    if (!session) throw new Error("No active session for this room");

    const info = new TextEncoder().encode(roomID);

    const salt = randomBytes(32);
    const { nextChainKey, messageKey } = this.mixKeys(session.rootKey, salt, info);
    session.rootKey = nextChainKey;
    console.log("new key" + Buffer.from(session.rootKey).toString("base64") );
    this.activeSession.set(roomID, session);

    const encrypted = this.encryptData(content, messageKey);

    const dataToSave: DataToSave = {
      rootKey: Buffer.from(session.rootKey).toString("base64"),
      alicePrivateKey: Buffer.from(session.alicePrivateKey).toString("base64"),
      bobPublicKey: Buffer.from(session.bobPublicKey).toString("base64"),
    };
    await keytar.setPassword('gluechat', roomID, JSON.stringify(dataToSave));

    return {
      messageNumber: this.messageCounter,
      roomID: roomID,
      senderID: senderID,
      salt: Buffer.from(salt).toString("base64"),
      capsule: null,
      ephemeralPubKey: null,
      content: Buffer.from(encrypted.cipherText).toString('base64'),
      nonce: Buffer.from(encrypted.nonce).toString('base64'),
      isDeleted: false,
    };
  }

  private static decryptData(cipherText: Uint8Array, nonce: Uint8Array, key: Uint8Array): string {
    const aes: Cipher = gcm(key, nonce);
    const decrypted: Uint8Array = aes.decrypt(cipherText);
    return new TextDecoder().decode(decrypted);
  }

  static async initializeDecrypt(pkg: EncryptedPackage, identityPrivKey: Uint8Array): Promise<string | null> {
    // if (!this.activeSession.has(pkg.roomID)) {
    //   await this.loadSession(pkg.roomID);   // soon
    // }
    let existingSession : any = this.activeSession.get(pkg.roomID);


    if (pkg.capsule) {
      const capsuleBytes = Buffer.from(pkg.capsule, 'base64');

      const alicePrivateKey = existingSession ? existingSession.alicePrivateKey : identityPrivKey;

      const networkSecret = xwing.decapsulate(capsuleBytes, alicePrivateKey);

      const oldRootKey : Uint8Array = existingSession ? existingSession.rootKey : Buffer.from(pkg.salt as string ,'base64')

      if (!oldRootKey) throw new Error("No salt or old root key available");

      const info = new TextEncoder().encode(pkg.roomID);
      const { nextChainKey, messageKey } = this.mixKeys(networkSecret, oldRootKey as Uint8Array, info);
      this.currentMessageKey = messageKey;

      const bobPublicKey = pkg.ephemeralPubKey ? Buffer.from(pkg.ephemeralPubKey, 'base64') : new Uint8Array();

      const sessionData = {
        rootKey: nextChainKey,
        alicePrivateKey: existingSession ? existingSession.alicePrivateKey : identityPrivKey,
        bobPublicKey: bobPublicKey,
      };

      this.activeSession.set(pkg.roomID, sessionData);
      this.lastSender.set(pkg.roomID, pkg.senderID);

    } else if (existingSession) {
      const info = new TextEncoder().encode(pkg.roomID);
      const salt = Buffer.from(pkg.salt as string ,'base64');

      const { nextChainKey, messageKey } = this.mixKeys(existingSession.rootKey, salt, info);
      this.currentMessageKey = messageKey;
      existingSession.rootKey = nextChainKey;

      this.activeSession.set(pkg.roomID, existingSession);
    } else {
      console.error("Received message without capsule, but no active session found.");
      return null;
    }

    if (!pkg.content || !pkg.nonce) return null;

    existingSession = this.activeSession.get(pkg.roomID);

    const cipherText = Buffer.from(pkg.content, 'base64');
    const nonce = Buffer.from(pkg.nonce, 'base64');


    const dataToSave: DataToSave = {
      rootKey: Buffer.from(existingSession.rootKey).toString("base64"),
      alicePrivateKey: Buffer.from(existingSession.alicePrivateKey).toString("base64"),
      bobPublicKey: Buffer.from(existingSession.bobPublicKey).toString("base64"),
    };
    await keytar.setPassword('gluechat', pkg.roomID, JSON.stringify(dataToSave));

    const data =  this.decryptData(cipherText, nonce, this.currentMessageKey as Uint8Array);
    this.currentMessageKey = null;
    return data;
  }



}
