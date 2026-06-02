import { API_BASE_URL } from '@renderer/assets/utils'

interface result {
  success: boolean;
  message: string;
}

export async function register(nickname: string, password: string, accessCode: string) : Promise<result> {
  const keys : string = await window.e2ee.generatePairKeys(nickname);
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
      keys: keys
    })
  })

  const json = await response.json();

  if (response.status === 201) {
    return {success: true, message: json.message}
  }

  return {success: false, message: json.message}



}
