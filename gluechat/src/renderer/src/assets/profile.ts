import {API_BASE_URL} from "@renderer/assets/utils";

export async function checkIfAssetExists(assetType: string, userId : string) {
  const asset = await fetch(`${API_BASE_URL}/api/profile/assets/` + assetType + '/' + userId + `?t=${Date.now()}`, {
    method: 'GET'
  })
  if (asset.ok) {
    return `${API_BASE_URL}/api/profile/assets/${assetType}/${userId}/`
  }
  return null;

}
