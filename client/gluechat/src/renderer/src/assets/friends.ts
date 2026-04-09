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

  if (response.status === 401 && !tryAgain) {
    const newToken = await initAuthToken();
    return await addToFriend(nickname, newToken, true);
  }

  const json = await response.json();

  if (response.status === 200) {
    return true;
  }


  const errorMessage = response.status === 404 ? `Couldn't find user: ${nickname}` : (json.message || "Failed to send friend request");

  throw new Error(errorMessage);
}

export async function loadFriend(authToken: string, tryAgain = false): Promise<object> {
  const response = await fetch(`http://localhost:3000/api/friends`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
  });

  if (response.status === 401 && !tryAgain) {
    const newToken : string = await initAuthToken();
    return await loadFriend(newToken, true);
  }

  const json = await response.json();
  if (response.status === 200) {
    return json.data;
  }
  return [];
}

export async function loadRequests(authToken: string, tryAgain = false): Promise<object> {
  const response = await fetch(`http://localhost:3000/api/friends/requests`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  })

  if (response.status === 401 && !tryAgain) {
    console.log("Token not found. Loading again..")
    const newToken: string = await initAuthToken();
    return await loadRequests(newToken, true);
  }
  const json = await response.json();
  if (response.status === 200) {
    return json.data;
  }
  return [];
}

export async function request(requestID: string , accept: boolean, authToken : string, tryAgain = false): Promise<void> {
  const response = await fetch(`http://localhost:3000/api/friends/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      requestID: requestID,
      accept : accept,
    })
  })
  if (response.status === 401 && !tryAgain) {
    const newToken: string = await initAuthToken();
    await request(requestID, accept, newToken, true);
  }


}
