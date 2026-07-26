import validator from 'validator';


export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'v1';
export const APP_VERSION_NAME = import.meta.env.VITE_APP_VERSION_NAME || 'v1';

export function validateNickname (nickname: string) : void {
    if (validator.isEmpty(nickname)) {
       throw new Error('Nickname is required');
    }
    if (validator.isEmail(nickname)) {
      throw new Error('Nickname cannot be emails');
    }

    if (!validator.isLength(nickname, {min: 3 , max: 20})) {
      throw new Error('Nickname must be between 3 and 20 characters long');
    }

}


export function validatePassword (password : string) : void {
  if (validator.isEmpty(password)) {
    throw new Error('Password is required');
  }
  if (!validator.isLength(password, {min: 14})) {
    throw new Error('Password is too weak. It must contain at least 14 characters.');
  }
}

export async function initAuthToken(): Promise<string> {
  const nickname = localStorage.getItem("nickname");

  if (!nickname) {
    throw new Error('Nickname not found in local storage.');
  }

  const refreshToken = await window.auth.getRefreshToken(nickname);

  if (!refreshToken) {
    throw new Error('Refresh token not found.');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      refreshToken: refreshToken
    })
  })

  const json = await response.json();

  if (response.status === 200) {
    await window.auth.deleteRefreshToken(nickname);
    await window.auth.setRefreshToken(nickname, json.refreshToken);
    return json.authToken;
  }

  await window.auth.deleteRefreshToken(nickname);
  throw new Error('Refresh token is not valid');
}


