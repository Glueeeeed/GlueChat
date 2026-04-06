import {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import {initAuthToken} from "@renderer/assets/utils";
import {ChatBar} from "@renderer/components/app/ChatBar";

export type Tab = 'chats' | 'friends';

export function App() {
  const [authToken , setAuthToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const navigate = useNavigate();


  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const token = await initAuthToken();
        if (isMounted) setAuthToken(token);
      } catch (e) {
        if (isMounted) navigate("/login");
      }
    };

    checkAuth();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ChatBar activeTab={activeTab} setActiveTab={setActiveTab} />

    </div>
  )
}
