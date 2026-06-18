import { IoEyeOffOutline, IoFlashOutline } from 'react-icons/io5'
import { FaShieldHalved } from 'react-icons/fa6'
import { IoIosUnlock, IoMdAlert } from 'react-icons/io'
import { FaCheckCircle } from 'react-icons/fa'

export function Account() {
  return (
    <div className="p-8 w-full mx-auto space-y-8 overflow-y-auto h-full [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-violet-950/50 [&::-webkit-scrollbar-thumb]:rounded-full">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-white">Security Center</h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage the privacy and security of your GlueChat profile.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-white font-bold uppercase text-sm tracking-wider">
              Change Password
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">
                Current
              </label>
              <input
                type="password"
                className="w-full bg-gray-700/20 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">
                New
              </label>
              <input
                type="password"
                className="w-full bg-gray-700/20 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button className="w-full bg-white/5 hover:bg-white/10 text-white py-2 rounded-xl font-bold text-xs uppercase border border-white/5 transition-all active:scale-[0.98]">
            Update credentials
          </button>
        </div>

        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-900/10 rounded-xl flex items-center justify-center border border-green-500/20">
                <FaCheckCircle className="text-green-700 text-xl" />
              </div>
              <div>
                <h3 className="text-white font-bold uppercase text-sm tracking-wider">
                  Two-Factor authentication (2FA)
                </h3>
                <p className="text-[10px] text-gray-500 uppercase font-medium">
                  Extra layer of protection
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-1">
            <p className="text-xs text-gray-400 max-w-[70%]">
              Add an extra layer of protection to your account
            </p>
            <button className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 font-bold uppercase transition-all">
              Configure
            </button>
          </div>
        </div>

        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-300-900/10 rounded-xl flex items-center justify-center border border-violet-500/20">
                <IoIosUnlock className="text-violet-400 text-xl" />
              </div>
              <div>
                <h3 className="text-white font-bold uppercase text-sm tracking-wider">
                  Account recovery
                </h3>
                <p className="text-[10px] text-gray-500 uppercase font-medium">
                  Restore your account
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-1">
            <p className="text-xs text-gray-400 max-w-[70%]">
              Restore Access to Your Account If You Lose It{' '}
            </p>
            <button className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 font-bold uppercase transition-all">
              Configure
            </button>
          </div>
        </div>

        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center border border-violet-500/20">
                <FaShieldHalved className="text-violet-500 text-xl" />
              </div>
              <div>
                <h3 className="text-white font-bold uppercase text-sm tracking-wider">
                  GlueLock Protection
                </h3>
                <p className="text-[10px] text-gray-500 uppercase font-medium">
                  Brute-Force Protection
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-1">
            <p className="text-xs text-gray-400 max-w-[70%]">
              Your account will be automatically &#34;frozen&#34; for too many attempts
            </p>
            <button className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 font-bold uppercase transition-all">
              Configure
            </button>
          </div>
        </div>

        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <IoEyeOffOutline className="text-indigo-400 text-xl" />
            </div>
            <div>
              <h3 className="text-white font-bold uppercase text-sm tracking-wider">
                Shadow Entry
              </h3>
              <p className="text-[10px] text-gray-500 uppercase font-medium">
                Discreet Duress Password
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-1">
            <p className="text-xs text-gray-400 max-w-[70%]">
              Set an alternative password that will unlock a "empty" version of the application in
              dangerous situations.
            </p>
            <button className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 font-bold uppercase transition-all">
              Configure
            </button>
          </div>
        </div>

        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-300/10 rounded-xl flex items-center justify-center border border-red-500/20">
              <IoMdAlert className="text-red-400 text-xl" />
            </div>
            <div>
              <h3 className="text-white font-bold uppercase text-sm tracking-wider">
                Self-destruct
              </h3>
              <p className="text-[10px] text-gray-500 uppercase font-medium">
                Delete account after inactivity.
              </p>
            </div>
          </div>

          <div className="flex items-center p-1">
            <div className="flex items-center justify-between p-1">
              <p className="text-xs text-gray-400  max-w-[70%]">
                If you don't log in for a selected period, your account and your data will be erased
                permanently
              </p>
              <div className="flex items-center gap-3">
                <select className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 font-bold uppercase xl:ml-80 transition-all">
                  <option>Never</option>
                  <option>1 month</option>
                  <option>3 months</option>
                  <option>6 months</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
