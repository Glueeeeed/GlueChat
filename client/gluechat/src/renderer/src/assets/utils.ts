import validator from 'validator';



export function validateNickname (nickname: string) : void {
    if (validator.isEmpty(nickname)) {
       throw new Error('Nickname is required');
    }
    if (validator.isEmail(nickname)) {
      throw new Error('Nickname cannot be email');
    }

    if (!validator.isLength(nickname, {min: 4 , max: 20})) {
      throw new Error('Nickname must be between 4 and 20 characters long');
    }

}


export function validatePassword (password : string) : void {
  if (validator.isEmpty(password)) {
    throw new Error('Password is required');
  }
  if (!validator.isStrongPassword(password)) {
    throw new Error('Password is too weak. It must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character.');
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

  console.log('refreshToken', refreshToken);

  const response = await fetch(`http://localhost:3000/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      refreshToken: refreshToken,
    })
  });

  const json = await response.json();

  if (response.status === 200) {
    await window.auth.deleteRefreshToken(nickname);
    await window.auth.setRefreshToken(nickname, json.refreshToken);
    return json.authToken;
  }

  await window.auth.deleteRefreshToken(nickname);
  throw new Error('Refresh token is not valid');
}


