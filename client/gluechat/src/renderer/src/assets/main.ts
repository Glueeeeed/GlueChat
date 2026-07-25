import { API_BASE_URL, initAuthToken } from '@renderer/assets/utils'
import log from 'electron-log/renderer'

export async function loadChats(authToken: string, tryAgain = false): Promise<object> {
  const response = await fetch(`${API_BASE_URL}/api/chats/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    }
  })

  if (response.status === 401 && !tryAgain) {
    log.info("Token not found. Loading again..")
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
    const response = await fetch(`${API_BASE_URL}/api/e2ee/check-token`, {
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
      log.info('Token expired/invalid. Refreshing...')
      return await initAuthToken()
    }
    throw new Error(`Token validation failed: ${response.status}`)
  } catch (error) {
    log.error('Token check failed:', error)
    return await initAuthToken()
  }
}
