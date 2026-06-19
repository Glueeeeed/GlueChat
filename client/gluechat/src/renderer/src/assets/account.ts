import { API_BASE_URL } from '@renderer/assets/utils'

export interface TwoFactorData {
  twoFactorUrl: string,
  twoFactorSecret: string,
}
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

export async function generate2faSecret (authToken: string): Promise<TwoFactorData> {
  const response = await fetch(`${API_BASE_URL}/api/account/2fa/setup/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    }
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.message)
  }

  return {
    twoFactorUrl: json.twoFactorUrl,
    twoFactorSecret: json.twoFactorSecret
  }
}

export async function verify2faCode(authToken: string, code: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/account/2fa/verify/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      code: code
    })
  })
  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.message);
  }
}

export async function get2faStatus(authToken: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/account/2fa/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    }
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.message)
  }

  return json.enabled
}

export async function disable2fa(authToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/account/2fa/disable`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    }
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.message)
  }
}
