import { SessionState, StorageService} from './StorageService'
import { NetworkService } from './NetworkService'
import { CryptoCore } from './CryptoCore'
import {randomBytes} from "@noble/post-quantum/utils.js";
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'

interface pkgStructure {
  roomID: string,
  senderID: string,
  messageNumber: number,
  opkId: string | null,
  salt: string | null,
  capsule: string | null,
  ephemeralPubKey: string | null,
  content: string,
  nonce: string,
  isDeleted: boolean,
}

interface decryptData {
  nextChainKey? : Uint8Array
  messageKey? : Uint8Array
}


abstract class ProtocolService {
  private static activeSessions = new Map<string, SessionState>()
  private static temporarySessions = new Map<string, SessionState>()
  private static temporaryDecryptData = new Map<string, decryptData>()

  private static async getOrLoadSession(roomID: string, accountID: string, accountName: string): Promise<SessionState | null> {
    try {
      if (this.activeSessions.has(roomID)) {
        return this.activeSessions.get(roomID)!
      }
      const stored = await StorageService.getSession(roomID, accountID, accountName)
      if (stored) {
        const data = JSON.parse(stored)
        const session: SessionState = {
          ...data,
          rootKey: Buffer.from(data.rootKey, 'base64'),
        }

        this.activeSessions.set(roomID, session)
        return session
      }

      return null
    } catch (error) {
      console.error('Failed to get session', error);
      throw error
    }
  }

  private static async preparePreKeyCapsule(roomID: string, authKey: string, receiverID: string, senderID: string, accountName: string): Promise<void> {
    try {
      const preKeys = await NetworkService.getPreKeys(authKey, receiverID)
      const { cipherText: capsuleSPK, sharedSecret: ssSPK } = CryptoCore.encapsulate(Buffer.from(preKeys.spk, 'base64'));
      const { cipherText: capsuleOPK, sharedSecret: ssOPK } = CryptoCore.encapsulate(Buffer.from(preKeys.opk, 'base64'));
      const info : Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
      const rootKey : Uint8Array = hkdf(sha256, ssSPK, ssOPK, info, 32);

      console.log("Root keyy " + Buffer.from(rootKey).toString("base64"));
      const capsule: string = Buffer.from(capsuleSPK).toString('base64') + '|' + Buffer.from(capsuleOPK).toString('base64')

      // SAVE SESSION IN RAM

      this.activeSessions.set(roomID, {
        rootKey: rootKey,
        sendCounter: 1,
        lastSenderID: senderID
      })

      this.temporarySessions.set(roomID, {
        rootKey: rootKey,
        capsule: capsule,
        opkId: preKeys.opkId,
        sendCounter: 1,
        lastSenderID: senderID
      })

      // SAVE SESSION IN DATABASE

      const dataToSave = {
        rootKey: Buffer.from(rootKey).toString('base64'),
        sendCounter: 1,
        lastSenderID: senderID
      }

      await StorageService.saveSession(roomID, JSON.stringify(dataToSave), senderID, accountName)
    } catch (error) {
      console.error('Failed prepare session with pre keys', error)
    }
  }

  /*
  * Temporary removed double ratchet system
  * TODO: add DH ratchet (KEM)
  */


  private static async prepareSymmetricStep(roomID: string, session: SessionState, accountID: string, accountName: string): Promise<void> {
    try {
      const info : Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
      const salt : Uint8Array<ArrayBufferLike> = randomBytes(32);
      const rootKey : Uint8Array<ArrayBufferLike> = CryptoCore.mixKeys(salt,session.rootKey,info);

      this.temporarySessions.set(roomID, {
        ...session,
        // messageKey: messageKey,
        rootKey: rootKey,
        salt: salt,
        capsule: undefined
      })

      const dataToSave = {
        rootKey: Buffer.from(rootKey).toString('base64'),
        sendCounter: session.sendCounter,
        lastSenderID: session.lastSenderID
      }

      await StorageService.saveSession(roomID, JSON.stringify(dataToSave), accountID, accountName)
    } catch (error) {
      console.error('Failed prepare symmetric ratchet', error)
    }
  }

