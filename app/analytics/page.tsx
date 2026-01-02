"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import { getTransactions } from "@/lib/transactions";
import { groupByMonth, groupByCategory, calculateTotals, MonthlyData } from "@/lib/analytics";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { getDefaultCurrency, formatCurrency, getCurrencySymbol } from "@/lib/currency";

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}

const incomeExpenseConfig = {
  income: {
    label: "Доходы",
    color: "hsl(var(--chart-1))",
  },
  expense: {
    label: "Расходы",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const balanceConfig = {
  cumulative: {
    label: "Накопления",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

// Кастомный tooltip с разбивкой по валютам
function CurrencyTooltipContent({ active, payload, label, defaultCurrency }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0]?.payload as MonthlyData | undefined;
  
  return (
    <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {label && <div className="font-medium">{label}</div>}
      <div className="grid gap-1.5">
        {payload.map((item: any, index: number) => {
          const value = item.value || 0;
          const dataKey = item.dataKey;
          
          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-muted-foreground">{item.name || dataKey}:</span>
                  <span className="font-medium">{formatCurrency(value, defaultCurrency)}</span>
                </div>
                {/* Показываем разбивку по валютам */}
                {dataKey === "income" && data?.incomeBreakdown && data.incomeBreakdown.length > 0 && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {data.incomeBreakdown.map((bd, i) => (
                      <div key={i}>
                        +{formatCurrency(bd.amount, bd.currency)}
                      </div>
                    ))}
                  </div>
                )}
                {dataKey === "expense" && data?.expenseBreakdown && data.expenseBreakdown.length > 0 && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {data.expenseBreakdown.map((bd, i) => (
                      <div key={i}>
                        -{formatCurrency(bd.amount, bd.currency)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsContent() {
  const { session } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);
  const [includePlanned, setIncludePlanned] = useState(false);
  const [forwardRange, setForwardRange] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<string>("USD");
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totals, setTotals] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [calculating, setCalculating] = useState(false);

  const loadData = async () => {
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
    if (session?.user?.email) {
      const currency = getDefaultCurrency(session.user.email);
      setDefaultCurrency(currency);
    }
  }, [session]);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Пересчитываем аналитику при изменении параметров
  useEffect(() => {
    const calculateAnalytics = async () => {
      if (transactions.length === 0 || !defaultCurrency) return;
      
      setCalculating(true);
      try {
        const [monthly, totalsData, incomeCats, expenseCats] = await Promise.all([
          groupByMonth(transactions, months, includePlanned, forwardRange, defaultCurrency),
          calculateTotals(transactions, includePlanned, defaultCurrency),
          groupByCategory(transactions, "income", includePlanned, defaultCurrency),
          groupByCategory(transactions, "expense", includePlanned, defaultCurrency),
        ]);
        
        setMonthlyData(monthly);
        setTotals(totalsData);
        setIncomeCategories(incomeCats.slice(0, 5));
        setExpenseCategories(expenseCats.slice(0, 5));
      } catch (error) {
        console.error("Error calculating analytics:", error);
      } finally {
        setCalculating(false);
      }
    };
    
    calculateAnalytics();
  }, [transactions, months, includePlanned, forwardRange, defaultCurrency]);

  const COLORS = [
    "hsl(var(--chart-1))", // Зеленый
    "hsl(var(--chart-2))", // Красный
    "hsl(var(--chart-3))", // Синий
    "hsl(var(--chart-4))", // Оранжевый
    "hsl(var(--chart-5))", // Фиолетовый
    "hsl(var(--chart-6))", // Голубой
    "hsl(var(--chart-7))", // Розовый
    "hsl(var(--chart-8))", // Коралловый
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col pb-20">
        <main className="flex w-full flex-col gap-4 py-4 px-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка...</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <main className="flex w-full flex-col gap-6 py-4 px-4 sm:py-8 sm:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Аналитика</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includePlanned"
                checked={includePlanned}
                onChange={(e) => {
                  setIncludePlanned(e.target.checked);
                  if (e.target.checked) {
                    setForwardRange(true); // Автоматически включаем диапазон вперед
                  }
                }}
                className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="includePlanned" className="text-sm font-medium">
                Включить планируемые операции
              </label>
            </div>

            {includePlanned && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="forwardRange"
                  checked={forwardRange}
                  onChange={(e) => setForwardRange(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="forwardRange" className="text-sm font-medium">
                  Диапазон ±{months} месяцев
                </label>
              </div>
            )}

            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm"
            >
              <option value={3}>3 месяца</option>
              <option value={6}>6 месяцев</option>
              <option value={12}>12 месяцев</option>
            </select>
          </div>

          {includePlanned && forwardRange && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 p-3 text-sm text-blue-800 dark:text-blue-400">
              Показывается диапазон ±{months} месяцев от текущего месяца с учетом планируемых операций
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Доходы</p>
            <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
              {calculating ? "..." : formatCurrency(totals.totalIncome, defaultCurrency)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Расходы</p>
            <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {calculating ? "..." : formatCurrency(totals.totalExpense, defaultCurrency)}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Баланс</p>
            <p
              className={`text-2xl font-semibold ${
                totals.balance >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {calculating ? "..." : formatCurrency(totals.balance, defaultCurrency)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 overflow-hidden">
          <h2 className="mb-4 text-lg font-semibold">Доходы и расходы по месяцам</h2>
          <div className="w-full max-w-full overflow-x-auto" style={{ maxHeight: "calc(100vh - 300px)", minWidth: "350px", minHeight: "250px" }}>
            <ChartContainer config={incomeExpenseConfig} className="h-[250px] sm:h-[280px] w-full min-w-[350px] sm:min-w-[600px] max-w-full">
              <BarChart data={monthlyData} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  className="text-xs"
                  width={60}
                />
                <ChartTooltip content={<CurrencyTooltipContent defaultCurrency={defaultCurrency} />} />
                <ChartLegend />
                <Bar dataKey="income" fill="hsl(var(--chart-1))" radius={4} />
                <Bar dataKey="expense" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 overflow-hidden">
          <h2 className="mb-4 text-lg font-semibold">Накопления по месяцам</h2>
          <div className="w-full max-w-full overflow-x-auto" style={{ maxHeight: "calc(100vh - 300px)", minWidth: "350px", minHeight: "250px" }}>
            <ChartContainer config={balanceConfig} className="h-[250px] sm:h-[280px] w-full min-w-[350px] sm:min-w-[600px] max-w-full">
              <LineChart data={monthlyData} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false}
                  className="text-xs"
                  width={60}
                />
                <ChartTooltip content={<CurrencyTooltipContent defaultCurrency={defaultCurrency} />} />
                <ChartLegend />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-3))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 overflow-hidden">
            <h2 className="mb-4 text-lg font-semibold">Расходы по категориям</h2>
            {expenseCategories.length > 0 ? (
              <div className="w-full overflow-hidden" style={{ maxHeight: "calc(100vh - 300px)" }}>
                <ChartContainer
                  config={expenseCategories.reduce(
                    (acc, cat, i) => ({
                      ...acc,
                      [cat.category]: {
                        label: cat.category,
                        color: COLORS[(i + 1) % COLORS.length],
                      },
                    }),
                    {} as ChartConfig
                  )}
                  className="h-[220px] sm:h-[250px] w-full max-w-full"
                >
                  <PieChart>
                    <Pie
                      data={expenseCategories as any}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={({ category, percent }: any) => {
                        const label = `${category}: ${(percent * 100).toFixed(0)}%`;
                        return label.length > 20 ? `${category.substring(0, 15)}...: ${(percent * 100).toFixed(0)}%` : label;
                      }}
                      labelLine={false}
                      className="text-xs"
                    >
                      {expenseCategories.map((cat, index) => (
                        <Cell
                          key={`expense-${cat.category}-${index}`}
                          fill={COLORS[(index + 1) % COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<CurrencyTooltipContent defaultCurrency={defaultCurrency} />} />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Нет данных о расходах
              </p>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 overflow-hidden">
            <h2 className="mb-4 text-lg font-semibold">Доходы по категориям</h2>
            {incomeCategories.length > 0 ? (
              <div className="w-full overflow-hidden" style={{ maxHeight: "calc(100vh - 300px)" }}>
                <ChartContainer
                  config={incomeCategories.reduce(
                    (acc, cat, i) => ({
                      ...acc,
                      [cat.category]: {
                        label: cat.category,
                        color: COLORS[i % COLORS.length],
                      },
                    }),
                    {} as ChartConfig
                  )}
                  className="h-[220px] sm:h-[250px] w-full max-w-full"
                >
                  <PieChart>
                    <Pie
                      data={incomeCategories as any}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={({ category, percent }: any) => {
                        const label = `${category}: ${(percent * 100).toFixed(0)}%`;
                        return label.length > 20 ? `${category.substring(0, 15)}...: ${(percent * 100).toFixed(0)}%` : label;
                      }}
                      labelLine={false}
                      className="text-xs"
                    >
                      {incomeCategories.map((cat, index) => (
                        <Cell
                          key={`income-${cat.category}-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<CurrencyTooltipContent defaultCurrency={defaultCurrency} />} />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Нет данных о доходах
              </p>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

