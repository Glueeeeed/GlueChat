import {Link, useNavigate} from "react-router-dom";
import {useState} from "react";
import {validateEmail, validateNickname, validatePassword} from "@renderer/assets/utils";
import {register} from "@renderer/assets/register";
import {login} from "@renderer/assets/login";

interface Props {
  isLogin: boolean;
  nickname: string | null;
  email: string;
  password: string;
  setNickname?: (newNickname: string) => void;
  setEmail: (newEmail: string) => void;
  setPassword: (newPassword: string) => void;

}

interface result {
  success: boolean;
  message: string;
}




export function Box({ isLogin, nickname, email, password, setNickname,setPassword,setEmail }: Props) {

  const [errorMsg, setErrorMsg] = useState("");
  const [registered, setRegistered] = useState(false);
  const text = isLogin ? "Login" : "Register";
  const navigate = useNavigate();

  const handleRegister = async () : Promise<void> => {
    const registrationResult : result = await register(nickname as string, email, password);
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
    const loginResult = await login(email,password);
    if (loginResult.success) {
      navigate("/");
    } else {
      setTimeout(() => {
        setErrorMsg("");
      },5000)
      setErrorMsg(loginResult.message);
    }
  }


  const handleSubmit = async (op : string) : Promise<void> => {

    try {
      if (op === "register") {
        validateNickname(nickname as string);
      }
      validateEmail(email);
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
      <h2 className="text-2xl font-black mb-8 text-center text-white uppercase tracking-wider">{text}</h2>
      <form>

        {!isLogin && (
          <div className="mb-5">
            <label className="block text-gray-500 text-xs uppercase tracking-widest font-bold mb-2 ml-1">
              Nickname
            </label>
            <input
              className="bg-gray-950/50 border border-white/5 text-white text-base rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 block w-full p-3.5 outline-none transition-all placeholder-gray-600 shadow-inner"
              id="nickname"
              type="text"
              onChange={(e) => setNickname ? setNickname(e.target.value) : ""}
              placeholder="Your Nickname"
            />
          </div>
        )}

        <div className="mb-5">
          <label className="block text-gray-500 text-xs uppercase tracking-widest font-bold mb-2 ml-1">
            Email
          </label>
          <input
            className="bg-gray-950/50 border border-white/5 text-white text-base rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 block w-full p-3.5 outline-none transition-all placeholder-gray-600 shadow-inner"
            id="email"
            type="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
          />
        </div>
        <div className="mb-8">
          <label className="block text-gray-500 text-xs uppercase tracking-widest font-bold mb-2 ml-1" >
            Password
          </label>
          <input
            className="bg-gray-950/50 border border-white/5 text-white text-base rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 block w-full p-3.5 outline-none transition-all placeholder-gray-600 shadow-inner"
            id="password"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />
        </div>



        {isLogin ? (
          <div className="flex items-center justify-between">
            <button
              onClick={() => {handleSubmit("login")}}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/30 w-full transition-all cursor-pointer"
              type="button"
            >
              Log in
            </button>
          </div>

        ) : (
          <div className="flex items-center justify-between">

          <button
            onClick={() => {handleSubmit("register")}}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-500/30 w-full transition-all cursor-pointer"
          type="button"
          >
          Sign up
          </button>
          </div>
          )}



          <div className="mt-6 text-center">
            <p className={"text-red-400 text-sm font-bold"}>{errorMsg}</p>
          </div>


        {registered && (
          <div className="mt-6 text-center">
            <p className={"text-green-400 text-sm font-bold"}>{"Successfully registered!"}</p>
          </div>
        )}






        {isLogin ? (
          <div className="mt-6 text-center">
            <Link to="/register" className="inline-block align-baseline font-semibold text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Don't have an account? Sign up
            </Link>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link  to="/login" className="inline-block align-baseline font-semibold text-sm text-blue-400 hover:text-blue-300 transition-colors" >
              You have an account? Log in
            </Link>
          </div>
        )}

      </form>
    </div>
  )
}
