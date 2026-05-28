export async function checkIfAssetExists(assetType: string, userId : string) {
  const asset = await fetch('http://localhost:3000/api/profile/assets/' + assetType + '/' + userId, {
    method: 'GET',
  })
  if (asset.ok) {
    return `http://localhost:3000/api/profile/assets/${assetType}/${userId}/`
  }
  return null;

}
