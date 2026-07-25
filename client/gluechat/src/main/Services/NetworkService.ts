import { API_BASE_URL } from '../config'
import keytar from 'keytar'
import log from 'electron-log/main'

export interface preKeysPackage {
  deviceId: string
  pubKey: string
  spk: string
  signature: string
  opkId: string
  opk: string
}

export interface device {
  deviceId: string
}

export abstract class NetworkService {
  static async getPreKeys(authKey: string, userID: string): Promise<preKeysPackage[]> {
    const response = await fetch(`${API_BASE_URL}/api/e2ee/pre-keys/${userID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authKey}`
      }
    })

    if (!response.ok) {
      console.error(response);
      throw new Error(response.statusText)
    }

    const json = await response.json()
    return JSON.parse(json.data)
  }

  static async getAllBobDevices(authKey: string , userId: string): Promise<device[]> {
    const response = await fetch(`${API_BASE_URL}/api/e2ee/devices/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${authKey}`
      }
    })
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const json = await response.json()
    return json.devices
  }

  static async registerDevice(account: string, deviceId: string, keys: string, tempToken : string): Promise<void> {
    console.info("TEMP TOKEN: " + tempToken)
    const token  = tempToken ? tempToken : await keytar.getPassword('gluechat', account);
    if (!token) {
      throw new Error(` token not found for account ${account}`)
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
    })


    if (!response.ok) {
      throw new Error(`could not register device`)
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
    })
    if (!response.ok) {
      log.debug(response.statusText);
      throw new Error(response.statusText);
    }

    const json = await response.json()
    return json.data;
  }
}
