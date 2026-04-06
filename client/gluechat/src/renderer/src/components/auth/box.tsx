import {Link} from "react-router-dom";
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
    <div className="  bg-[#EAEAEA] p-8 rounded-2xl shadow-xl w-full max-w-md mx-auto border border-[#404E7C]/10">
      <h2 className="text-2xl font-bold mb-6 text-center text-[#404E7C] font-['Oswald']">{text}</h2>
      <form>

        {!isLogin && (
          <div className="mb-4">
            <label className="block text-[#404E7C] text-sm font-semibold mb-2">
              Nickname
            </label>
            <input
              className="bg-gray-200 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#404E7C] focus:border-[#404E7C] block w-full p-2.5 outline-none transition-all"
              id="nickname"
              type="text"
              onChange={(e) => setNickname ? setNickname(e.target.value) : ""}
              placeholder="Your Nickname"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-[#404E7C] text-sm font-semibold mb-2">
            Email
          </label>
          <input
            className="bg-gray-200 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#404E7C] focus:border-[#404E7C] block w-full p-2.5 outline-none transition-all"
            id="email"
            type="email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
          />
        </div>
        <div className="mb-6">
          <label className="block text-[#404E7C] text-sm font-semibold mb-2" >
            Password
          </label>
          <input
            className="bg-gray-200 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#404E7C] focus:border-[#404E7C] block w-full p-2.5 outline-none transition-all"
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
              className="bg-[#404E7C] hover:bg-[#343e63] text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-[#404E7C]/30 w-full transition-all cursor-pointer"
              type="button"
            >
              Log in
            </button>
          </div>

        ) : (
          <div className="flex items-center justify-between">

          <button
            onClick={() => {handleSubmit("register")}}
          className="bg-[#404E7C] hover:bg-[#343e63] text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-[#404E7C]/30 w-full transition-all cursor-pointer"
          type="button"
          >
          Sign up
          </button>
          </div>
          )}



          <div className="mt-6 text-center">
            <p className={"text-red-500 text-sm font-bold"}>{errorMsg}</p>
          </div>


        {registered && (
          <div className="mt-6 text-center">
            <p className={"text-green-400 text-sm font-bold"}>{"Successfully registered!"}</p>
          </div>
        )}






        {isLogin ? (
          <div className="mt-6 text-center">
            <Link to="/register" className="inline-block align-baseline font-semibold text-sm text-[#404E7C] hover:text-[#343e63] transition-colors">
              Don't have an account? Sign up
            </Link>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <Link  to="/" className="inline-block align-baseline font-semibold text-sm text-[#404E7C] hover:text-[#343e63] transition-colors" >
              You have an account? Log in
            </Link>
          </div>
        )}

      </form>
    </div>
  )
}
