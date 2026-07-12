import { API_BASE_URL } from '@renderer/assets/utils'

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
    console.log(json);
    await window.e2ee.generatePairKeys(nickname, json.authToken,false);
    return {success: true, message: json.message}
  }

  return {success: false, message: json.message}



}
