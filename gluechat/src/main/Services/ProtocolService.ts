import { SessionState, StorageService } from './StorageService';
import { device, NetworkService, preKeysPackage } from './NetworkService';
import { CryptoCore } from './CryptoCore';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import log from 'electron-log/main';
import { appSession } from '../index';
import { SessionKeyManager } from '../Managers/SessionKeyManager';
import { HistoryManager } from '../Managers/HistoryManager';

export interface PkgStructure {
  messageId: string;
  appSessionId: string;
  deviceId: string;
  roomID: string;
  senderId: string;
  receiverId: string;
  accountName: string;
  messageNumber: number;
  opkId: string | null;
  capsule: string | null;
  content: string;
  createdAt: string;
  encryptedMessageKey: string;
}

/**
 * Service managing post-quantum end-to-end encryption KEM protocol,
 * session establishment, key derivation, and message encryption/decryption across devices.
 */

abstract class ProtocolService {

  /**
   * Encrypts a plaintext message for all active devices of the recipient.
   *
   * @param authKey - Authorization key used to fetch recipient pre-keys and devices from the network.
   * @param content - Plaintext message content to encrypt.
   * @param roomID - Identifier of the chat room.
   * @param senderID - Identifier of the sender account.
   * @param receiverID - Identifier of the receiver account.
   * @param accountName - Name of the local user account in storage.
   * @returns Array of encrypted message packages, one for each target recipient device.
   * @throws Error if no target devices are found for the receiver.
   */
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

    const encoder = new TextEncoder();
    const masterKey: Uint8Array<ArrayBufferLike> = CryptoCore.generateRandomBytes(32);
    const encryptedMessage: Uint8Array = CryptoCore.encryptData(encoder.encode(content), masterKey);

    try {
      for (const device of targetDevices) {
        const deviceId: string = device.deviceId;
        let session: SessionState | null = await this.getOrLoadSession(roomID, receiverID, deviceId, accountName);
        let capsuleStr: string | null = null;
        let opkId: string | null = null;

        if (!session || appSession != session.appSession) {
          const preKey: preKeysPackage | undefined = preKeysPackages.find((pk): boolean => pk.deviceId === deviceId);
          if (!preKey) {
            log.error(`Skipping device ${deviceId}: No PreKeys available`);
            continue;
          }

          let changedAppSession: boolean = false;

          if (session) {
            changedAppSession = appSession != session?.appSession;
          }

          log.debug(
            `Current appSession: ${appSession}. App session has been changed: ${changedAppSession}. Previous Session: ${session?.appSession}`
          );

          const handshakeResult = await this.createSenderHandshake(
            roomID,
            authKey,
            receiverID,
            senderID,
            accountName,
            deviceId,
            preKey,
            session,
            changedAppSession
          );
          session = handshakeResult.session;
          capsuleStr = handshakeResult.capsuleStr;
          opkId = preKey.opkId;
        }

        const encryptedMasterKey: Uint8Array = CryptoCore.encryptData(masterKey, session.rootKey);

        const updatedSession: SessionState = {
          ...session,
          rootKey: session.rootKey,
          sendCounter: (session.sendCounter || 0) + 1,
          lastSenderID: senderID
        };

        const combinedMapKey: string = StorageService.generateCombinedName(roomID, receiverID, deviceId);
        await StorageService.saveSession(
          JSON.stringify({
            rootKey: Buffer.from(session.rootKey).toString('base64'),
            sendCounter: updatedSession.sendCounter,
            lastSenderID: senderID,
            appSession: appSession
          }),
          accountName,
          combinedMapKey
        );

        const messageId: string = Buffer.from(CryptoCore.generateRandomBytes(10)).toString('hex');
        const date = new Date();
        const dateString: string = date.toISOString();

        pkgs.push({
          messageId,
          appSessionId: appSession,
          deviceId,
          roomID,
          senderId: senderID,
          receiverId: receiverID,
          accountName,
          messageNumber: session.sendCounter as number,
          opkId,
          capsule: capsuleStr,
          content: Buffer.from(encryptedMessage).toString('base64'),
          createdAt: dateString,
          encryptedMessageKey: Buffer.from(encryptedMasterKey).toString('base64')
        });
      }
    } finally {
      // Clear keys from RAM
      this.wipeBytes(masterKey);
    }

