import {Link} from "react-router-dom";

interface Props {
  isLogin: boolean;
}


export function Box({ isLogin }: Props) {

  const text = isLogin ? "Login" : "Register";

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
            placeholder="••••••••••••"
          />
        </div>

        {isLogin ? (
          <div className="flex items-center justify-between">
            <button
              className="bg-[#404E7C] hover:bg-[#343e63] text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-[#404E7C]/30 w-full transition-all cursor-pointer"
              type="button"
            >
              Log in
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
          <button
          className="bg-[#404E7C] hover:bg-[#343e63] text-white font-bold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-[#404E7C]/30 w-full transition-all cursor-pointer"
          type="button"
          >
          Sign up
          </button>
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
