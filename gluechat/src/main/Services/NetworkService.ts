import { API_BASE_URL } from '../config';
import keytar from 'keytar';
import log from 'electron-log/main';
import { sha256 } from '@noble/hashes/sha2.js';

export interface preKeysPackage {
  deviceId: string;
  pubKey: string;
  spk: string;
  signature: string;
  opkId: string;
  opk: string;
}

export interface device {
  deviceId: string;
}

export abstract class NetworkService {
  static async getPreKeys(authKey: string, userID: string): Promise<preKeysPackage[]> {
    const response = await fetch(`${API_BASE_URL}/api/e2ee/pre-keys/${userID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authKey}`
      }
    });

    if (!response.ok) {
      console.error(response);
      throw new Error(response.statusText);
    }

    const json = await response.json();
    return JSON.parse(json.data);
  }

  static async getAllBobDevices(authKey: string, userId: string): Promise<device[]> {
    const response = await fetch(`${API_BASE_URL}/api/e2ee/devices/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authKey}`
      }
    });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    const json = await response.json();
    return json.devices;
  }

  static async registerDevice(account: string, deviceId: string, keys: string, tempToken: string): Promise<void> {
    console.info('TEMP TOKEN: ' + tempToken);
    const token = tempToken ? tempToken : await keytar.getPassword('gluechat', account);
    if (!token) {
      throw new Error(` token not found for account ${account}`);
    }

    const response = await fetch(`${API_BASE_URL}/api/account/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({
        deviceId: deviceId,
        keys: keys
      })
    });

    if (!response.ok) {
      log.error(response.json());
      throw new Error(`could not register device`);
    }
  }

  static async getIdentityKey(authKey: string, deviceId: string, userId: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/api/e2ee/identity-key/${deviceId}?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authKey}`
      }
    });
    if (!response.ok) {
      log.debug(response.statusText);
      throw new Error(response.statusText);
    }

    const json = await response.json();
    return json.data;
  }

  static async uploadEncryptedFile(authKey: string, fileBytes: Uint8Array<ArrayBufferLike>, filename: string): Promise<string> {
    const formData = new FormData();
    const fileBlob = new Blob([fileBytes] as BlobPart[]);
    formData.append('file', fileBlob, filename);

    const response = await fetch(`https://gluechat.dev/storage/files`, {
      method: 'POST',
      headers: {
        'X-API-Key': authKey
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const json = await response.json();
    return json.filename;
  }

  static async downloadEncryptedFile(filename: string, authKey: string): Promise<Uint8Array<ArrayBuffer>> {
    const response = await fetch(`https://gluechat.dev/storage/download/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': authKey
      },
      body: JSON.stringify({
        filename: filename,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`Failed to download file ${filename}: ${response.statusText} - ${errorText}`);
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    // Expect base64-encoded file content in JSON response
    const json = await response.json();
    const base64File = json.file64
    const fileBuffer = Buffer.from(base64File, 'base64');

    return fileBuffer;
  }
}
