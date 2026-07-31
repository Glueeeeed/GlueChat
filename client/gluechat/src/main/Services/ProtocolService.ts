import { SessionState, StorageService} from './StorageService'
import { NetworkService, preKeysPackage } from './NetworkService'
import { CryptoCore, EncryptedData } from './CryptoCore'
import {randomBytes} from "@noble/post-quantum/utils.js";
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'
import log from 'electron-log/main'


interface pkgStructure {
  deviceId: string
  roomID: string,
  senderId: string,
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
  private static bobDevices: string[] = []
  private static temporarySessions = new Map<string, SessionState>()
  private static temporaryDecryptData = new Map<string, decryptData>()

  private static async getOrLoadSession(roomID: string, accountID: string, deviceId: string, accountName: string): Promise<SessionState | null> {
    try {
      const combinedName : string = StorageService.generateCombinedName(roomID, accountID, deviceId)
      if (this.activeSessions.has(combinedName)) {
        return this.activeSessions.get(combinedName)!
      }
      const stored : string | null = await StorageService.getSession(accountName, combinedName)
      if (stored) {
        const data = JSON.parse(stored)
        const session: SessionState = {
          ...data,
          rootKey: Buffer.from(data.rootKey, 'base64')
        }

        this.activeSessions.set(combinedName, session)
        log.verbose(`Session loaded for key: ${combinedName}`)
        return session
      }

      return null
    } catch (error) {
      log.error('Failed to get session', error)
      throw error
    }
  }

  private static async preparePreKeyCapsule(roomID: string, authKey: string, receiverID: string, senderID: string, accountName: string, deviceId: string, preKeys: preKeysPackage): Promise<void> {
    try {
      log.debug(`Starting pre keys capsule for room: ${roomID}, device: ${deviceId}`)

      const identityKey = await NetworkService.getIdentityKey(authKey, deviceId, receiverID);

      if (!preKeys.signature || !preKeys.spk || !preKeys.opk || !identityKey) {
        log.error(`Data is missing for device: ${deviceId}:`, {
          signature: !!preKeys.signature,
          spk: !!preKeys.spk,
          opk: !!preKeys.opk,
          identityKey: !!identityKey
        });
        return
      }
      const isValid = CryptoCore.verifySignature(Buffer.from(preKeys.signature, 'base64'), Buffer.from(preKeys.spk, 'base64'), Buffer.from(identityKey, 'base64'));
      if (!isValid) {
        throw new Error('Failed to verify signature of pre-key')
      }

      const { cipherText: capsuleSPK, sharedSecret: ssSPK } = CryptoCore.encapsulate(Buffer.from(preKeys.spk, 'base64'));
      const { cipherText: capsuleOPK, sharedSecret: ssOPK } = CryptoCore.encapsulate(Buffer.from(preKeys.opk, 'base64'));
      const info: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
      const rootKey: Uint8Array = hkdf(sha256, ssSPK, ssOPK, info, 32);

      const capsule: string = Buffer.from(capsuleSPK).toString('base64') + '|' + Buffer.from(capsuleOPK).toString('base64');

      // SAVE SESSION IN RAM

      const combinedMapKey: string = StorageService.generateCombinedName(
        roomID,
        receiverID,
        deviceId
      );

      this.activeSessions.set(combinedMapKey, {
        rootKey: rootKey,
        sendCounter: 1,
        lastSenderID: senderID
      });

      this.temporarySessions.set(combinedMapKey, {
        rootKey: rootKey,
        capsule: capsule,
        opkId: preKeys.opkId,
        sendCounter: 1,
        lastSenderID: senderID
      });

      // SAVE SESSION IN DATABASE

      const dataToSave = {
        rootKey: Buffer.from(rootKey).toString('base64'),
        sendCounter: 1,
        lastSenderID: senderID
      };

      await StorageService.saveSession(JSON.stringify(dataToSave), accountName, combinedMapKey)
      log.debug(`Successfully prepared pre-key session for device: ${deviceId}`)
    } catch (error) {
      log.error('Failed prepare session with pre keys', error)
    }
  }

  /*
   * Temporary removed double ratchet system
   * TODO: add DH ratchet (KEM)
   */

