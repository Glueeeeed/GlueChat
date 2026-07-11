import { SessionState, StorageService} from './StorageService'
import { NetworkService, preKeysPackage } from './NetworkService'
import { CryptoCore, EncryptedData } from './CryptoCore'
import {randomBytes} from "@noble/post-quantum/utils.js";
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'


interface pkgStructure {
  deviceId: string
  roomID: string,
  senderID: string,
  messageNumber: number,
  opkId: string | null,
  salt: string | null,
  capsule: string | null,
  ephemeralPubKey: string | null,
  content: string,
  nonce: string,
  encryptedMessageKey: string,
  messageKeyNonce: string,
  isDeleted: boolean,
}

interface decryptData {
  nextChainKey? : Uint8Array
  messageKey? : Uint8Array
}


abstract class ProtocolService {
  private static activeSessions = new Map<string, SessionState>()
  private static bobDevices : string[] = [];
  private static temporarySessions = new Map<string, SessionState>()
  private static temporaryDecryptData = new Map<string, decryptData>()

  private static async getOrLoadSession(roomID: string, accountID: string, accountName: string, deviceId : string): Promise<SessionState | null> {
    try {
      const combinedName: string = accountID + '-' + roomID + '-' + deviceId;
      if (this.activeSessions.has(combinedName)) {
        return this.activeSessions.get(combinedName)!
      }
      const stored = await StorageService.getSession(roomID, accountID, accountName,deviceId);
      if (stored) {
        const data = JSON.parse(stored)
        const session: SessionState = {
          ...data,
          rootKey: Buffer.from(data.rootKey, 'base64'),
        }

        this.activeSessions.set(combinedName, session)
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

      // Get all Bob devices (pre-keys per device)

      const preKeysPackages : preKeysPackage[] = await NetworkService.getPreKeys(authKey, receiverID);

      for (const preKeys of preKeysPackages) {
        const deviceId : string = preKeys.deviceId;


        const identityKey = await NetworkService.getIdentityKey(authKey,deviceId, receiverID);

        if (!preKeys.signature || !preKeys.spk || !preKeys.opk || !identityKey) {
          console.error(`Data is missing for device: ${deviceId}:`, {
            signature: !!preKeys.signature,
            spk: !!preKeys.spk,
            opk: !!preKeys.opk,
            identityKey: !!identityKey
          })
          continue
        }
        const isValid = CryptoCore.verifySignature(Buffer.from(preKeys.signature,'base64'), Buffer.from(preKeys.spk,'base64'), Buffer.from(identityKey,'base64'));
        if (!isValid) {
          throw new Error('Failed to verify signature of pre-key')
        }

        this.bobDevices.push(deviceId);
        const { cipherText: capsuleSPK, sharedSecret: ssSPK } = CryptoCore.encapsulate(Buffer.from(preKeys.spk, 'base64'));
        const { cipherText: capsuleOPK, sharedSecret: ssOPK } = CryptoCore.encapsulate(Buffer.from(preKeys.opk, 'base64'));
        const info: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
        const rootKey: Uint8Array = hkdf(sha256, ssSPK, ssOPK, info, 32);

        const capsule: string = Buffer.from(capsuleSPK).toString('base64') + '|' + Buffer.from(capsuleOPK).toString('base64')

        // SAVE SESSION IN RAM

        const combinedMapKey: string = senderID + '-' + roomID + '-' + deviceId

        this.activeSessions.set(combinedMapKey, {
          rootKey: rootKey,
          sendCounter: 1,
          lastSenderID: senderID
        })

        this.temporarySessions.set(combinedMapKey, {
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

        await StorageService.saveSession(roomID, JSON.stringify(dataToSave), senderID, accountName,deviceId)
      }

    } catch (error) {
      console.error('Failed prepare session with pre keys', error)
    }
  }

  /*
  * Temporary removed double ratchet system
  * TODO: add DH ratchet (KEM)
  */


  private static async prepareSymmetricStep(authKey: string, receiverID: string, roomID: string, accountID: string, accountName: string): Promise<void> {
    try {

      const devices = await NetworkService.getAllBobDevices(authKey,receiverID);

      for (const device of devices) {
        const deviceId : string = device.deviceId;
        const combinedMapKey: string = accountID + '-' + roomID + '-' + deviceId

        const session = await this.getOrLoadSession(roomID,accountID,accountName,deviceId);
        if (!session) {
          continue
        }


        const info: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID)
        const salt: Uint8Array<ArrayBufferLike> = randomBytes(32)
        const rootKey: Uint8Array<ArrayBufferLike> = CryptoCore.mixKeys(salt, session.rootKey, info)

        this.temporarySessions.set(combinedMapKey, {
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

        this.bobDevices.push(deviceId);

        await StorageService.saveSession(roomID, JSON.stringify(dataToSave), accountID, accountName,deviceId);
      }

    } catch (error) {
      console.error('Failed prepare symmetric ratchet', error)
    }
  }

  static async initializeEncrypt(authKey: string, content: string, roomID: string, senderID: string, receiverID: string, accountName: string): Promise<pkgStructure[]> {
    this.bobDevices = []
    this.temporarySessions.clear()
    const pkgs: pkgStructure[] = [];

    const devices = await NetworkService.getAllBobDevices(authKey, receiverID);

    for (const device of devices) {
      const session = await this.getOrLoadSession(roomID, senderID, accountName, device.deviceId);
      console.log("SESJA" + JSON.stringify(session));
      if (session === null) {
        await this.preparePreKeyCapsule(roomID, authKey, receiverID, senderID, accountName)
      } else {
        await this.prepareSymmetricStep(authKey, receiverID, roomID, senderID, accountName)
      }
    }



    // Key used to encrypt message for all devices
    const masterKey : Uint8Array<ArrayBufferLike> = randomBytes(32);

    for (const device of this.bobDevices) {
      const combinedMapKey: string = senderID + '-' + roomID + '-' + device;
      const readySession = this.temporarySessions.get(combinedMapKey);
      if (!readySession || !readySession.rootKey) {
        throw new Error('Failed to initialize encrypt session')
      }

      // Message encrypted using a master key
      const encryptedMessage : EncryptedData = CryptoCore.encryptData(content, masterKey);

      // Encrypted master key for specific device
      const encryptedMessageKey : EncryptedData = CryptoCore.encryptData(masterKey,readySession.rootKey as Uint8Array);

      const pkg = {
        deviceId: device,
        roomID: roomID,
        senderID: senderID,
        messageNumber: readySession.sendCounter as number,
        opkId: readySession.opkId ? readySession.opkId : null,
        salt: readySession.salt ? Buffer.from(readySession.salt).toString('base64') : null,
        capsule: readySession.capsule || null,
        ephemeralPubKey: null,
        content: Buffer.from(encryptedMessage.cipherText).toString('base64'),
        nonce: Buffer.from(encryptedMessage.nonce).toString('base64'),
        encryptedMessageKey: Buffer.from(encryptedMessageKey.cipherText).toString('base64'),
        messageKeyNonce: Buffer.from(encryptedMessageKey.nonce).toString('base64'),
        isDeleted: false
      }
      this.temporarySessions.delete(combinedMapKey);
      pkgs.push(pkg)
    }

    return pkgs
  }


  private static decapsulateOpkCapsule(capsuleSPK: string, capsuleOPK: string, roomID: string, spkPrivateKey: string | null, opkPrivateKey: string | null,senderID : string, deviceId: string): void {
    const ss1: Uint8Array = CryptoCore.decapsulate(Buffer.from(capsuleSPK, 'base64'), Buffer.from(spkPrivateKey as string, 'base64'));
    const ss2: Uint8Array = CryptoCore.decapsulate(Buffer.from(capsuleOPK, 'base64'), Buffer.from(opkPrivateKey as string, 'base64'));

    const info : Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
    const rootKey: Uint8Array = hkdf(sha256, ss1, ss2, info, 32);

    const combinedMapKey = `${senderID}-${roomID}-${deviceId}`
    this.temporarySessions.set(combinedMapKey, {
      rootKey: rootKey,
      lastSenderID: senderID
    });
  }

  private static deriveSymmetricStep(salt : Uint8Array , roomID: string, session: SessionState | null, deviceId: string) : void {
    if (!session) {
      throw new Error('Failed to derive symmetric step');
    }
    const info: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
    const newRootKey : Uint8Array<ArrayBufferLike> = CryptoCore.mixKeys(salt, session.rootKey, info);
    const combinedMapKey = `${roomID}-${deviceId}`
    this.temporarySessions.set(combinedMapKey, {
      rootKey: newRootKey,
    })
  }


  static async initializeDecrypt(pkg: pkgStructure, roomID: string, account: string, accountID: string): Promise<string> {
    const deviceId : string = pkg.deviceId;
    const session: SessionState | null = await this.getOrLoadSession(roomID, accountID, account, deviceId);
    if (pkg.capsule !== null) {
      if (pkg.capsule.includes('|')) {
        const spkPrivateKey = await StorageService.getSigningKey(account, account);
        const opkPrivateKey = await StorageService.getOneTimeKey(account, pkg.opkId as string, account);

        if (spkPrivateKey !== null && opkPrivateKey !== null) {
          const [capsuleSPK, capsuleOPK] = pkg.capsule.split('|');
          this.decapsulateOpkCapsule(capsuleSPK, capsuleOPK, roomID, spkPrivateKey, opkPrivateKey, pkg.senderID, deviceId);
          await StorageService.removeOneTimeKey(accountID, pkg.opkId as string, account);
        } else {
          throw new Error('Failed to initialize decrypt session: OPK , SPK, OR IDENTITY NOT FOUND')
        }
      }
    } else {
      if (!pkg.salt) {
        throw new Error('Failed to initialize decrypt session: salt not found');
      }
      this.deriveSymmetricStep(Buffer.from(pkg.salt, 'base64'), roomID, session, deviceId)
    }
    const combinedMapKey =
      pkg.capsule !== null
        ? `${pkg.senderID}-${roomID}-${pkg.deviceId}`
        : `${roomID}-${pkg.deviceId}`

    const tempData: SessionState | undefined = this.temporarySessions.get(combinedMapKey)
      if (!tempData) {
        throw new Error('Failed to initialize decrypt session: SESSION not found')
      }
      let masterKey : Uint8Array = CryptoCore.decrypt(Buffer.from(pkg.encryptedMessageKey, 'base64'), Buffer.from(pkg.messageKeyNonce, 'base64'), tempData?.rootKey as Uint8Array);
      const decrypted : string = CryptoCore.decryptData(Buffer.from(pkg.content, 'base64'), Buffer.from(pkg.nonce, 'base64'), masterKey);

      // Overwrite master key with empty array
      masterKey = new Uint8Array(0);

      const dataToSave = {
        rootKey: Buffer.from(tempData?.rootKey as Uint8Array).toString('base64'),
        sendCounter: 0,
        // lastSenderID: session.lastSenderID,
      }

      await StorageService.saveSession(roomID, JSON.stringify(dataToSave), accountID, account,deviceId);
      this.temporaryDecryptData.delete(combinedMapKey);

      return decrypted
  }
}

export default ProtocolService


