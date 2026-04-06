import { FaUsers } from 'react-icons/fa';
import { BiSolidMessageSquareDetail } from "react-icons/bi";
import { Tab } from "../../views/App";

interface ChatBarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export function ChatBar({ activeTab, setActiveTab }: ChatBarProps) {
  return (
    <div className="w-17.5 bg-gray-950 flex flex-col items-center py-4 gap-4 shadow-xl">
      <button
        onClick={() => setActiveTab('chats')}
        className={`p-3 rounded-xl transition-all duration-200 cursor-pointer group ${
          activeTab === 'chats'
            ? 'text-white bg-gray-800'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
        title="Chats"
      >
        <BiSolidMessageSquareDetail
          size={24}
          className={`transition-transform ${activeTab === 'chats' ? 'scale-110' : 'group-hover:scale-110'}`}
        />
      </button>

      <button
        onClick={() => setActiveTab('friends')}
        className={`p-3 rounded-xl transition-all duration-200 cursor-pointer group ${
          activeTab === 'friends'
            ? 'text-white bg-gray-800'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
        title="Friends"
      >
        <FaUsers
          size={24}
          className={`transition-transform ${activeTab === 'friends' ? 'scale-110' : 'group-hover:scale-110'}`}
        />
      </button>
    </div>
  );
}
