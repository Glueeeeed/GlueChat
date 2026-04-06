interface result {
  success: boolean;
  message: string;
  authToken?: string;
  refreshToken?: string;
}

export async function login(email: string, password: string) : Promise<result> {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password,
    })
  })
  if (response.ok) {
    console.log(response.body);
  }
  const json = await response.json();
  if (!response.ok) {
    return {success: false, message: json.message };
  }

  return {success: true, message: "ok", authToken: json.authToken, refreshToken: json.refreshToken};
}