    log.info(`Successfully encrypted message for ${pkgs.length} devices`);
    return pkgs;
  }

  /**
   * Decrypts an incoming encrypted message package into plaintext.
   *
   * @param pkg - Encrypted message package structure.
   * @param roomID - Identifier of the chat room.
   * @param account - Name of the local user account in storage.
   * @param accountID - Identifier of the local user account.
   * @returns Decrypted plaintext message.
   * @throws Error if SPK/OPK private keys are missing or no active session can be found/recovered.
   */
  public static async initializeDecrypt(pkg: PkgStructure, roomID: string, account: string, accountID: string): Promise<string> {
    log.info(`Starting decryption for message #${pkg.messageNumber} from sender: ${pkg.senderId}`);
    const deviceId: string = pkg.deviceId;
    const messageId: string = pkg.messageId;
    const messageExists : boolean = await  HistoryManager.checkIfMessageExists(account,messageId);

    if (messageExists) {
      throw new Error('Message already exists, stopping decryption');
    }

    const combinedMapKey: string = StorageService.generateCombinedName(roomID, pkg.senderId, deviceId);

    let session: SessionState | null = await this.getOrLoadSession(roomID, pkg.senderId, deviceId, account);
    const previousSession: SessionState | null = session;

    if (pkg.capsule) {
      log.debug(`Capsule detected. Initializing receiver KEM decapsulation.`);
      const [capsuleSPK, capsuleOPK] = pkg.capsule.split('|');

      const spkPrivateKey: string | null = await StorageService.getSigningKey(account, account);
      const opkPrivateKey: string | null = await StorageService.getOneTimeKey(account, pkg.opkId!, account);

      if (!spkPrivateKey || !opkPrivateKey) {
        throw new Error('Decryption failed: Missing SPK or OPK private keys in local storage');
      }

      let ssSPK: Uint8Array | null = null;
      let ssOPK: Uint8Array | null = null;
      let rootKey: Uint8Array | null = null;

      try {
        ssSPK = CryptoCore.decapsulate(Buffer.from(capsuleSPK, 'base64'), Buffer.from(spkPrivateKey, 'base64'));
        ssOPK = CryptoCore.decapsulate(Buffer.from(capsuleOPK, 'base64'), Buffer.from(opkPrivateKey, 'base64'));

        rootKey = this.deriveRootKeyFromSecrets(ssSPK, ssOPK, roomID);
        const incomingSessionId: string = pkg.appSessionId || appSession;

        await SessionKeyManager.saveRootKeyForSession(account, combinedMapKey, incomingSessionId, rootKey, 1);

        if (previousSession && previousSession.appSession && previousSession.appSession !== incomingSessionId) {
          await SessionKeyManager.handleSessionRotation(account, previousSession.appSession, incomingSessionId);
        }

        session = {
          appSession: incomingSessionId,
          rootKey,
          sendCounter: 1,
          lastSenderID: pkg.senderId
        };

        if (pkg.opkId) {
          await StorageService.removeOneTimeKey(accountID, pkg.opkId, account);
        }
      } finally {
        this.wipeBytes(ssSPK, ssOPK, rootKey);
      }
    }

    if (!session || (pkg.appSessionId && session.appSession !== pkg.appSessionId)) {
      log.debug(`Attempting to recover rootKey from SessionKeyManager for appSessionId: ${pkg.appSessionId}`);
      const historicalKey = await SessionKeyManager.getRootKeyForSession(account, combinedMapKey, pkg.appSessionId);

      if (historicalKey) {
        session = {
          appSession: pkg.appSessionId,
          rootKey: historicalKey.rootKey,
          sendCounter: historicalKey.sendCounter,
          lastSenderID: pkg.senderId
        };
      }
    }

    if (!session) {
      throw new Error(`No active session found to decrypt message from device: ${deviceId}`);
    }

    let decryptedContent: Uint8Array;
    let masterKey: Uint8Array | null = null;

    try {
      masterKey = CryptoCore.decrypt(Buffer.from(pkg.encryptedMessageKey, 'base64'), session.rootKey);
      decryptedContent = CryptoCore.decrypt(Buffer.from(pkg.content, 'base64'), masterKey);

      const updatedCounter = (session.sendCounter || 0) + 1;
      const currentAppSession = session.appSession || pkg.appSessionId || appSession;

      await StorageService.saveSession(
        JSON.stringify({
          rootKey: Buffer.from(session.rootKey).toString('base64'),
          sendCounter: updatedCounter,
          lastSenderID: pkg.senderId,
          appSession: currentAppSession
        }),
        account,
        combinedMapKey
      );

      await SessionKeyManager.saveRootKeyForSession(account, combinedMapKey, currentAppSession, session.rootKey, updatedCounter);
    } finally {
      this.wipeBytes(masterKey);
    }

    try {
      const decoder = new TextDecoder();
      log.info(`Message #${pkg.messageNumber} decrypted successfully.`);
      return decoder.decode(decryptedContent);
    } finally {
      this.wipeBytes(decryptedContent)
      this.wipeBytes(masterKey)
    }

  }

  /**
   * Overwrites sensitive byte buffers in memory with zeros.
   *
   * @param buffers - Byte buffers to zeroize.
   */
  private static wipeBytes(...buffers: (Uint8Array | null | undefined)[]): void {
    log.debug('Wiping keys from RAM...');
    for (const buf of buffers) {
      if (buf && buf.length > 0) {
        buf.fill(0);
      }
    }
  }

  /**
   * Derives a 32-byte session root key from SPK and OPK shared secrets using HKDF-SHA256.
   *
   * @param ssSPK - Shared secret from Signed Pre-Key KEM encapsulation/decapsulation.
   * @param ssOPK - Shared secret from One-Time Pre-Key KEM encapsulation/decapsulation.
   * @param roomID - Room identifier used as HKDF context info.
   * @returns The derived 32-byte root key.
   */
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

  /**
   * Retrieves and deserializes the stored session state for a specific room, account, and device.
   *
   * @param roomID - Room identifier.
   * @param accountID - Account identifier of the peer.
   * @param deviceId - Device identifier.
   * @param accountName - Local user account name in storage.
   * @returns The session state if found, or null otherwise.
   */
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

  /**
   * Performs the sender-side Post-Quantum KEM handshake with the recipient's pre-keys.
   *
   * @param roomID - Room identifier.
   * @param authKey - Authorization key for network requests.
   * @param receiverID - Identifier of the receiver.
   * @param senderID - Identifier of the sender.
   * @param accountName - Local user account name in storage.
   * @param deviceId - Target device identifier.
   * @param preKey - Pre-keys package containing SPK, OPK, and signature.
   * @param previousSession - Previous session state if one existed.
   * @param changedAppSession - Whether the application session ID has changed.
   * @returns An object containing the newly created session state and serialized KEM capsules.
   * @throws Error if pre-key payload is incomplete or signature verification fails.
   */
  private static async createSenderHandshake(
    roomID: string,
    authKey: string,
    receiverID: string,
    senderID: string,
    accountName: string,
    deviceId: string,
    preKey: preKeysPackage,
    previousSession: SessionState | null,
    changedAppSession: boolean
  ): Promise<{ session: SessionState; capsuleStr: string }> {
    log.debug(`Executing PQ KEM Handshake for device: ${deviceId}`);

    const identityKey = await NetworkService.getIdentityKey(authKey, deviceId, receiverID);
    if (!preKey.signature || !preKey.spk || !preKey.opk || !identityKey) {
      log.debug('Prekey signature: ' + !!preKey.signature + 'SPK: ' + !!preKey.spk + 'OPK: ' + !!preKey.opk + 'Identity key: ' + !!identityKey);
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

    const { ciphertext: capsuleSPK, sharedSecret: ssSPK } = CryptoCore.encapsulate(Buffer.from(preKey.spk, 'base64'));
    const { ciphertext: capsuleOPK, sharedSecret: ssOPK } = CryptoCore.encapsulate(Buffer.from(preKey.opk, 'base64'));

    log.debug('Generating root key and saving to DB.');
    const rootKey: Uint8Array<ArrayBufferLike> = this.deriveRootKeyFromSecrets(ssSPK, ssOPK, roomID);
    this.wipeBytes(ssSPK, ssOPK);

    const capsuleStr = `${Buffer.from(capsuleSPK).toString('base64')}|${Buffer.from(capsuleOPK).toString('base64')}`;

    const combinedMapKey: string = StorageService.generateCombinedName(roomID, receiverID, deviceId);

    // Save root key in session_root_keys table

    const sessionCounter = previousSession ? previousSession.sendCounter : 1;
    await SessionKeyManager.saveRootKeyForSession(accountName, combinedMapKey, appSession, rootKey, sessionCounter as number);

    // Change last key to inactive and delete older keys (expect previous Key and new Key) for device

    if (changedAppSession && previousSession) {
      await SessionKeyManager.handleSessionRotation(accountName, previousSession?.appSession, appSession);
    }

    const session: SessionState = {
      rootKey,
      sendCounter: 1,
      lastSenderID: senderID,
      opkId: preKey.opkId,
      appSession: appSession
    };

    const dataToSave = {
      rootKey: Buffer.from(rootKey).toString('base64'),
      sendCounter: 1,
      lastSenderID: senderID,
      appSession: appSession
    };
    await StorageService.saveSession(JSON.stringify(dataToSave), accountName, combinedMapKey);
    log.debug('Saved session to DB.');
    log.debug(`PQ KEM Handshake for device ${deviceId} ended. `);

    return { session, capsuleStr };
  }
}

export default ProtocolService;
