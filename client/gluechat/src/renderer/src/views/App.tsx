import {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import {initAuthToken} from "@renderer/assets/utils";


export function App() {
  const [authToken , setAuthToken] = useState<string | null>(null);
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
    <>
      <h1>GlueChat</h1>
    </>
  )
}
