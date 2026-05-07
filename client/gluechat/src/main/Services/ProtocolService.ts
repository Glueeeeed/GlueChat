import { SessionState, StorageService} from './StorageService'
import { NetworkService } from './NetworkService'
import { CryptoCore, KeyPair } from './CryptoCore'
import {RatchetService} from "./RatchetService";
import {randomBytes} from "@noble/post-quantum/utils.js";

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
  messageKey : Uint8Array
}


abstract class ProtocolService {
  private static activeSessions = new Map<string, SessionState>()
  private static temporarySessions = new Map<string, SessionState>()
  private static temporaryDecryptData = new Map<string, decryptData>()

  private static async getOrLoadSession(roomID: string): Promise<SessionState | null> {
    try {
      if (this.activeSessions.has(roomID)) {
        return this.activeSessions.get(roomID)!
      }

      const stored = await StorageService.getSession(roomID)
      if (stored) {
        const data = JSON.parse(stored)
        const session: SessionState = {
          ...data,
          rootKey: Buffer.from(data.rootKey, 'base64'),
          alicePrivateKey: Buffer.from(data.alicePrivateKey, 'base64'),
          bobPublicKey: Buffer.from(data.bobPublicKey, 'base64')
        }

        this.activeSessions.set(roomID, session)
        return session
      }

      return null
    } catch (error) {
      console.error('Failed to get session', error)
      return null
    }
  }

  private static async preparePreKeyCapsule(
    roomID: string,
    authKey: string,
    receiverID: string,
    senderID: string
  ): Promise<void> {
    try {
      const preKeys = await NetworkService.getPreKeys(authKey, receiverID)
      const { cipherText: capsuleSPK, sharedSecret: ssSPK } = CryptoCore.encapsulate(
        Buffer.from(preKeys.spk, 'base64')
      )
      const { cipherText: capsuleOPK, sharedSecret: ssOPK } = CryptoCore.encapsulate(
        Buffer.from(preKeys.opk, 'base64')
      )
      const { nextChainKey, messageKey } = CryptoCore.mixKeys(
        ssSPK,
        ssOPK,
        Buffer.from(preKeys.pubKey, 'base64')
      )


      const nextEphemeral: KeyPair = CryptoCore.generateNewKeyPair()
      const capsule: string = Buffer.from(capsuleSPK).toString('base64') + '|' + Buffer.from(capsuleOPK).toString('base64')

      // SAVE SESSION IN RAM

      this.activeSessions.set(roomID, {
        rootKey: nextChainKey,
        alicePrivateKey: nextEphemeral.secretKey,
        bobPublicKey: nextEphemeral.publicKey,
        sendCounter: 1,
        lastSenderID: senderID
      })

      this.temporarySessions.set(roomID, {
        rootKey: nextChainKey,
        messageKey: messageKey,
        capsule: capsule,
        opkId: preKeys.opkId,
        alicePrivateKey: nextEphemeral.secretKey,
        bobPublicKey: nextEphemeral.publicKey,
        sendCounter: 1,
        lastSenderID: senderID
      })

      // SAVE SESSION IN KEYTAR

      const dataToSave = {
        rootKey: Buffer.from(nextChainKey).toString('base64'),
        alicePrivateKey: Buffer.from(nextEphemeral.secretKey).toString('base64'),
        bobPublicKey: Buffer.from(nextEphemeral.publicKey).toString('base64'),
        sendCounter: 1,
        lastSenderID: senderID
      }
      await StorageService.saveSession(roomID, JSON.stringify(dataToSave))
    } catch (error) {
      console.error('Failed prepare session with pre keys', error)
    }
  }

