import {initAuthToken} from "@renderer/assets/utils";

export async function loadChats(authToken: string, tryAgain = false): Promise<object> {
  const response = await fetch(`http://localhost:3000/api/chats/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  })

  if (response.status === 401 && !tryAgain) {
    console.log("Token not found. Loading again..")
    const newToken: string = await initAuthToken();
    return await loadChats(newToken, true);
  }
  const json = await response.json();
  if (response.status === 200) {
    return json.data;
  }
  return [];
}

export async function validateOrRefreshToken(authToken: string): Promise<string> {
  if (!authToken) {
    return initAuthToken()
  }

  try {
    const response = await fetch(`http://localhost:3000/api/e2ee/check-token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      }
    })

    if (response.ok) {
      return authToken
    }

    if (response.status === 401) {
      console.log('Token expired/invalid. Refreshing...')
      const newToken = await initAuthToken()
      return newToken
    }

    throw new Error(`Token validation failed: ${response.status}`)
  } catch (error) {
    console.error('Token check failed:', error)
    const newToken = await initAuthToken()
    return newToken
  }
}
