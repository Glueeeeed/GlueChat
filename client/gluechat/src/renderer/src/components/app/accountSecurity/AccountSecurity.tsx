import { IoEyeOffOutline } from 'react-icons/io5'
import { FaShieldHalved } from 'react-icons/fa6'
import { IoIosUnlock, IoMdAlert } from 'react-icons/io'
import { FaCheckCircle } from 'react-icons/fa'
import { Eye, EyeOff } from 'lucide-react'
import { JSX, useEffect, useState } from 'react'
import { validateOrRefreshToken } from '@renderer/assets/main'
import { changePassword, disable2fa, get2faStatus } from '@renderer/assets/account'
import { Setup2FA } from '@renderer/components/app/accountSecurity/secureFeatures/2faSetup'
import { RecoveryAccount } from '@renderer/components/app/accountSecurity/secureFeatures/accountRecovery'

interface Props {
  authToken: string
}

export function AccountSecurity({authToken} : Props) : JSX.Element {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'main' | '2fa' | 'recovery'>('main')

  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('Successfully updated password!');

  useEffect(() => {
    const fetch2FAStatus = async () : Promise<void> => {
      try {
        const token = await validateOrRefreshToken(authToken);
        const enabled = await get2faStatus(token);
        setIs2faEnabled(enabled);
      } catch (err) {
        console.error("Failed to fetch 2FA status", err);
      }
    };
    if (activeSubView === 'main') {
      fetch2FAStatus();
    }
  }, [authToken, activeSubView]);

  const handleChangePassword =  async (): Promise<void> => {
    try {
      setSuccessMessage('Successfully updated password!');
      const token : string = await validateOrRefreshToken(authToken as string);
      await changePassword(token, currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err : any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  }

  const handleDisable2FA = async () : Promise<void> => {
    try {
      const token = await validateOrRefreshToken(authToken);
      await disable2fa(token);
      setIs2faEnabled(false);
      setSuccessMessage('2FA has been disabled');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  if (activeSubView === '2fa') {
    return <Setup2FA onBack={() => setActiveSubView('main')} authToken={authToken} />
  }

  if (activeSubView === 'recovery') {
    return <RecoveryAccount onBack={() => setActiveSubView('main')} authToken={authToken} />
  }


  return (
    <div className="p-8 w-full mx-auto space-y-8 overflow-y-auto h-full [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-violet-950/50 [&::-webkit-scrollbar-thumb]:rounded-full">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-white">Security Center</h2>
        <p className="text-gray-500 text-sm mt-1">
          Manage the privacy and security of your GlueChat profile.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-4 rounded-xl text-sm font-medium">
          {successMessage}
        </div>
      )}

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
              <div className="relative">
                <input
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="w-full bg-gray-700/20 border border-white/10 rounded-xl p-2.5 pr-10 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">
                New
              </label>
              <div className="relative">
                <input
                  onChange={(e) => setNewPassword(e.target.value)}
                  type={showNewPassword ? 'text' : 'password'}
                  className="w-full bg-gray-700/20 border border-white/10 rounded-xl p-2.5 pr-10 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={handleChangePassword}
            className="w-full bg-white/5 hover:bg-white/10 text-white py-2 rounded-xl font-bold text-xs uppercase border border-white/5 transition-all active:scale-[0.98]"
          >
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
            <p className="text-xs text-gray-400 max-w-[80%]">
              Add an extra layer of protection to your account
            </p>
            <div className="flex gap-2">
              {is2faEnabled && (
                <button
                  onClick={handleDisable2FA}
                  className="text-[10px] ml-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg border border-red-500/20 font-bold uppercase transition-all"
                >
                  Disable
                </button>
              )}
              <button
                disabled={is2faEnabled}
                onClick={() => setActiveSubView('2fa')}
                className={`text-[10px] px-4 py-2 rounded-lg border font-bold uppercase transition-all ${
                  is2faEnabled
                    ? 'bg-gray-800/50 text-gray-500 border-white/5 cursor-not-allowed'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                }`}
              >
                Configure
              </button>
            </div>
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
            <button
              onClick={() => setActiveSubView('recovery')}
              className="text-[10px] bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg border border-white/10 font-bold uppercase transition-all"
            >
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
                <h3 className="text-white font-bold uppercase text-sm tracking-wider">GlueLock</h3>
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
              Set an alternative password that will unlock a &#34;empty&#34; version of the
              application in dangerous situations.
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
                If you don&#39;t log in for a selected period, your account and your data will be
                erased permanently
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