  private static async prepareSymmetricStep(receiverID: string, roomID: string, accountName: string, deviceId: string): Promise<void> {
    try {
      log.debug(`Starting symmetric step for room: ${roomID}, device: ${deviceId}`)

      const combinedMapKey: string = StorageService.generateCombinedName(roomID, receiverID, deviceId);
      log.debug('combinedMapKey: ', combinedMapKey);

      const session = await this.getOrLoadSession(roomID, receiverID, deviceId, accountName);
      if (!session) {
        log.error('Failed to prepare symmetric step: session not found');
        return
      }

      const info: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
      const salt: Uint8Array<ArrayBufferLike> = randomBytes(32);
      const rootKey: Uint8Array<ArrayBufferLike> = CryptoCore.mixKeys(salt, session.rootKey, info);

      this.temporarySessions.set(combinedMapKey, {
        ...session,
        rootKey: rootKey,
        salt: salt,
        capsule: undefined
      });

      const dataToSave = {
        rootKey: Buffer.from(rootKey).toString('base64'),
        sendCounter: session.sendCounter,
        lastSenderID: session.lastSenderID
      }

      await StorageService.saveSession(JSON.stringify(dataToSave), accountName, combinedMapKey);
      this.activeSessions.delete(combinedMapKey);

      log.debug(`Successfully prepare symmetric step: ${combinedMapKey}`);
    } catch (error) {
      log.error('Failed prepare symmetric ratchet', error);
    }
  }

