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

  private static async getOrLoadSession(roomID: string,accountID: string): Promise<SessionState | null> {
    try {
      if (this.activeSessions.has(roomID)) {
        return this.activeSessions.get(roomID)!
      }
      const stored = await StorageService.getSession(roomID,accountID)
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

  private static async preparePreKeyCapsule(roomID: string, authKey: string, receiverID: string, senderID: string): Promise<void> {
    try {
      const preKeys = await NetworkService.getPreKeys(authKey, receiverID)
      const { cipherText: capsuleSPK, sharedSecret: ssSPK } = CryptoCore.encapsulate(Buffer.from(preKeys.spk, 'base64'));
      const { cipherText: capsuleOPK, sharedSecret: ssOPK } = CryptoCore.encapsulate(Buffer.from(preKeys.opk, 'base64'));
      const info = new TextEncoder().encode(roomID)
      const rootKey : Uint8Array = hkdf(sha256, ssSPK, ssOPK, info, 32)
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

      // SAVE SESSION IN KEYTAR

      const dataToSave = {
        rootKey: Buffer.from(rootKey).toString('base64'),
        sendCounter: 1,
        lastSenderID: senderID
      }

      await StorageService.saveSession(roomID, JSON.stringify(dataToSave), senderID)
    } catch (error) {
      console.error('Failed prepare session with pre keys', error)
    }
  }

  /*
  * Temporary removed ratcheting system
  * TODO: fix desynchronization ratchet state
  */


  private static async prepareSymmetricStep(roomID: string, session: SessionState,accountID: string): Promise<void> {
    try {
      const salt = randomBytes(32)

      this.temporarySessions.set(roomID, {
        ...session,
        // messageKey: messageKey,
        rootKey: session.rootKey,
        salt: salt,
        capsule: undefined
      })

      const dataToSave = {
        rootKey: Buffer.from(session.rootKey).toString('base64'),
        sendCounter: session.sendCounter,
        lastSenderID: session.lastSenderID
      }

      await StorageService.saveSession(roomID, JSON.stringify(dataToSave),accountID)
    } catch (error) {
      console.error('Failed prepare symmetric ratchet', error)
    }
  }

  static async initializeEncrypt(authKey: string, content: string, roomID: string, senderID: string, receiverID: string): Promise<pkgStructure> {
    const session: SessionState | null = await this.getOrLoadSession(roomID,senderID);

    if (session === null) {
      await this.preparePreKeyCapsule(roomID, authKey, receiverID, senderID)
    } else {
      await this.prepareSymmetricStep(roomID, session,senderID)
    }

    const readySession = this.temporarySessions.get(roomID)
    if (!readySession || !readySession.rootKey) {
      throw new Error('Failed to initialize encrypt session')
    }


    const encrypted = CryptoCore.encryptData(content, readySession.rootKey)


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


    this.temporarySessions.delete(roomID)

    return pkg
  }

  private static decapsulateOpkCapsule(capsuleSPK: string, capsuleOPK: string, roomID: string, spkPrivateKey: string | null, opkPrivateKey: string | null, identityPubKey: string | null, senderID : string): void {
    const ss1: Uint8Array = CryptoCore.decapsulate(Buffer.from(capsuleSPK, 'base64'), Buffer.from(spkPrivateKey as string, 'base64'));
    const ss2: Uint8Array = CryptoCore.decapsulate(Buffer.from(capsuleOPK, 'base64'), Buffer.from(opkPrivateKey as string, 'base64'));

    const info = new TextEncoder().encode(roomID);
    const rootKey: Uint8Array = hkdf(sha256, ss1, ss2, info, 32);



    this.activeSessions.set(roomID, {
      rootKey: rootKey,
      sendCounter: 0,
      lastSenderID: senderID
    });
  }


  static async initializeDecrypt(pkg: pkgStructure, roomID: string, account: string, accountID: string): Promise<string> {
    try {
    const session: SessionState | null = await this.getOrLoadSession(roomID,accountID);
    if (pkg.capsule !== null) {
      if (pkg.capsule.includes('|')) {
        const spkPrivateKey = await StorageService.getSigningKey(account)
        const opkPrivateKey = await StorageService.getOneTimeKey(account, pkg.opkId as string)
        const identityPubKey = await StorageService.getPubIdentityKey(account)

        if (spkPrivateKey !== null && opkPrivateKey !== null && identityPubKey !== null) {
          const [capsuleSPK, capsuleOPK] = pkg.capsule.split('|')
          this.decapsulateOpkCapsule(capsuleSPK, capsuleOPK, roomID, spkPrivateKey, opkPrivateKey, identityPubKey, pkg.senderID)
        } else {
          console.log()
          throw new Error('Failed to initialize decrypt session')
        }
      }

    }

      if (!session) {
        throw new Error('Failed to initialize decrypt session')
      }
      const decrypted : string = CryptoCore.decryptData(Buffer.from(pkg.content, 'base64'), Buffer.from(pkg.nonce, 'base64'), session.rootKey,)
      session.lastSenderID = pkg.senderID;
      session.sendCounter += 1

      const dataToSave = {
        rootKey: Buffer.from(session.rootKey).toString('base64'),
        sendCounter: session.sendCounter,
        lastSenderID: session.lastSenderID
      }

      await StorageService.saveSession(roomID, JSON.stringify(dataToSave), accountID)
      this.temporaryDecryptData.delete(roomID)

      return decrypted
    } catch (e) {
      console.error('Decryption failed:', e);
    }
  }
}

export default ProtocolService


