

export async function syncMessages(authKey: string, roomID: string): Promise<any[]> {
  const response = await fetch(`http://localhost:3000/api/e2ee/messages/sync?roomID=${roomID}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authKey}`
      }
    }
  )

  if (!response.ok) {
  console.error(response)
  throw new Error('Failed to sync messages')
}

  const json = await response.json()
  return json.data
}

export async function makeAsRead(authKey: string, messageID): Promise<void> {
  await fetch(`http://localhost:3000/api/e2ee/messages/make-as-read/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authKey}`
    },
    body: JSON.stringify({ id: messageID })
  })
}

