import { API_BASE_URL } from '@renderer/assets/utils'

interface result {
  success: boolean;
  message: string;
  authToken?: string;
  refreshToken?: string;
  mfaRequired?: boolean;
}

export async function login(nickname: string, password: string, code2fa?: string) : Promise<result> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      nickname: nickname,
      password: password,
      code2fa: code2fa
    })
  })
  const json = await response.json();
  if (!response.ok) {
    return {success: false, message: json.message };
  }

  if (json.mfaRequired) {
    return { success: true, message: "MFA required", mfaRequired: true };
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


