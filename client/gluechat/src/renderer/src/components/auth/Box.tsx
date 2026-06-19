import {Link, useNavigate} from "react-router-dom";
import {useState} from "react";
import {  validateNickname, validatePassword } from '@renderer/assets/utils'
import {register} from "@renderer/assets/register";
import {login} from "@renderer/assets/login";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  isLogin: boolean;
  nickname: string;
  password: string;
  accessCode?: string;
  setNickname?: (newNickname: string) => void;
  setAccessCode?: (newAccessCode: string) => void;
  setPassword: (newPassword: string) => void;

}

interface result {
  success: boolean;
  message: string;
  mfaRequired?: boolean;
}

export function Box({ isLogin, nickname, password, setNickname,setPassword, setAccessCode , accessCode}: Props) {

  const [errorMsg, setErrorMsg] = useState("");
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [code2fa, setCode2fa] = useState("");

  const text = mfaRequired ? "Two-Factor Authentication" : (isLogin ? "Login" : "Register");
  const navigate = useNavigate();

  const handleRegister = async () : Promise<void> => {
    const registrationResult : result = await register(nickname, password, accessCode);
    if (registrationResult.success) {
      setTimeout(() => {
        setRegistered(false);
      },5000)
      setRegistered(true);
    } else {
      setTimeout(() => {
        setErrorMsg("");
      },5000)
      setErrorMsg(registrationResult.message);
    }
  }


  const handleLogin = async () : Promise<void> => {
    const loginResult = await login(nickname,password, code2fa);
    if (loginResult.success) {
      if (loginResult.mfaRequired) {
        setMfaRequired(true);
      } else {
        navigate("/");
      }
    } else {
      setTimeout(() => {
        setErrorMsg("");
      },5000)
      setErrorMsg(loginResult.message);
    }
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLogin) {
        await handleRegister()
      } else {
        await handleLogin()
      }
    }
  }


  const handleSubmit = async (op : string) : Promise<void> => {

    try {
      validateNickname(nickname);
      validatePassword(password);

    } catch (err: any) {
        setTimeout(() => {
          setErrorMsg("");
        },5000)
        setErrorMsg(err.message);
        return;

    }

    if (op === "register") {
      await handleRegister();
    } else {
      await handleLogin();
    }

  }



  return (
    <div className="bg-gray-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-md mx-auto border border-white/10">
      <h2 className="text-2xl font-black mb-8 text-center text-white uppercase tracking-wider">
        {text}
      </h2>
      <form>
        {mfaRequired ? (
          <div className="mb-8 text-center">
            <p className="text-gray-400 text-sm mb-6">
              Enter the 6-digit code from your authenticator app to continue.
            </p>
            <div className="mb-6">
              <label className="block text-gray-500 text-xs uppercase tracking-widest font-bold mb-2 ml-1 text-left">
                2FA Code
              </label>
              <input
                maxLength={6}
                className="bg-gray-950/50 border border-white/5 text-white text-base rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 block w-full p-3.5 outline-none transition-all placeholder-gray-600 shadow-inner"
                id="code2fa"
                type="text"
                autoFocus
                onChange={(e) => setCode2fa(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="000 000"
              />
            </div>
            <button
              onClick={handleLogin}
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-violet-500/30 w-full transition-all cursor-pointer mb-4"
              type="button"
            >
              Verify & Login
            </button>
            <button
              onClick={() => {
                setMfaRequired(false)
                setCode2fa('')
              }}
              className="text-gray-500 hover:text-gray-300 text-xs uppercase tracking-widest font-bold transition-colors"
              type="button"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <label className="block text-gray-500 text-xs uppercase tracking-widest font-bold mb-2 ml-1">
                Nickname
              </label>
              <input
                maxLength={20}
                className="bg-gray-950/50 border border-white/5 text-white text-base rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 block w-full p-3.5 outline-none transition-all placeholder-gray-600 shadow-inner"
                id="nickname"
                type="text"
                onChange={(e) => (setNickname ? setNickname(e.target.value) : '')}
                onKeyDown={handleKeyDown}
                placeholder="Your Nickname"
              />
            </div>

            <div className="mb-8">
              <label className="block text-gray-500 text-xs uppercase tracking-widest font-bold mb-2 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  maxLength={32}
                  className="bg-gray-950/50 border border-white/5 text-white text-base rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 block w-full p-3.5 pr-12 outline-none transition-all placeholder-gray-600 shadow-inner"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="mb-8">
                <label className="block text-gray-500 text-xs uppercase tracking-widest font-bold mb-2 ml-1">
                  Beta Access Code
                </label>
                <input
                  maxLength={32}
                  className="bg-gray-950/50 border border-white/5 text-white text-base rounded-xl focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 block w-full p-3.5 outline-none transition-all placeholder-gray-600 shadow-inner"
                  id="accessCode"
                  type="text"
                  onKeyDown={handleKeyDown}
                  onChange={(e) => (setAccessCode ? setAccessCode(e.target.value) : '')}
                  placeholder="Beta Access Code"
                />
              </div>
            )}

            {isLogin ? (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    handleSubmit('login')
                  }}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-violet-500/30 w-full transition-all cursor-pointer"
                  type="button"
                >
                  Log in
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    handleSubmit('register')
                  }}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-violet-500/30 w-full transition-all cursor-pointer"
                  type="button"
                >
                  Sign up
                </button>
              </div>
            )}
          </>
        )}

        {errorMsg && (
          <div className="mt-5 bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {registered && (
          <div className="mt-5 bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-4 rounded-xl text-sm font-medium">
            <p>Successfully registered!</p>
          </div>
        )}

        {isLogin ? (
          <div className="mt-6 text-center">
            <Link
              to="/register"
              className="inline-block align-baseline font-semibold text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Don&#39;t have an account? Sign up
            </Link>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-block align-baseline font-semibold text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              You have an account? Log in
            </Link>
          </div>
        )}
      </form>
    </div>
  )
}
