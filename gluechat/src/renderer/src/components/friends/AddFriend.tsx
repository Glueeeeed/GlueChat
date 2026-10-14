import { JSX, useState } from 'react'
import {addToFriend} from "@renderer/assets/friends";

interface AddFriendProps {
  authToken: string | null;
}

export function AddFriend({authToken}: AddFriendProps) : JSX.Element {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [sentRequest, setSentRequest] = useState(false);

  async function addFriend() : Promise<void> {
    setError("");
    try {
      const success = await addToFriend(nickname, authToken as string);
      if (success) {
        setSentRequest(true);
        setTimeout(() => setSentRequest(false), 5000);
      }
    } catch (e: any) {
      setTimeout(() => {
        setError("")
      },5000)
      setError(e.message);
    }
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      await addFriend();
    }
  }



  return (
    <>
      <div className=" px-4 flex flex-col items-start justify-start  border-r border-white/15 h-full text-sm text-gray-600 dark:text-gray-400 ">
        <h2 className=" mt-10 text-xl font-bold tracking-tight text-white uppercase">Add Friend</h2>
        <p className="text-gray-500 text-sm ">You can add friends using their nickname</p>
        <div className={'flex flex-col items-start mt-3 gap-2 w-full '}>
          <div className={'flex items-start mt-3 gap-2 w-full max-lg:flex-col '}>
            <input
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="bg-gray-900/90 border border-white/5 text-white text-base rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 block w-full lg:max-w-[60%]  p-2.5 outline-none transition-all placeholder-gray-600 shadow-inner"
              type="text"
              placeholder="Nickname"
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => addFriend()}
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5  rounded-lg focus:outline-none focus:ring-4 focus:ring-violet-500/30 w-full  lg:max-w-[30%]  transition-all cursor-pointer"
              type="button"
            >
              Add Friend
            </button>
          </div>

          {error && (
            <div className=" mt-3 bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {sentRequest && (
            <div className="mt-5 bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-4 rounded-xl text-sm font-medium">
              <p>Successfully request sent!</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
