"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useAutoDriveSync } from "@/hooks/useAutoDriveSync";

function AuthSync() {
  const { data: session, status } = useSession();
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
    } else {
      setLoading(false);
      setSession(session);
    }
  }, [session, status, setSession, setLoading]);

  return null;
}

function DriveSyncGlobal() {
  const { isAuthenticated } = useAuthStore();
  
  // Включаем автоматическую синхронизацию глобально для всех страниц
  useAutoDriveSync(isAuthenticated());

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSync />
      <DriveSyncGlobal />
      {children}
    </SessionProvider>
  );
}

