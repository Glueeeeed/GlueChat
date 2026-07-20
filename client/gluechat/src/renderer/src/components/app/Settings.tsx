import { BsFillPersonFill } from 'react-icons/bs'
import { IoShield } from 'react-icons/io5'
import { JSX } from 'react'
import { HiIdentification } from 'react-icons/hi'

interface SettingsProps {
  selectedSetting: string | null
  setSelectedSetting: (setting: string) => void
}

export function Settings({selectedSetting, setSelectedSetting}: SettingsProps) : JSX.Element {



  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">Settings</h2>
        <div className="flex-1  overflow-y-auto px-2 pb-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-900/50 [&::-webkit-scrollbar-thumb]:bg-violet-950 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-violet-900">
          <button
            onClick={() => setSelectedSetting('EditProfile')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-center duration-200 group mb-1 ${
              selectedSetting === 'EditProfile'
                ? 'bg-violet-500/10 border border-violet-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]'
                : 'hover:bg-white/5 border border-transparent hover:border-white/5'
            }`}
          >
            <div className={'flex gap-2 text-sm font-semibold tracking-tight text-white uppercase'}>
              <BsFillPersonFill className="mt-0.5" />
              <p className="text-sm font-bold tracking-tight text-gray-400 uppercase">Account</p>
            </div>
          </button>

          <button
            onClick={() => setSelectedSetting('Security')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-center duration-200 group mb-1 ${
              selectedSetting === 'Security'
                ? 'bg-violet-500/10 border border-violet-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]'
                : 'hover:bg-white/5 border border-transparent hover:border-white/5'
            }`}
          >
            <div className={'flex gap-2 text-sm font-semibold tracking-tight text-white uppercase'}>
              <IoShield className="mt-0.5" />
              <p className="text-sm font-bold tracking-tight text-gray-400 uppercase">Security</p>
            </div>
          </button>

          <button
            onClick={() => setSelectedSetting('About')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-center duration-200 group mb-1 ${
              selectedSetting === 'About'
                ? 'bg-violet-500/10 border border-violet-500/20 shadow-[0_0_15px_-5px_rgba(59,130,246,0.3)]'
                : 'hover:bg-white/5 border border-transparent hover:border-white/5'
            }`}
          >
            <div className={'flex gap-2 text-sm font-semibold tracking-tight text-white uppercase'}>
              <HiIdentification className="mt-0.5 text-sm" />
              <p className="text-sm font-bold tracking-tight text-gray-400 uppercase">About App</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
