import { SessionState, StorageService } from './StorageService';
import { device, NetworkService, preKeysPackage } from './NetworkService';
import { CryptoCore, EncryptedData } from './CryptoCore';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import log from 'electron-log/main';

export interface PkgStructure {
  deviceId: string;
  roomID: string;
  senderId: string;
  receiverId: string;
  accountName: string;
  messageNumber: number;
  opkId: string | null;
  capsule: string | null;
  content: string;
  nonce: string;
  encryptedMessageKey: string;
  messageKeyNonce: string;
  isDeleted: boolean;
}

abstract class ProtocolService {
  public static async initializeEncrypt(
    authKey: string,
    content: string,
    roomID: string,
    senderID: string,
    receiverID: string,
    accountName: string
  ): Promise<PkgStructure[]> {
    log.info(`Starting encryption process for room: ${roomID}`);

    const devices: device[] = await NetworkService.getAllBobDevices(authKey, receiverID);
    if (!devices || devices.length === 0) {
      throw new Error('No target devices found for receiver');
    }

    const myDeviceId: string = await StorageService.generateDeviceId();
    const targetDevices: device[] = devices.filter((d) => d.deviceId !== myDeviceId);
    const preKeysPackages: preKeysPackage[] = await NetworkService.getPreKeys(authKey, receiverID);

    const pkgs: PkgStructure[] = [];

    const masterKey: Uint8Array<ArrayBufferLike> = CryptoCore.generateRandomBytes(32);
    const encryptedMessage: EncryptedData = CryptoCore.encryptData(content, masterKey);

    try {
      for (const device of targetDevices) {
        const deviceId: string = device.deviceId;
        let session: SessionState | null = await this.getOrLoadSession(roomID, receiverID, deviceId, accountName);
        let capsuleStr: string | null = null;
        let opkId: string | null = null;

        if (!session) {
          const preKey: preKeysPackage | undefined = preKeysPackages.find((pk): boolean => pk.deviceId === deviceId);
          if (!preKey) {
            log.error(`Skipping device ${deviceId}: No PreKeys available`);
            continue;
          }
          const handshakeResult = await this.createSenderHandshake(roomID, authKey, receiverID, senderID, accountName, deviceId, preKey);
          session = handshakeResult.session;
          capsuleStr = handshakeResult.capsuleStr;
          opkId = preKey.opkId;
        }

        const { nextRootKey, messageKey } = this.deriveSymmetricStep(session, roomID);

        const encryptedMasterKey: EncryptedData = CryptoCore.encryptData(masterKey, messageKey);

        const updatedSession: SessionState = {
          ...session,
          rootKey: nextRootKey,
          sendCounter: (session.sendCounter || 0) + 1,
          lastSenderID: senderID
        };

        const combinedMapKey: string = StorageService.generateCombinedName(roomID, receiverID, deviceId);
        await StorageService.saveSession(
          JSON.stringify({
            rootKey: Buffer.from(nextRootKey).toString('base64'),
            sendCounter: updatedSession.sendCounter,
            lastSenderID: senderID
          }),
          accountName,
          combinedMapKey
        );

        pkgs.push({
          deviceId,
          roomID,
          senderId: senderID,
          receiverId: receiverID,
          accountName,
          messageNumber: session.sendCounter as number,
          opkId,
          capsule: capsuleStr,
          content: Buffer.from(encryptedMessage.cipherText).toString('base64'),
          nonce: Buffer.from(encryptedMessage.nonce).toString('base64'),
          encryptedMessageKey: Buffer.from(encryptedMasterKey.cipherText).toString('base64'),
          messageKeyNonce: Buffer.from(encryptedMasterKey.nonce).toString('base64'),
          isDeleted: false
        });

        this.wipeBytes(messageKey, nextRootKey);
      }
    } finally {
      // Clear keys from RAM
      this.wipeBytes(masterKey);
    }

    log.info(`Successfully encrypted message for ${pkgs.length} devices`);
    return pkgs;
  }

