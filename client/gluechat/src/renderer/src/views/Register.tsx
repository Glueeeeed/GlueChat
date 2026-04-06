import {Box} from "@renderer/components/auth/box";
import {useState} from "react";

export function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  return (
    <>
      <div className=' w-full h-full flex items-center justify-center flex-col '>
        <div className=' font-["Oswald"] mt-50'>
          <h1 className='text-5xl font-bold  text-center text-[#404E7C]'>
            GlueChat
          </h1>
          <p className="opacity-80 text-sm text-[#404E7C] mt-3 text-center max-w-md">
            Quantum-resistant • End-to-End Encrypted • Private by design
          </p>
        </div>
        <div className=' mt-30 w-full h-full flex items-center justify-center flex-col '>
          <Box isLogin={false} email={email} password={password} setPassword={setPassword} setEmail={setEmail} setNickname={setNickname} nickname={nickname} />
        </div>
      </div>
    </>
  )
}
