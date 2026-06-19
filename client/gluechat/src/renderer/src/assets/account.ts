import { API_BASE_URL } from '@renderer/assets/utils'

export async function changePassword(authToken: string, oldPassword: string, newPassword: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/account/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      oldPassword: oldPassword,
      newPassword: newPassword
    })
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.message)
  }
}
