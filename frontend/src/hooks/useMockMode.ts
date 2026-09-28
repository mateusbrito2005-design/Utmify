import { useState, useEffect } from "react";

export function useMockMode() {
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMock(sessionStorage.getItem("mock_mode") === "true");
    };

    check();

    // Observa mudanças no sessionStorage (ex: ao navegar com ?mock=true)
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  const deactivateMock = () => {
    sessionStorage.removeItem("mock_mode");
    setIsMock(false);

    // Remove ?mock=true da URL e recarrega para buscar dados reais
    const url = new URL(window.location.href);
    url.searchParams.delete("mock");
    window.location.replace(url.toString());
  };

  return { isMock, deactivateMock };
}