  private static async prepareCapsule(
    roomID: string,
    senderID: string,
    session: SessionState
  ): Promise<void> {
    try {
      const { cipherText: capsule, sharedSecret } = CryptoCore.encapsulate(session.bobPublicKey)

      const salt: Uint8Array<ArrayBufferLike> = randomBytes(32)

      const { messageKey } = RatchetService.rotate(session, sharedSecret, salt, roomID)

      session.sendCounter = 1
      session.lastSenderID = senderID

      this.temporarySessions.set(roomID, {
        ...session,
        messageKey: messageKey,
        capsule: Buffer.from(capsule).toString('base64'),
        salt: salt
      })

      const dataToSave = {
        rootKey: Buffer.from(session.rootKey).toString('base64'),
        alicePrivateKey: Buffer.from(session.alicePrivateKey).toString('base64'),
        bobPublicKey: Buffer.from(session.bobPublicKey).toString('base64'),
        sendCounter: 1,
        lastSenderID: senderID
      }

      await StorageService.saveSession(roomID, JSON.stringify(dataToSave))
    } catch (error) {
      console.error('Failed prepare session with capsule', error)
    }
  }

  private static async prepareSymmetricStep(roomID: string, session: SessionState): Promise<void> {
    try {
      const salt = randomBytes(32)

      const rootKey = new Uint8Array(session.rootKey)
      const { messageKey } = RatchetService.rotate(session, rootKey, salt, roomID)

      this.temporarySessions.set(roomID, {
        ...session,
        messageKey: messageKey,
        salt: salt,
        capsule: undefined
      })

      const dataToSave = {
        rootKey: Buffer.from(session.rootKey).toString('base64'),
        alicePrivateKey: Buffer.from(session.alicePrivateKey).toString('base64'),
        bobPublicKey: Buffer.from(session.bobPublicKey).toString('base64'),
        sendCounter: 1,
        lastSenderID: session.lastSenderID
      }

      await StorageService.saveSession(roomID, JSON.stringify(dataToSave))
    } catch (error) {
      console.error('Failed prepare symmetric ratchet', error)
    }
  }

  static async initializeEncrypt(
    authKey: string,
    content: string,
    roomID: string,
    senderID: string,
    receiverID: string
  ): Promise<pkgStructure> {
    const session: SessionState | null = await this.getOrLoadSession(roomID)

    if (session === null) {
      await this.preparePreKeyCapsule(roomID, authKey, receiverID, senderID)
    } else if (session.lastSenderID !== senderID || session.sendCounter >= 5) {
      await this.prepareCapsule(roomID, senderID, session)
    } else {
      await this.prepareSymmetricStep(roomID, session)
    }

    const readySession = this.temporarySessions.get(roomID)
    if (!readySession || !readySession.messageKey) {
      throw new Error('Failed to initialize encrypt session')
    }

    const encrypted = CryptoCore.encryptData(content, readySession.messageKey)





    const pkg = {
      roomID: roomID,
      senderID: senderID,
      messageNumber: readySession.sendCounter,
      opkId: readySession.opkId ? readySession.opkId : null,
      salt: readySession.salt ? Buffer.from(readySession.salt).toString('base64') : null,
      capsule: readySession.capsule || null,
      ephemeralPubKey: Buffer.from(readySession.bobPublicKey).toString('base64'),
      content: Buffer.from(encrypted.cipherText).toString('base64'),
      nonce: Buffer.from(encrypted.nonce).toString('base64'),
      isDeleted: false
    }


    this.temporarySessions.delete(roomID)

    return pkg
  }

  private static decapsulateOpkCapsule(
    capsuleSPK: string,
    capsuleOPK: string,
    roomID: string,
    spkPrivateKey: string | null,
    opkPrivateKey: string | null,
    identityPubKey: string | null
  ): void {
    const ss1: Uint8Array = CryptoCore.decapsulate(
      Buffer.from(capsuleSPK, 'base64'),
      Buffer.from(spkPrivateKey as string, 'base64')
    )
    const ss2: Uint8Array = CryptoCore.decapsulate(
      Buffer.from(capsuleOPK, 'base64'),
      Buffer.from(opkPrivateKey as string, 'base64')
    )
    const { nextChainKey, messageKey } = CryptoCore.mixKeys(
      ss1,
      ss2,
      Buffer.from(identityPubKey as string, 'base64')
    )

    this.temporaryDecryptData.set(roomID, {
      nextChainKey: nextChainKey,
      messageKey: messageKey
    })
  }

