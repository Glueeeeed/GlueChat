import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FaUserCircle, FaPlus } from "react-icons/fa";

export function SelectAccountBox() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedAccounts = JSON.parse(localStorage.getItem("accounts") || "[]");
    setAccounts(savedAccounts);
  }, []);

  const handleSelect = (nickname: string) => {
    localStorage.setItem("nickname", nickname);
    navigate("/");
  };

  const handleAddAccount = () => {
    navigate("/login");
  };

  const handleRemoveAccount = (e: React.MouseEvent, nickname: string) => {
    e.stopPropagation();
    const updated = accounts.filter(acc => acc !== nickname);
    setAccounts(updated);
    localStorage.setItem("accounts", JSON.stringify(updated));
     window.auth.deleteRefreshToken(nickname);
    if (localStorage.getItem("nickname") === nickname) {
        localStorage.removeItem("nickname");
    }
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-md mx-auto border border-white/10">
      <h2 className="text-2xl font-black mb-8 text-center text-white uppercase tracking-wider">Select Acccunt</h2>

      <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {accounts.map((nickname) => (
          <div
            key={nickname}
            onClick={() => handleSelect(nickname)}
            className="flex items-center justify-between p-4 bg-gray-950/50 border border-white/5 rounded-2xl hover:bg-gray-800/50 cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-4">
              <FaUserCircle size={32} className="text-gray-700 group-hover:text-gray-600" />
              <span className="text-white font-semibold">{nickname}</span>
            </div>
            <button
              onClick={(e) => handleRemoveAccount(e, nickname)}
              className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
              title="Remove account"
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={handleAddAccount}
          className="w-full flex items-center justify-center gap-3 p-4 border-2 border-dashed border-white/10 rounded-2xl text-gray-400 hover:text-white hover:border-violet-500/50 hover:bg-violet-500/5 transition-all cursor-pointer mt-4"
        >
          <FaPlus size={16} />
          <span className="font-bold uppercase tracking-widest text-sm">Add Account</span>
        </button>
      </div>
    </div>
  );
}
