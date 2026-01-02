"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import TransactionForm from "@/components/TransactionForm";
import {
  getTransactions,
  deleteTransaction,
  filterTransactions,
  Transaction,
  TransactionType,
} from "@/lib/transactions";
import { format, parseISO } from "date-fns";
import { useToastStore } from "@/store/toastStore";
import { getDefaultCurrency, formatCurrency, getCurrencySymbol } from "@/lib/currency";
import { convertCurrency } from "@/lib/exchange";

export default function TransactionsPage() {
  return (
    <ProtectedRoute>
      <TransactionsContent />
    </ProtectedRoute>
  );
}

function TransactionsContent() {
  const { session } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<string>("USD");
  const [convertedAmounts, setConvertedAmounts] = useState<Map<string, number>>(new Map());
  const [converting, setConverting] = useState(false);
  const [filters, setFilters] = useState<{
    type?: TransactionType;
    search?: string;
  }>({});
  const { addToast } = useToastStore();

  const loadTransactions = async () => {
    if (!session?.user?.email) return;
    try {
      const data = await getTransactions(session.user.email);
      setTransactions(data);
      setFiltered(data);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.email) {
      const currency = getDefaultCurrency(session.user.email);
      setDefaultCurrency(currency);
    }
  }, [session]);

  useEffect(() => {
    loadTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Конвертация сумм в стандартную валюту
  useEffect(() => {
    const convertAmounts = async () => {
      if (!session?.user?.email || filtered.length === 0) return;
      
      setConverting(true);
      const amounts = new Map<string, number>();
      
      for (const tx of filtered) {
        const txCurrency = tx.currency || defaultCurrency;
        if (txCurrency === defaultCurrency) {
          amounts.set(tx.id, tx.amount);
        } else {
          try {
            const converted = await convertCurrency(tx.amount, txCurrency, defaultCurrency);
            amounts.set(tx.id, converted);
          } catch (error) {
            console.error(`Error converting ${tx.id}:`, error);
            amounts.set(tx.id, tx.amount);
          }
        }
      }
      
      setConvertedAmounts(amounts);
      setConverting(false);
    };
    
    convertAmounts();
  }, [filtered, defaultCurrency, session]);

  useEffect(() => {
    const filtered = filterTransactions(transactions, filters);
    setFiltered(filtered);
  }, [transactions, filters]);

  const handleDelete = async (id: string) => {
    if (!session?.user?.email || !confirm("Удалить транзакцию?")) return;
    try {
      await deleteTransaction(session.user.email, id);
      addToast("Транзакция удалена успешно", "success");
      await loadTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      addToast("Ошибка при удалении транзакции", "error");
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
      income: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400",
      expense: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400",
      investment: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400",
      crypto: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400",
    };
    return colors[type] || "";
  };

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <main className="flex w-full flex-col gap-4 py-4 px-4 sm:py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Все транзакции</h1>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={filters.type || ""}
            onChange={(e) =>
              setFilters({ ...filters, type: (e.target.value as TransactionType) || undefined })
            }
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value="">Все типы</option>
            <option value="income">Доходы</option>
            <option value="expense">Расходы</option>
            <option value="investment">Инвестиции</option>
            <option value="crypto">Криптовалюта</option>
          </select>
          <input
            type="text"
            placeholder="Поиск..."
            value={filters.search || ""}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          />
        </div>

        {editing ? (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="mb-4 text-lg font-semibold">Редактирование транзакции</h2>
            <TransactionForm
              email={session?.user?.email || ""}
              transaction={editing}
              onSuccess={() => {
                setEditing(null);
                loadTransactions();
              }}
              onCancel={() => setEditing(null)}
            />
          </div>
        ) : loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {transactions.length === 0
                ? "Нет транзакций"
                : "Транзакции не найдены"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((tx) => {
              const txDate = parseISO(tx.date);
              return (
                <div
                  key={tx.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${getTypeColor(tx.type)}`}
                        >
                          {getTypeLabel(tx.type)}
                        </span>
                        {tx.status === "pending" && tx.is_planned && (
                          <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400">
                            Запланировано
                          </span>
                        )}
                        {tx.status === "completed" && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/50 dark:text-green-400">
                            Выполнено
                          </span>
                        )}
                        {tx.status === "rejected" && (
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/50 dark:text-red-400">
                            Отклонено
                          </span>
                        )}
                        {tx.status === "pending" && !tx.is_planned && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
                            Ожидает
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold mb-1">
                        {(() => {
                          const txCurrency = tx.currency || defaultCurrency;
                          const convertedAmount = convertedAmounts.get(tx.id) ?? tx.amount;
                          const isConverted = txCurrency !== defaultCurrency;
                          
                          if (converting && isConverted) {
                            return "Конвертация...";
                          }
                          
                          const mainAmount = formatCurrency(convertedAmount, defaultCurrency);
                          if (isConverted) {
                            const originalAmount = formatCurrency(tx.amount, txCurrency);
                            return `${mainAmount} (${originalAmount})`;
                          }
                          return mainAmount;
                        })()}
                      </p>
                      {tx.description && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                          {tx.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
                        <span>{tx.category}</span>
                        <span>{format(txDate, "d MMM yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(tx)}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs font-medium transition-colors active:bg-zinc-100 dark:active:bg-zinc-900 touch-manipulation"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="rounded-lg border border-red-200 dark:border-red-900 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 transition-colors active:bg-red-50 dark:active:bg-red-950/50 touch-manipulation"
                      >
                        Удалить
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

