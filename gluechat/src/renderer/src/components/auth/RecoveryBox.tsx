import { Link } from 'react-router-dom'
import { JSX, useState } from 'react'
import { requestPasswordReset } from '@renderer/assets/account'

export function RecoveryBox(): JSX.Element {
  const [email, setEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) : Promise<void> => {
    e.preventDefault()
    if (!email) {
      setErrorMsg('Email is required');
      setTimeout(() => setErrorMsg(''), 2000);
      return
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
      setTimeout(() => { setErrorMsg("") }, 2000);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-gray-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-md mx-auto border border-white/10">
      <h2 className="text-2xl font-black mb-8 text-center text-white uppercase tracking-wider">
        Recover account
      </h2>

      {submitted ? (
        <div className="text-center">
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-4 rounded-xl text-sm font-medium mb-6">
            If an account is associated with <b>{email}</b>, you will receive a password reset link.
          </div>
          <Link
            to="/login"
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-violet-500/30 w-full transition-all cursor-pointer inline-block text-center"
          >
            Back to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="text-gray-400 text-sm mb-6 text-center">
            Enter your email address and we&#39;ll send you a link to reset your password.
          </p>

          <div className="mb-6">
            <label className="block text-gray-500 text-xs uppercase tracking-widest font-bold mb-2 ml-1">
              Email Address
            </label>
            <input
              className="bg-gray-950/50 border border-white/5 text-white text-base rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 block w-full p-3.5 outline-none transition-all placeholder-gray-600 shadow-inner"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <button
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-violet-500/30 w-full transition-all cursor-pointer"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>

          {errorMsg && (
            <div className="mt-5 bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-block align-baseline font-semibold text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Remember your password? Log in
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
