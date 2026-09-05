import { API_BASE_URL } from '@renderer/assets/utils'
import log from 'electron-log/renderer'

interface result {
  success: boolean;
  message: string;
}

export async function register(nickname: string, password: string, accessCode: string) : Promise<result> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      nickname: nickname,
      password: password,
      accessCode: accessCode,
    })
  })

  const json = await response.json();

  if (response.status === 201) {
    try {
      await window.e2ee.generatePairKeys(nickname, json.authToken, false)
    } catch (error) {
      log.error(error);
      return {
        success: false,
        message: 'Failed to register device keys. Try again or contact support.'
      }
    }

    return {success: true, message: json.message}
  }

  return {success: false, message: json.message}

}
