interface result {
  success: boolean;
  message: string;
  authToken?: string;
  refreshToken?: string;
}

export async function login(nickname: string, password: string) : Promise<result> {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      nickname: nickname,
      password: password,
    })
  })
  const json = await response.json();
  if (!response.ok) {
    return {success: false, message: json.message };
  }
  await window.auth.setRefreshToken(nickname, json.refreshToken);
  localStorage.setItem("nickname", nickname);

  const savedAccounts = JSON.parse(localStorage.getItem("accounts") || "[]");
  if (!savedAccounts.includes(nickname)) {
    savedAccounts.push(nickname);
    localStorage.setItem("accounts", JSON.stringify(savedAccounts));
  }

  return {success: true, message: "ok"};
}
