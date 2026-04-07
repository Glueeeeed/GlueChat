
export function AddFriend() {
  return (
    <>
      <div className=" ml-15 flex flex-col items-start justify-start  border-r border-white/15 h-[30%] text-sm text-gray-600 dark:text-gray-400 ">
        <h2 className=" mt-10 text-xl font-bold tracking-tight text-white uppercase">Add Friend</h2>
        <p className="text-gray-500 text-sm ">You can add friends using their nickname</p>
        <div className={"flex items-start mt-3 gap-2 "}>
            <input
              maxLength={20}
              className="bg-gray-900/90 border border-white/5 text-white text-base rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 block w-[55%] p-2.5 outline-none transition-all placeholder-gray-600 shadow-inner"
              type="text"
              placeholder="Nickname"
            />
          <button
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5  rounded-lg focus:outline-none focus:ring-4 focus:ring-violet-500/30 w-[35%] transition-all cursor-pointer"
            type="button"
          >
            Add Friend
          </button>
        </div>
      </div>

    </>
  )
}
