import { API_BASE_URL } from './utils'
import log from 'electron-log'


export async function syncMessages(authKey: string, roomID: string, deviceId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/e2ee/messages/sync?roomID=${roomID}&deviceId=${deviceId}`,
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

async function checkOpkKeys(authKey: string, deviceId: string): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/e2ee/opk/count?deviceId=${deviceId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authKey}`
    }
  })
  const json = await response.json();
  if (response.status !== 200) {
    throw new Error('Failed to check opk key');
  }
  return json.qty;
}

export async function generateOpkKeys(authKey: string, deviceId: string, accountName: string): Promise<void> {
  const qty: number = await checkOpkKeys(authKey, deviceId)
  if (qty <= 10) {
    const opk : string =  await window.e2ee.generateOpk(50, accountName, deviceId);
    if (!opk) {
      throw new Error('Failed to generate opk key: missing Opk' );
    }
    log.debug(opk);
    const response = await fetch(`${API_BASE_URL}/api/e2ee/opk/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authKey}`
      },
      body: JSON.stringify({
        deviceId: deviceId,
        opk: opk
      })
    })

    if (!response.ok) {
      throw new Error('Failed to update opk');
    }
  }

  log.info('Opk Quantity ok: ' + qty);
}