  private static decapsulateCapsule(
    capsule: string,
    privateKey: Uint8Array,
    session: SessionState,
    salt: string,
    roomID: string
  ): void {
    const ss: Uint8Array = CryptoCore.decapsulate(
      Buffer.from(capsule, 'base64'),
      privateKey as Uint8Array
    )
    const { nextChainKey, messageKey } = RatchetService.rotate(
      session as SessionState,
      ss,
      Buffer.from(salt, 'base64'),
      roomID
    )


    this.temporaryDecryptData.set(roomID, {
      nextChainKey: nextChainKey,
      messageKey: messageKey
    })
  }

  static async initializeDecrypt(
    pkg: pkgStructure,
    roomID: string,
    account: string
  ): Promise<string> {
    const session: SessionState | null = await this.getOrLoadSession(roomID)
    if (pkg.capsule !== null) {
      if (pkg.capsule.includes('|')) {
        const spkPrivateKey = await StorageService.getSigningKey(account)
        const opkPrivateKey = await StorageService.getOneTimeKey(account, pkg.opkId as string)
        const identityPubKey = await StorageService.getPubIdentityKey(account)

        console.log(pkg.opkId + ':' + opkPrivateKey)
        console.log(spkPrivateKey, opkPrivateKey, identityPubKey)

        if (spkPrivateKey !== null && opkPrivateKey !== null && identityPubKey !== null) {
          const [capsuleSPK, capsuleOPK] = pkg.capsule.split('|')
          console.log(spkPrivateKey, opkPrivateKey, identityPubKey)
          this.decapsulateOpkCapsule(
            capsuleSPK,
            capsuleOPK,
            roomID,
            spkPrivateKey,
            opkPrivateKey,
            identityPubKey
          )
        } else {
          console.log()
          throw new Error('Failed to initialize decrypt session')
        }
      } else {
        this.decapsulateCapsule(
          pkg.capsule,
          session?.alicePrivateKey as Uint8Array,
          session as SessionState,
          pkg.salt as string,
          roomID
        )
      }
    } else {
      const { nextChainKey, messageKey } = RatchetService.rotate(
        session as SessionState,
        session?.rootKey as Uint8Array,
        Buffer.from(pkg.salt as string, 'base64'),
        roomID
      )
      this.temporaryDecryptData.set(roomID, {
        nextChainKey: nextChainKey,
        messageKey: messageKey
      })
    }

    try {
      const decryptData = this.temporaryDecryptData.get(roomID)
      if (!decryptData) throw new Error('Decryption data not prepared')

      const decrypted = CryptoCore.decryptData(
        Buffer.from(pkg.content, 'base64'),
        Buffer.from(pkg.nonce, 'base64'),
        decryptData.messageKey
      )

      const currentSession = this.activeSessions.get(roomID)!
      currentSession.lastSenderID = pkg.senderID

      if (pkg.ephemeralPubKey) {
        currentSession.bobPublicKey = Buffer.from(pkg.ephemeralPubKey, 'base64')
      }

      const dataToSave = {
        rootKey: Buffer.from(currentSession.rootKey).toString('base64'),
        alicePrivateKey: Buffer.from(currentSession.alicePrivateKey).toString('base64'),
        bobPublicKey: Buffer.from(currentSession.bobPublicKey).toString('base64'),
        sendCounter: currentSession.sendCounter,
        lastSenderID: currentSession.lastSenderID
      }

      await StorageService.saveSession(roomID, JSON.stringify(dataToSave))
      this.temporaryDecryptData.delete(roomID)

      return decrypted
    } catch (e) {
      console.error('Decryption failed:', e)
      throw e
    }
  }
}

export default ProtocolService