  static async initializeEncrypt(authKey: string, content: string, roomID: string, senderID: string, receiverID: string, accountName: string): Promise<pkgStructure> {
    const session: SessionState | null = await this.getOrLoadSession(roomID, senderID, accountName);

    if (session === null) {
      await this.preparePreKeyCapsule(roomID, authKey, receiverID, senderID, accountName)
    } else {
      await this.prepareSymmetricStep(roomID, session, senderID, accountName)
    }

    const readySession = this.temporarySessions.get(roomID)
    if (!readySession || !readySession.rootKey) {
      throw new Error('Failed to initialize encrypt session')
    }


    console.log('Session key used to encrypt: ' + Buffer.from(readySession.rootKey).toString('base64'));
    const encrypted = CryptoCore.encryptData(content, readySession.rootKey);


    const pkg = {
      roomID: roomID,
      senderID: senderID,
      messageNumber: readySession.sendCounter,
      opkId: readySession.opkId ? readySession.opkId : null,
      salt: readySession.salt ? Buffer.from(readySession.salt).toString('base64') : null,
      capsule: readySession.capsule || null,
      ephemeralPubKey: null,
      content: Buffer.from(encrypted.cipherText).toString('base64'),
      nonce: Buffer.from(encrypted.nonce).toString('base64'),
      isDeleted: false
    }


    this.temporarySessions.delete(roomID);

    return pkg
  }

  private static decapsulateOpkCapsule(capsuleSPK: string, capsuleOPK: string, roomID: string, spkPrivateKey: string | null, opkPrivateKey: string | null, identityPubKey: string | null, senderID : string): void {
    const ss1: Uint8Array = CryptoCore.decapsulate(Buffer.from(capsuleSPK, 'base64'), Buffer.from(spkPrivateKey as string, 'base64'));
    const ss2: Uint8Array = CryptoCore.decapsulate(Buffer.from(capsuleOPK, 'base64'), Buffer.from(opkPrivateKey as string, 'base64'));

    const info : Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
    const rootKey: Uint8Array = hkdf(sha256, ss1, ss2, info, 32);


    this.temporarySessions.set(roomID, {
      rootKey: rootKey,
      lastSenderID: senderID
    });
  }

  private static deriveSymmetricStep(salt : Uint8Array , roomID: string, session: SessionState | null) : void {
    if (!session) {
      throw new Error('Failed to derive symmetric step');
    }
    const info: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
    const newRootKey : Uint8Array<ArrayBufferLike> = CryptoCore.mixKeys(salt, session.rootKey, info);
    this.temporarySessions.set(roomID, {
      rootKey: newRootKey,
    })
  }


  static async initializeDecrypt(pkg: pkgStructure, roomID: string, account: string, accountID: string): Promise<string> {
    try {
    const session: SessionState | null = await this.getOrLoadSession(roomID, accountID, account);
    if (pkg.capsule !== null) {
      if (pkg.capsule.includes('|')) {
        const spkPrivateKey = await StorageService.getSigningKey(account, account)
        const opkPrivateKey = await StorageService.getOneTimeKey(account, pkg.opkId as string, account)
        const identityPubKey = await StorageService.getPubIdentityKey(account, account)

        if (spkPrivateKey !== null && opkPrivateKey !== null && identityPubKey !== null) {
          const [capsuleSPK, capsuleOPK] = pkg.capsule.split('|')
          this.decapsulateOpkCapsule(capsuleSPK, capsuleOPK, roomID, spkPrivateKey, opkPrivateKey, identityPubKey, pkg.senderID)
        } else {
          throw new Error('Failed to initialize decrypt session: OPK , SPK, OR IDENTITY NOT FOUND')
        }
      }
    } else {
      if (!pkg.salt) {
        throw new Error('Failed to initialize decrypt session: salt not found');
      }
      this.deriveSymmetricStep(Buffer.from(pkg.salt,'base64'), roomID, session);
    }

      // if (!session) {
      //   throw new Error('Failed to initialize decrypt session: SESSION not found');
      // }

      const tempData : SessionState | undefined = this.temporarySessions.get(roomID);
      console.log("key used for decrypt" + Buffer.from(tempData?.rootKey).toString("base64"));
      const decrypted : string = CryptoCore.decryptData(Buffer.from(pkg.content, 'base64'), Buffer.from(pkg.nonce, 'base64'), tempData?.rootKey as Uint8Array)

      const dataToSave = {
        rootKey: Buffer.from(tempData?.rootKey as Uint8Array).toString('base64'),
        sendCounter: 0,
        // lastSenderID: session.lastSenderID,
      }

      await StorageService.saveSession(roomID, JSON.stringify(dataToSave), accountID, account);
      this.temporaryDecryptData.delete(roomID);

      return decrypted
    } catch (e) {
      console.error('Decryption failed:', e);
    }
  }
}

export default ProtocolService