  static async initializeEncrypt(authKey: string, content: string, roomID: string, senderID: string, receiverID: string, accountName: string): Promise<pkgStructure[]> {
    this.bobDevices = [];
    this.temporarySessions.clear();
    const pkgs: pkgStructure[] = [];

    log.info(`Starting encrypt process for room: ${roomID}, sender: ${senderID}, receiver: ${receiverID}`);

    const devices = await NetworkService.getAllBobDevices(authKey, receiverID);
    if (devices.length <= 0) {
      log.error('No devices found for this user ID');
      throw new Error('No devices found for this user ID');
    }
    const myDeviceId = await StorageService.generateDeviceId();
    const filteredDevices = devices.filter((d) => d.deviceId !== myDeviceId);
    const preKeysPackages = await NetworkService.getPreKeys(authKey, receiverID);


    for (const device of filteredDevices) {
      const deviceId : string = device.deviceId;
      this.bobDevices.push(deviceId);
      const session : SessionState | null = await this.getOrLoadSession(roomID, receiverID, deviceId, accountName);
      if (session === null) {
        const preKeys : preKeysPackage | undefined = preKeysPackages.find((pk) => pk.deviceId === deviceId);
        if (!preKeys) {
          log.error('No prekeys for device', deviceId);
          continue;
        }
        log.debug('preparing KeyCapsule for device: ', deviceId);
        await this.preparePreKeyCapsule(roomID, authKey, receiverID, senderID, accountName, deviceId, preKeys);
      } else {
        log.debug('preparing symmetric step for device: ', deviceId)
        await this.prepareSymmetricStep(receiverID, roomID, accountName, deviceId);
      }
    }

    // Key used to encrypt message for all devices
    const masterKey : Uint8Array<ArrayBufferLike> = randomBytes(32);

    for (const device of this.bobDevices) {
      const combinedMapKey: string = StorageService.generateCombinedName(roomID, receiverID, device);
      const readySession : SessionState | undefined = this.temporarySessions.get(combinedMapKey);
      if (!readySession || !readySession.rootKey) {
        log.error('No readySession found for this user ID', {
          readSession: !!readySession,
          rootKey: !!readySession?.rootKey,
        });
        continue;
      }

      // Message encrypted using a master key
      const encryptedMessage: EncryptedData = CryptoCore.encryptData(content, masterKey)
      log.info(`Message encrypted successfully`);

      // Encrypted master key for specific device
      const encryptedMessageKey: EncryptedData = CryptoCore.encryptData(masterKey, readySession.rootKey as Uint8Array);
      log.info(`Master key encrypted successfully for device: ${device}`);

      const pkg = {
        deviceId: device,
        roomID: roomID,
        senderId: senderID,
        receiverId: receiverID,
        accountName: accountName,
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
      };

      this.temporarySessions.delete(combinedMapKey);
      this.activeSessions.delete(combinedMapKey);
      pkgs.push(pkg);
    }

    log.info('Encryption process was successfully ended..');
    return pkgs;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private static decapsulateOpkCapsule(capsuleSPK: string, capsuleOPK: string, roomID: string, spkPrivateKey: string | null, opkPrivateKey: string | null,senderID: string, deviceId: string, accountID: string): void {
    log.debug(`Starting decapsulation for room: ${roomID}, device: ${deviceId}`);

    const ss1 : Uint8Array = CryptoCore.decapsulate(Buffer.from(capsuleSPK, 'base64'), Buffer.from(spkPrivateKey as string, 'base64'));
    const ss2 : Uint8Array = CryptoCore.decapsulate(Buffer.from(capsuleOPK, 'base64'), Buffer.from(opkPrivateKey as string, 'base64'));

    const info : Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
    const rootKey : Uint8Array = hkdf(sha256, ss1, ss2, info, 32);

    const combinedMapKey : string = StorageService.generateCombinedName(roomID, senderID, deviceId);
    this.temporarySessions.set(combinedMapKey, { rootKey: rootKey, lastSenderID: senderID });
    log.debug(`Successfully decapsulated OPK capsule for room: ${roomID}, device: ${deviceId}`);
  }

  private static deriveSymmetricStep(salt: Uint8Array, roomID: string, session: SessionState | null, deviceId: string, accountID: string): void {
    log.debug(`Deriving symmetric step for room: ${roomID}, device: ${deviceId}`);
    if (!session) {
      throw new Error('Failed to derive symmetric step');
    }
    const info: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(roomID);
    const newRootKey: Uint8Array<ArrayBufferLike> = CryptoCore.mixKeys(salt, session.rootKey, info);
    const combinedMapKey = StorageService.generateCombinedName(roomID, accountID, deviceId);
    this.temporarySessions.set(combinedMapKey, {
      rootKey: newRootKey
    });
    log.debug(`Successfuly deriving symmetric step for room: ${roomID}, device: ${deviceId}`);
  }

  static async initializeDecrypt(pkg: pkgStructure, roomID: string, account: string, accountID: string): Promise<string> {
    log.info(`Starting decrypt process for room: ${roomID}, sender: ${pkg.senderId}, device: ${pkg.deviceId}`);
    const deviceId: string = pkg.deviceId
    const session: SessionState | null = await this.getOrLoadSession(roomID, pkg.senderId, deviceId, account);

    if (!session) {
      log.warn('Decrypt Session might not found');
    }
    if (pkg.capsule !== null) {
      if (pkg.capsule.includes('|')) {
        log.debug(`Detected capsule, starting decapsulating for room: ${roomID}, device: ${deviceId}`);
        const spkPrivateKey : string | null = await StorageService.getSigningKey(account, account);
        const opkPrivateKey : string | null = await StorageService.getOneTimeKey(account, pkg.opkId as string, account);

        if (spkPrivateKey !== null && opkPrivateKey !== null) {
          const [capsuleSPK, capsuleOPK] = pkg.capsule.split('|');
          this.decapsulateOpkCapsule(capsuleSPK, capsuleOPK, roomID, spkPrivateKey, opkPrivateKey, pkg.senderId, deviceId, accountID);
          await StorageService.removeOneTimeKey(accountID, pkg.opkId as string, account);
        } else {
          log.error('Failed to initialize decrypt session: OPK , SPK, OR IDENTITY NOT FOUND');
          throw new Error('Failed to initialize decrypt session: OPK , SPK, OR IDENTITY NOT FOUND');
        }
      }
    } else {
      log.debug(`Starting  symmetric decrypt for room: ${roomID}, device: ${deviceId}`);
      if (!pkg.salt) {
        log.error('Failed to initialize decrypt session: salt not found');
        throw new Error('Failed to initialize decrypt session: salt not found');
      }
      this.deriveSymmetricStep(Buffer.from(pkg.salt, 'base64'), roomID, session, deviceId, pkg.senderId);
    }

    const combinedMapKey : string = StorageService.generateCombinedName(roomID, pkg.senderId, deviceId);

    const tempData: SessionState | undefined = this.temporarySessions.get(combinedMapKey);
    if (!tempData) {
      log.error('Failed to initialize decrypt session: SESSION not found');
      throw new Error('Failed to initialize decrypt session: SESSION not found');
    }

    log.debug(`Decrypting master key for room: ${roomID}, device: ${deviceId}`);

    let masterKey : Uint8Array = CryptoCore.decrypt(Buffer.from(pkg.encryptedMessageKey, 'base64'), Buffer.from(pkg.messageKeyNonce, 'base64'), tempData?.rootKey as Uint8Array);
    const decrypted : string = CryptoCore.decryptData(Buffer.from(pkg.content, 'base64'), Buffer.from(pkg.nonce, 'base64'), masterKey);

    // Overwrite master key with empty array
    masterKey = new Uint8Array(0);

    const dataToSave = {
      rootKey: Buffer.from(tempData?.rootKey as Uint8Array).toString('base64'),
      sendCounter: 0
      // lastSenderID: session.lastSenderID,
    }

    await StorageService.saveSession(JSON.stringify(dataToSave), account, combinedMapKey);
    this.temporaryDecryptData.delete(combinedMapKey);
    this.activeSessions.delete(combinedMapKey);
    log.info(`Successfully finished decrypt process for room: ${roomID}, senderId: ${pkg.senderId} , device: ${deviceId}`);

    return decrypted;
  }
}

export default ProtocolService


