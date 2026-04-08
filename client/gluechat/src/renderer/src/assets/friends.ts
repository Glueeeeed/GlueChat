import {initAuthToken} from "@renderer/assets/utils";

export async function addToFriend(nickname: string, authToken: string, tryAgain = false): Promise<boolean> {
  if (!nickname) {
    throw new Error("You must provide a nickname");
  }

  const response = await fetch(`http://localhost:3000/api/friends/add-friend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ nickname })
  });

  const json = await response.json();

  if (response.status === 200) {
    return true;
  }

  if (response.status === 401 && !tryAgain) {
    const newToken = await initAuthToken();
    return await addToFriend(nickname, newToken, true);
  }

  const errorMessage = response.status === 404 ? `Couldn't find user: ${nickname}` : (json.message || "Failed to send friend request");

  throw new Error(errorMessage);
}
