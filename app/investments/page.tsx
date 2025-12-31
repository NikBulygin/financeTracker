"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import { getTransactions, filterTransactions, Transaction } from "@/lib/transactions";
import { format, parseISO } from "date-fns";
import { getCryptoRate, convertToUSD } from "@/lib/exchange";

export default function InvestmentsPage() {
  return (
    <ProtectedRoute>
      <InvestmentsContent />
    </ProtectedRoute>
  );
}

interface PortfolioAsset {
  asset: string;
  amount: number;
  amountUSD: number;
  currentPriceUSD: number;
  currentValueUSD: number;
  profitLossUSD: number;
  profitLossPercent: number;
}

function InvestmentsContent() {
  const { session } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [filter, setFilter] = useState<"all" | "investment" | "crypto">("all");
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [totalValueUSD, setTotalValueUSD] = useState(0);
  const [totalCostUSD, setTotalCostUSD] = useState(0);

  const loadTransactions = async () => {
    if (!session?.user?.email) return;
    try {
      const data = await getTransactions(session.user.email);
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
  }, [session]);

  const calculatePortfolio = async () => {
    if (!transactions.length) return;
    
    setLoadingPortfolio(true);
    try {
      const portfolioMap = new Map<string, PortfolioAsset>();

      // Обрабатываем транзакции
      for (const tx of transactions) {
        if (tx.type !== "investment" && tx.type !== "crypto") continue;

        const asset = tx.category || tx.to_asset || "UNKNOWN";
        const amount = tx.amount;
        const costUSD = tx.amount_usd || (tx.currency ? await convertToUSD(amount, tx.currency) : amount);

        const existing = portfolioMap.get(asset);
        if (existing) {
          existing.amount += amount;
          existing.amountUSD += costUSD;
        } else {
          portfolioMap.set(asset, {
            asset,
            amount,
            amountUSD: costUSD,
            currentPriceUSD: 0,
            currentValueUSD: 0,
            profitLossUSD: 0,
            profitLossPercent: 0,
          });
        }
      }

      // Получаем текущие курсы
      const portfolioArray: PortfolioAsset[] = [];
      for (const [asset, data] of portfolioMap.entries()) {
        let currentPrice = 0;
        
        // Определяем тип актива
        const cryptoAssets = ["BTC", "ETH", "USDT", "BNB", "SOL", "XRP", "ADA", "DOGE"];
        const isCrypto = cryptoAssets.includes(asset.toUpperCase());
        
        if (isCrypto) {
          currentPrice = await getCryptoRate(asset.toUpperCase());
        } else {
          // Для других активов используем сохраненный курс или 0
          // В реальном приложении здесь был бы вызов API для акций
          currentPrice = 0;
        }

        const currentValue = currentPrice > 0 ? data.amount * currentPrice : data.amountUSD;
        const profitLoss = currentValue - data.amountUSD;
        const profitLossPercent = data.amountUSD > 0 ? (profitLoss / data.amountUSD) * 100 : 0;

        portfolioArray.push({
          ...data,
          currentPriceUSD: currentPrice,
          currentValueUSD: currentValue,
          profitLossUSD: profitLoss,
          profitLossPercent,
        });
      }

      // Сортируем по текущей стоимости
      portfolioArray.sort((a, b) => b.currentValueUSD - a.currentValueUSD);

      setPortfolio(portfolioArray);
      setTotalValueUSD(portfolioArray.reduce((sum, p) => sum + p.currentValueUSD, 0));
      setTotalCostUSD(portfolioArray.reduce((sum, p) => sum + p.amountUSD, 0));
    } catch (error) {
      console.error("Error calculating portfolio:", error);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  useEffect(() => {
    if (transactions.length > 0) {
      calculatePortfolio();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const filtered = filterTransactions(transactions, {
    type: filter === "all" ? undefined : filter,
  });

  const investments = filtered.filter((t) => t.type === "investment");
  const crypto = filtered.filter((t) => t.type === "crypto");

  const totalInvestments = investments.reduce((sum, t) => sum + t.amount, 0);
  const totalCrypto = crypto.reduce((sum, t) => sum + t.amount, 0);

  const groupByCategory = (txs: Transaction[]) => {
    const groups = new Map<string, number>();
    txs.forEach((tx) => {
      const current = groups.get(tx.category) || 0;
      groups.set(tx.category, current + tx.amount);
    });
    return Array.from(groups.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));
  };

  const investmentGroups = groupByCategory(investments);
  const cryptoGroups = groupByCategory(crypto);

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <main className="flex w-full flex-col gap-4 py-4 px-4 sm:py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Портфель</h1>
          <button
            onClick={calculatePortfolio}
            disabled={loadingPortfolio || !transactions.length}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {loadingPortfolio ? "Обновление..." : "Обновить курсы"}
          </button>
        </div>

        {/* Сводка портфеля */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Текущая стоимость</p>
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              ${totalValueUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Стоимость покупки</p>
            <p className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300">
              ${totalCostUSD.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Прибыль/Убыток</p>
            <p
              className={`text-2xl font-semibold ${
                totalValueUSD - totalCostUSD >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              ${(totalValueUSD - totalCostUSD).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p
              className={`text-xs mt-1 ${
                totalValueUSD - totalCostUSD >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {totalCostUSD > 0
                ? `${(((totalValueUSD - totalCostUSD) / totalCostUSD) * 100).toFixed(2)}%`
                : "0%"}
            </p>
          </div>
        </div>

        {/* Портфель активов */}
        {portfolio.length > 0 && (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="mb-4 text-lg font-semibold">Активы</h2>
            <div className="space-y-3">
              {portfolio.map((asset) => (
                <div
                  key={asset.asset}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex-1">
                    <p className="font-medium">{asset.asset}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {asset.amount.toFixed(6)} шт. × ${asset.currentPriceUSD > 0 ? asset.currentPriceUSD.toFixed(2) : "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${asset.currentValueUSD.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p
                      className={`text-xs ${
                        asset.profitLossUSD >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {asset.profitLossUSD >= 0 ? "+" : ""}
                      ${asset.profitLossUSD.toFixed(2)} ({asset.profitLossPercent >= 0 ? "+" : ""}
                      {asset.profitLossPercent.toFixed(2)}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Инвестиции</p>
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {totalInvestments.toLocaleString("ru-RU")} ₽
            </p>
            {investmentGroups.length > 0 && (
              <div className="mt-3 space-y-1">
                {investmentGroups.map((group) => (
                  <div key={group.category} className="flex justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">{group.category}</span>
                    <span className="font-medium">
                      {group.amount.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Криптовалюта</p>
            <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
              {totalCrypto.toLocaleString("ru-RU")} ₽
            </p>
            {cryptoGroups.length > 0 && (
              <div className="mt-3 space-y-1">
                {cryptoGroups.map((group) => (
                  <div key={group.category} className="flex justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">{group.category}</span>
                    <span className="font-medium">
                      {group.amount.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Нет операций с инвестициями
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">История операций</h2>
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
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            tx.type === "investment"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-400"
                          }`}
                        >
                          {tx.type === "investment" ? "Инвестиция" : "Криптовалюта"}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-500">
                          {tx.category}
                        </span>
                      </div>
                      <p className="text-sm font-semibold mb-1">
                        {tx.amount.toLocaleString("ru-RU", {
                          style: "currency",
                          currency: "RUB",
                          minimumFractionDigits: 0,
                        })}
                      </p>
                      {tx.description && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">
                          {tx.description}
                        </p>
                      )}
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {format(txDate, "d MMM yyyy")}
                      </p>
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

