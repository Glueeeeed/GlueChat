import { API_BASE_URL } from './utils'


export async function syncMessages(authKey: string, roomID: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/e2ee/messages/sync?roomID=${roomID}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authKey}`
      }
    }
  )

  if (!response.ok && response.status !== 404) {
  throw new Error('Failed to sync messages')
}

  const json = await response.json()
  return json.data
}

export async function makeAsRead(authKey: string, messageID): Promise<void> {
  await fetch(`${API_BASE_URL}/api/e2ee/messages/make-as-read/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authKey}`
    },
    body: JSON.stringify({ id: messageID })
  })
}

