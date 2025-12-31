"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import { getPlannedTransactions, updateTransaction, Transaction } from "@/lib/transactions";
import { format, parseISO } from "date-fns";
import { useToastStore } from "@/store/toastStore";

export default function UpcomingPage() {
  return (
    <ProtectedRoute>
      <UpcomingContent />
    </ProtectedRoute>
  );
}

function UpcomingContent() {
  const { session } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const { addToast } = useToastStore();

  const loadTransactions = async () => {
    if (!session?.user?.email) return;
    try {
      const data = await getPlannedTransactions(session.user.email, days);
      setTransactions(data);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, days]);

  const markAsCompleted = async (transaction: Transaction) => {
    if (!session?.user?.email) return;
    try {
      await updateTransaction(session.user.email, transaction.id, {
        status: "completed",
        is_planned: false,
      });
      addToast("Платеж отмечен как выполненный", "success");
      await loadTransactions();
    } catch (error) {
      console.error("Error updating transaction:", error);
      addToast("Ошибка при обновлении транзакции", "error");
    }
  };

  const markAsRejected = async (transaction: Transaction) => {
    if (!session?.user?.email) return;
    try {
      await updateTransaction(session.user.email, transaction.id, {
        status: "rejected",
        is_planned: false,
      });
      addToast("Платеж отклонен", "success");
      await loadTransactions();
    } catch (error) {
      console.error("Error updating transaction:", error);
      addToast("Ошибка при обновлении транзакции", "error");
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      income: "Доход",
      expense: "Расход",
      investment: "Инвестиция",
      crypto: "Криптовалюта",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      income: "text-green-600 dark:text-green-400",
      expense: "text-red-600 dark:text-red-400",
      investment: "text-blue-600 dark:text-blue-400",
      crypto: "text-purple-600 dark:text-purple-400",
    };
    return colors[type] || "";
  };

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <main className="flex w-full flex-col gap-4 py-4 px-4 sm:py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Ближайшие платежи</h1>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
          >
            <option value={7}>7 дней</option>
            <option value={30}>30 дней</option>
            <option value={90}>90 дней</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка...</p>
        ) : transactions.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Нет запланированных платежей
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.map((tx) => {
              const txDate = parseISO(tx.date);
              const isPast = txDate < new Date();
              return (
                <div
                  key={tx.id}
                  className={`rounded-lg border p-4 ${
                    isPast
                      ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${getTypeColor(tx.type)}`}>
                          {getTypeLabel(tx.type)}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-500">
                          {tx.category}
                        </span>
                      </div>
                      {tx.description && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                          {tx.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
                        <span>
                          {format(txDate, "d MMMM yyyy")}
                        </span>
                        <span className="font-semibold text-foreground">
                          {tx.amount.toLocaleString("ru-RU", {
                            style: "currency",
                            currency: "RUB",
                            minimumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAsRejected(tx)}
                        className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-3 py-1.5 text-xs font-medium text-red-800 dark:text-red-400 transition-colors active:bg-red-100 dark:active:bg-red-900 touch-manipulation"
                      >
                        Отклонить
                      </button>
                      <button
                        onClick={() => markAsCompleted(tx)}
                        className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/50 px-3 py-1.5 text-xs font-medium text-green-800 dark:text-green-400 transition-colors active:bg-green-100 dark:active:bg-green-900 touch-manipulation"
                      >
                        Выполнено
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