  public static async initializeDecrypt(pkg: PkgStructure, roomID: string, account: string, accountID: string): Promise<string> {
    log.info(`Starting decryption for message #${pkg.messageNumber} from sender: ${pkg.senderId}`);
    const deviceId: string = pkg.deviceId;
    let session: SessionState | null = await this.getOrLoadSession(roomID, pkg.senderId, deviceId, account);

    if (pkg.capsule) {
      log.debug(`Capsule detected. Initializing receiver KEM decapsulation.`);
      const [capsuleSPK, capsuleOPK] = pkg.capsule.split('|');

      const spkPrivateKey: string | null = await StorageService.getSigningKey(account, account);
      const opkPrivateKey: string | null = await StorageService.getOneTimeKey(account, pkg.opkId!, account);

      if (!spkPrivateKey || !opkPrivateKey) {
        throw new Error('Decryption failed: Missing SPK or OPK private keys in local storage');
      }

      const ssSPK: Uint8Array<ArrayBufferLike> = CryptoCore.decapsulate(Buffer.from(capsuleSPK, 'base64'), Buffer.from(spkPrivateKey, 'base64'));
      const ssOPK: Uint8Array<ArrayBufferLike> = CryptoCore.decapsulate(Buffer.from(capsuleOPK, 'base64'), Buffer.from(opkPrivateKey, 'base64'));

      const rootKey: Uint8Array<ArrayBufferLike> = this.deriveRootKeyFromSecrets(ssSPK, ssOPK, roomID);
      this.wipeBytes(ssSPK, ssOPK);

      session = {
        rootKey,
        sendCounter: 1,
        lastSenderID: pkg.senderId
      };

      await StorageService.removeOneTimeKey(accountID, pkg.opkId!, account);
    }

    if (!session) {
      throw new Error(`No active session found to decrypt message from device: ${deviceId}`);
    }

    const { nextRootKey, messageKey } = this.deriveSymmetricStep(session, roomID);

    let masterKey: Uint8Array | null = null;
    let decryptedContent: string = '';

    try {
      masterKey = CryptoCore.decrypt(Buffer.from(pkg.encryptedMessageKey, 'base64'), Buffer.from(pkg.messageKeyNonce, 'base64'), messageKey);

      decryptedContent = CryptoCore.decryptData(Buffer.from(pkg.content, 'base64'), Buffer.from(pkg.nonce, 'base64'), masterKey);

      const combinedMapKey = StorageService.generateCombinedName(roomID, pkg.senderId, deviceId);
      await StorageService.saveSession(
        JSON.stringify({
          rootKey: Buffer.from(nextRootKey).toString('base64'),
          sendCounter: (session.sendCounter || 0) + 1,
          lastSenderID: pkg.senderId
        }),
        account,
        combinedMapKey
      );
    } finally {
      if (masterKey) this.wipeBytes(masterKey);
      this.wipeBytes(messageKey, nextRootKey);
    }

    log.info(`Message #${pkg.messageNumber} decrypted successfully.`);
    return decryptedContent;
  }

  private static wipeBytes(...buffers: (Uint8Array | null | undefined)[]): void {
    log.debug('Wiping keys from RAM...')
    for (const buf of buffers) {
      if (buf && buf.length > 0) {
        buf.fill(0);
      }
    }
  }

  private static deriveRootKeyFromSecrets(ssSPK: Uint8Array, ssOPK: Uint8Array, roomID: string): Uint8Array {
    const combinedSecrets = new Uint8Array(ssSPK.length + ssOPK.length);
    combinedSecrets.set(ssSPK, 0);
    combinedSecrets.set(ssOPK, ssSPK.length);

    const info: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(`PQXDH_ROOT_KEY_${roomID}`);
    const salt = new Uint8Array(32);

    const rootKey = hkdf(sha256, combinedSecrets, salt, info, 32);
    this.wipeBytes(combinedSecrets);
    return rootKey;
  }

