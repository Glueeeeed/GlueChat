import { JSX, useState } from 'react'
import { validateOrRefreshToken } from '@renderer/assets/main'
import validator from 'validator'
import { recoveryCode, recoverySetup } from '@renderer/assets/account'


interface Props {
  onBack: () => void
  authToken: string
}

export function RecoveryAccount({ onBack, authToken }: Props): JSX.Element {

  const [email, setEmail] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false)
  const [successMessage] = useState<string>('Successfully enabled recovery account!')



  const handleSendCode = async () => {

    if (!inputValue) {
      setError("Email is required");
      setTimeout(() => setError(""), 2000);
      return;
    }

    if (!validator.isEmail(inputValue)) {
      setError('Invalid email');
      setTimeout(() => setError(''), 2000);
      return;
    }

    setEmail(inputValue);
    try {
      const token = await validateOrRefreshToken(authToken);
      await recoverySetup(token, inputValue);
    } catch (error: any) {
      setError(error.message);
      setTimeout(() => setError(""), 2000);
    }
    setInputValue('')
    setStep(2)
  }

  const handleVerifyCode = async () => {
    if (!inputValue) {
      setError("Code is required");
      setTimeout(() => setError(""), 2000);
      return;
    }

    try {
      const token = await validateOrRefreshToken(authToken);
      await recoveryCode(token, email, inputValue);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setTimeout(() => onBack(), 3000);
    }
    catch (error: any) {
      setError(error.message);
    }

  }


  return (
    <div className="p-8 w-full mx-auto space-y-8 overflow-y-auto h-full [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-violet-950/50 [&::-webkit-scrollbar-thumb]:rounded-full">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-white">
          Recovery Account
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Set-up Recovery account when you forgot password
        </p>
      </div>
      <button onClick={onBack} className="text-white mb-4">
        ← Back
      </button>

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

      <div className=" bg-white/5 p-4 rounded-lg border border-white/5 space-y-4">
        {step === 1 ? (
          <div className={'flex items-center flex-col'}>
            <div className="flex flex-col items-start gap-3 w-full">
              <h3 className="text-white font-bold uppercase text-sm tracking-wider">
                Address Email
              </h3>
              <p className=" text-xs text-gray-400">
                Enter your email address, and we&#39;ll send you an activation code.
              </p>
            </div>
            <div className={' flex gap-5 mt-5 w-full'}>
              <input
                onChange={(e) => setInputValue(e.target.value)}
                value={inputValue}
                type={'email'}
                className="w-full bg-gray-700/20 border border-white/10 rounded-lg p-2.5 pr-10 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Enter Your Addres Email"
              />
              <button
                onClick={handleSendCode}
                className="w-[40%] bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg font-bold text-xs uppercase border border-white/5 transition-all active:scale-[0.98]"
              >
                Send code
              </button>{' '}
            </div>
          </div>
        ) : (
          <div className={'flex items-center flex-col'}>
            <div className="flex flex-col items-start gap-3 w-full">
              <h3 className="text-white font-bold uppercase text-sm tracking-wider">Enter Code</h3>
              <p className=" text-xs text-gray-400">
                Enter the 6-digit code we sent to the following address: <strong>{email}</strong>
              </p>
            </div>
            <div className={' flex gap-5 mt-5 w-full'}>
              <input
                maxLength={6}
                onChange={(e) => setInputValue(e.target.value)}
                value={inputValue}
                type={'text'}
                className="w-full bg-gray-700/20 border border-white/10 rounded-lg p-2.5 pr-10 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="000 000"
              />
              <button
                onClick={handleVerifyCode}
                className="w-[40%] bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg font-bold text-xs uppercase border border-white/5 transition-all active:scale-[0.98]"
              >
                Activate
              </button>{' '}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
