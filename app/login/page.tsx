"use client";

// Отключаем SSR для этой страницы
export const dynamic = 'force-dynamic';

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-4">
        <p className="text-base text-zinc-600 dark:text-zinc-400">Загрузка...</p>
      </div>
    );
  }

  if (status === "authenticated") {
    return null; // Редирект происходит через useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-4">
      <main className="flex w-full max-w-md flex-col items-center gap-6">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50 text-center sm:text-3xl">
          Вход в приложение
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400 text-center sm:text-lg">
          Для продолжения необходимо войти через Google аккаунт
        </p>
        <button
          onClick={() => signIn("google")}
          className="flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-foreground px-6 text-background text-base transition-colors active:bg-[#383838] hover:bg-[#383838] dark:active:bg-[#ccc] dark:hover:bg-[#ccc] touch-manipulation"
        >
          Войти через Google
        </button>
      </main>
    </div>
  );
}

