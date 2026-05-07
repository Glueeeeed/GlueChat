interface result {
  success: boolean;
  message: string;
}

export async function register(nickname: string, password: string) : Promise<result> {
  const keys : string = await window.e2ee.generatePairKeys(nickname);
  const response = await fetch(`http://localhost:3000/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      nickname: nickname,
      password: password,
      keys: keys,
    })
  })

  const json = await response.json();

  if (response.status === 201) {
    return {success: true, message: json.message}
  }

  return {success: false, message: json.message}



}
