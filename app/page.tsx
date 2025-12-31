"use client";

// Отключаем SSR для этой страницы
export const dynamic = 'force-dynamic';

import dynamicImport from "next/dynamic";
import { signOut } from "next-auth/react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuthStore } from "@/store/authStore";

const DatabaseInfo = dynamicImport(() => import("@/components/DatabaseInfo"), {
  ssr: false,
});

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}

function HomeContent() {
  const { session } = useAuthStore();
  const username = session?.user?.name || session?.user?.email || "Пользователь";

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-start justify-start py-4 px-4 sm:py-8 sm:px-6 md:py-12 md:px-8 bg-white dark:bg-black">
        <div className="mb-6 flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50 sm:text-3xl">
            Hello World
          </h1>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm truncate max-w-[200px] sm:max-w-none">
              {username}
            </p>
            <button
              onClick={() => signOut()}
              className="rounded-full border border-solid border-black/[.08] px-4 py-2.5 text-sm transition-colors active:bg-black/[.04] hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:active:bg-[#1a1a1a] dark:hover:bg-[#1a1a1a] touch-manipulation"
            >
              Выйти
            </button>
          </div>
        </div>
        
        <div className="flex w-full flex-col gap-4">
          {session?.user?.email && <DatabaseInfo email={session.user.email} />}
        </div>
      </main>
    </div>
  );
}