  private static async getOrLoadSession(roomID: string, accountID: string, deviceId: string, accountName: string): Promise<SessionState | null> {
    try {
      const combinedName: string = StorageService.generateCombinedName(roomID, accountID, deviceId);
      const stored: string | null = await StorageService.getSession(accountName, combinedName);

      if (stored) {
        const data = JSON.parse(stored);
        return {
          ...data,
          rootKey: Buffer.from(data.rootKey, 'base64')
        };
      }
      return null;
    } catch (error) {
      log.error('Failed to get session from DB', error);
      throw error;
    }
  }

  private static async createSenderHandshake(
    roomID: string,
    authKey: string,
    receiverID: string,
    senderID: string,
    accountName: string,
    deviceId: string,
    preKey: preKeysPackage
  ): Promise<{
    session: SessionState;
    capsuleStr: string;
  }> {
    log.debug(`Executing PQ KEM Handshake for device: ${deviceId}`);

    const identityKey = await NetworkService.getIdentityKey(authKey, deviceId, receiverID);
    if (!preKey.signature || !preKey.spk || !preKey.opk || !identityKey) {
      log.debug("Prekey signature: " + !!preKey.signature + "SPK: " + !!preKey.spk + "OPK: " + !!preKey.opk + "Identity key: " + !!identityKey);
      throw new Error(`PreKey payload incomplete for device: ${deviceId}`);
    }

    const isValid = CryptoCore.verifySignature(
      Buffer.from(preKey.signature, 'base64'),
      Buffer.from(preKey.spk, 'base64'),
      Buffer.from(identityKey, 'base64')
    );
    if (!isValid) {
      throw new Error(`Signature verification failed for pre-key of device: ${deviceId}`);
    }

    const { cipherText: capsuleSPK, sharedSecret: ssSPK } = CryptoCore.encapsulate(Buffer.from(preKey.spk, 'base64'));
    const { cipherText: capsuleOPK, sharedSecret: ssOPK } = CryptoCore.encapsulate(Buffer.from(preKey.opk, 'base64'));

    log.debug('Generating root key and saving to DB.');
    const rootKey: Uint8Array<ArrayBufferLike> = this.deriveRootKeyFromSecrets(ssSPK, ssOPK, roomID);
    this.wipeBytes(ssSPK, ssOPK);

    const capsuleStr = `${Buffer.from(capsuleSPK).toString('base64')}|${Buffer.from(capsuleOPK).toString('base64')}`;

    const session: SessionState = {
      rootKey,
      sendCounter: 1,
      lastSenderID: senderID,
      opkId: preKey.opkId
    };

    const combinedMapKey: string = StorageService.generateCombinedName(roomID, receiverID, deviceId);
    const dataToSave = {
      rootKey: Buffer.from(rootKey).toString('base64'),
      sendCounter: 1,
      lastSenderID: senderID
    };
    await StorageService.saveSession(JSON.stringify(dataToSave), accountName, combinedMapKey);
    log.debug('Saved session to DB.');
    log.debug(`PQ KEM Handshake for device ${deviceId} ended. `);


    return { session, capsuleStr };
  }

  private static deriveSymmetricStep(
    session: SessionState,
    roomID: string
  ): {
    nextRootKey: Uint8Array;
    messageKey: Uint8Array;
  } {
    log.debug(`Deriving symmetric key for session: ${session.sendCounter}`);
    const infoMessage: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(`MESSAGE_KEY_${roomID}_${session.sendCounter}`);
    const infoNextRoot: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(`NEXT_ROOT_KEY_${roomID}_${session.sendCounter}`);

    const messageKey: Uint8Array<ArrayBufferLike> = hkdf(sha256, session.rootKey, new Uint8Array(32), infoMessage, 32);
    const nextRootKey: Uint8Array<ArrayBufferLike> = hkdf(sha256, session.rootKey, new Uint8Array(32), infoNextRoot, 32);

    log.debug('Symmetric step ended.')
    return { nextRootKey, messageKey };
  }
}

export default ProtocolService;
