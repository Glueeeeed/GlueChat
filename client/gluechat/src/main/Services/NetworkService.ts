interface preKeysPackage {
  pubKey: string
  spk: string
  signature: string
  opkId: string
  opk: string
}

export abstract class NetworkService {
   static async getPreKeys(authKey: string, userID: string): Promise<preKeysPackage> {
    const response = await fetch(`http://localhost:3000/api/e2ee/pre-keys/${userID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authKey}`
      }
    })

    if (!response.ok) {
      console.error(response)
      throw new Error(response.statusText)
    }

    const json = await response.json()
    return JSON.parse(json.data)
  }
}
