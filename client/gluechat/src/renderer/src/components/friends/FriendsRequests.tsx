import {FaUserCircle, FaCheck, FaTimes } from "react-icons/fa";
import {useEffect, useState} from "react";
import {loadRequests, request} from "@renderer/assets/friends";


interface Friend {
  id: string
  nickname: string
}



interface friendsRequestsProps {
  authToken: string | null
}



export function FriendsRequests({authToken} : friendsRequestsProps) {
  const [requests, setRequets] = useState<Friend[]>([])
  const [error, setError] = useState("");



  useEffect(() => {
    const fetchFriendsRequests = async () => {
      if (authToken) {
        try {
          const data = await loadRequests(authToken);
          setRequets(data as Friend[]);
        } catch (error) {
          console.error("Failed to load friends");
        }
      }
    };
    fetchFriendsRequests();
  }, [authToken]);

  async function manageRequest(requestID: string, accepted: boolean, authToken: string | null) {
    if (!authToken) return;
    setError("");
    try {
      await request(requestID, accepted, authToken);
      setRequets((prev) => prev.filter((r) => r.id !== requestID));
    } catch (e: any) {
      setError(e?.message || "Failed to manage request");
      setTimeout(() => setError(""), 5000);
    }
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className=" mt-2 ml-10 flex flex-col justify-start w-full">
          <h2 className="text-xl font-bold tracking-tight text-white uppercase">Requests</h2>
          <p className="text-gray-500 text-sm">You can view and manage friend requests</p>
        </div>

      <div className="flex-1 flex-col mt-10 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-violet-950 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-violet-900">

        {requests.length > 0 ? (
          requests.map((friend) => (
            <button
              key={friend.id}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 group mb-1
              'hover:bg-white/10 hover:bg-gray-700/10 border border-b-white/5 border-transparent hover:border-white/5`}
            >
              <div className="relative">
                <FaUserCircle size={40} className="text-gray-700 group-hover:text-gray-600 transition-colors" />
              </div>

              <div className="flex flex-col items-start">
                <span className={`font-semibold text-sm transition-colors `}>
                  {friend.nickname}
                </span>
                <span className={`font-base text-xs opacity-40 transition-colors `}>
                  {friend.id}
                </span>
              </div>

              <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="mt-3 text-center">
                  <p className={"text-red-400 text-sm font-bold"}>{error}</p>
                </div>
                <button
                  onClick={() => manageRequest(friend.id, true, authToken)}
                  className="p-2  bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-lg transition-all duration-200"
                  title="Accept"
                >
                  <FaCheck size={14} />
                </button>
                <button
                  onClick={() => manageRequest(friend.id, false, authToken)}
                  className="p-2  bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all duration-200"
                  title="Decline"
                >
                  <FaTimes size={14} />
                </button>
              </div>


            </button>

          ))
        ) : (
            <div className="flex flex-col items-center justify-center h-40 opacity-30">
              <p className="text-xs uppercase font-bold">No friend requests found</p>
            </div>
          )}
      </div>
      </div>

    </>
  )
}
