import { API_BASE_URL } from '@renderer/assets/utils'
import log from 'electron-log'

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

export async function generate2faSecret(authToken: string): Promise<TwoFactorData> {
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


export async function getRecoveryStatus(authToken: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/account/recovery/status`, {
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

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      email: email
    })
  })

  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.message)
  }
}

export async function disable2fa(authToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/account/2fa/disable`, {
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
}

export async function removeRecovery(authToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/account/recovery/remove`, {
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
}


export async function recoverySetup(authToken: string, email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/account/recovery/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      email: email
    })
  })
  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.message);
  }
}

export async function recoveryCode(authToken: string, email: string, code: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/account/recovery/setup/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      code: code,
      email: email
    })
  })
  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.message);
  }
}

export async function resetKeys(authToken: string, deviceId : string, accountName: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/account/reset-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      deviceId: deviceId
    })
  })
  const json = await response.json()
  if (!response.ok) {
    throw new Error(json.message);
  }
  await window.app.removeLocalKeys(accountName);
  await window.e2ee.generatePairKeys(accountName, authToken, true);
}


export async function checkIfDeviceIsRegistered(authToken: string, deviceId: string, accountName: string): Promise<void> {

  const response : Response = await fetch(`${API_BASE_URL}/api/account/check-device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    },
    body: JSON.stringify({
      deviceId: deviceId,
    })
  });

  const json = await response.json();
  if (!response.ok) {
    log.error(json.message);
    throw new Error(json.message);
  }

  if (!json.isRegistered)  {
    try {
      window.e2ee.generatePairKeys(accountName, authToken, true)
    } catch (e) {
      log.error(e)
    }
  }

}
