import React, { useState } from 'react'
import { FaSearch, FaUserCircle } from 'react-icons/fa'

interface Friend {
  id: string
  nickname: string
  status: 'online' | 'offline'
  avatar?: string
}

const MOCK_FRIENDS: Friend[] = [
  { id: '1', nickname: 'Alice', status: 'online' },
  { id: '2', nickname: 'Bob', status: 'offline' },
  { id: '3', nickname: 'Charlie', status: 'online' },
  { id: '4', nickname: 'David', status: 'offline' },
  { id: '5', nickname: 'Eve', status: 'online' }
]

interface FriendsListProps {
  onSelectFriend?: (friend: Friend) => void
  selectedFriendId?: string
  addFriendOption: boolean
  setAddFriendOption: (newFriend: boolean) => void
}

export function FriendsList({ onSelectFriend, selectedFriendId, setAddFriendOption, addFriendOption }: FriendsListProps): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'online' | 'null'>('all')

  const setAddFriend = (): void => {
    setAddFriendOption(!addFriendOption)
    setFilter("null")
  }

  let filteredFriends: Friend[] = []
  if (!addFriendOption) {
    filteredFriends = MOCK_FRIENDS.filter((friend) => {
      const matchesSearch = friend.nickname.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filter === 'all' || friend.status === 'online'
      return matchesSearch && matchesFilter
    })
  }


  return (
    <div className="flex flex-col h-full w-80 bg-gray-900/40 border-r border-white/5 ">
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">Friends</h2>

        <div className="relative group">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-violet-900 transition-colors" size={14} />
          <input
            type="text"
            placeholder="Search friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950/50 border border-white/5 text-sm text-white pl-10 pr-4 py-2 rounded-xl focus:ring-2 focus:ring-violet-500/30 outline-none transition-all placeholder-gray-600 shadow-inner"
          />
        </div>

        <div className="flex gap-2">
          <button
            hidden={addFriendOption}
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              filter === 'all' ? 'bg-violet-800 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            ALL
          </button>
          <button
            hidden={addFriendOption}
            onClick={() => setFilter('online')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              filter === 'online' ? 'bg-violet-800 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            ONLINE
          </button>
          <button
            onClick={() => setAddFriend()}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              addFriendOption ? 'bg-violet-800 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            FRIENDS PANEL
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-violet-950 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-violet-900">


        {filteredFriends.length > 0 ? (
          filteredFriends.map((friend) => (
            <button
              key={friend.id}
              onClick={() => onSelectFriend?.(friend)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group mb-1 ${
                selectedFriendId === friend.id
                  ? 'bg-violet-500/10 border border-violet-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]'
                  : 'hover:bg-white/5 border border-transparent hover:border-white/5'
              }`}
            >
              <div className="relative">
                <FaUserCircle size={40} className="text-gray-700 group-hover:text-gray-600 transition-colors" />
                <div
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${
                    friend.status === 'online' ? 'bg-violet-500' : 'bg-gray-500'
                  }`}
                />
              </div>

              <div className="flex flex-col items-start">
                <span className={`font-semibold text-sm transition-colors ${
                  selectedFriendId === friend.id ? 'text-white' : 'text-gray-300 group-hover:text-white'
                }`}>
                  {friend.nickname}
                </span>
                <span className="text-[10px] text-gray-500 uppercase">
                  {friend.status}
                </span>
              </div>
            </button>
          ))
        ) : (
          !addFriendOption && (
          <div className="flex flex-col items-center justify-center h-40 opacity-30">
          <p className="text-xs uppercase font-bold">No friends found</p>
          </div>
          )
        )}
      </div>
    </div>
  )
}
