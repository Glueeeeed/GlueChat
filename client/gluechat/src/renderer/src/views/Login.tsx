import {Box} from "@renderer/components/auth/Box";
import {useState} from "react";
export function Login() {
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");

  return (
    <>
      <div className="w-full h-full flex items-center justify-center flex-col">
        <div className={'mt-10'}>
          <h1 className=' text-center text-6xl mt-5 mb-5 font-["Pacifico"] text-[#eff1ed]'>
            GlueChat
          </h1>
          <p className="text-white opacity-60 text-[10px] uppercase tracking-[0.4em] font-medium mt-10 text-center max-w-md">
            Post-Quantum • End-to-End Encrypted Messenger
          </p>
        </div>
        <div className=" mt-30 w-full h-full flex items-center justify-center flex-col ">
          <Box
            isLogin={true}
            password={password}
            setPassword={setPassword}
            nickname={nickname}
            setNickname={setNickname}
          />
        </div>
      </div>
    </>
  )
}
