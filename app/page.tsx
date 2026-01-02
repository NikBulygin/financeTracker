"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import TransactionForm from "@/components/TransactionForm";
import AlertBanner from "@/components/AlertBanner";
import { useAuthStore } from "@/store/authStore";
import { getTransactions } from "@/lib/transactions";
import { getAlerts } from "@/lib/alerts";
import { getDefaultCurrency } from "@/lib/currency";

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}

function HomeContent() {
  const { session } = useAuthStore();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Автоматическая синхронизация работает глобально через Providers

  const loadAlerts = async () => {
    if (!session?.user?.email) return;
    try {
      const transactions = await getTransactions(session.user.email);
      const defaultCurrency = getDefaultCurrency(session.user.email);
      const alertData = await getAlerts(transactions, defaultCurrency);
      setAlerts(alertData);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const username = session?.user?.name || session?.user?.email || "Пользователь";

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <main className="flex w-full flex-col gap-4 py-4 px-4 sm:py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Финансовое приложение</h1>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs font-medium transition-colors active:bg-zinc-100 dark:active:bg-zinc-900 touch-manipulation"
          >
            Выйти
          </button>
        </div>

        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {username}
        </div>

        {!loading && <AlertBanner alerts={alerts} />}

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="mb-4 text-lg font-semibold">Добавить операцию</h2>
          {session?.user?.email && (
            <TransactionForm
              email={session.user.email}
              onSuccess={() => {
                loadAlerts();
              }}
            />
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
