interface result {
  success: boolean;
  message: string;
}

export async function register(nickname: string, email: string, password: string) : Promise<result> {
  const response = await fetch(`http://localhost:3000/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      nickname: nickname,
      email: email,
      password: password,
    })
  })

  const json = await response.json();

  if (response.status === 201) {
    return {success: true, message: json.message}
  }

  return {success: false, message: json.message}



}
