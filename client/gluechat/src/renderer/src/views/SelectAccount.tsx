import {SelectAccountBox} from "@renderer/components/auth/SelectAccountBox";

export function SelectAccount() {
  return (
    <>
      <div className="w-full h-full flex items-center justify-center flex-col">
        <div className={'mt-10'}>
          <h1 className=' text-center text-5xl mt-5 mb-5 font-["Pacifico"] text-[#eff1ed]'>
            GlueChat
          </h1>
          <p className="text-white opacity-60 text-[10px] uppercase tracking-[0.4em] font-medium mt-6 text-center max-w-md">
            Quantum-resistant • Private by design
          </p>
        </div>
        <div className=" mt-30 w-full h-full flex items-center justify-center flex-col ">
          <SelectAccountBox />
        </div>
      </div>
    </>
  )
}
