"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import { getTransactions } from "@/lib/transactions";
import { groupByMonth, groupByCategory, calculateTotals } from "@/lib/analytics";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";

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

function AnalyticsContent() {
  const { session } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);
  const [includePlanned, setIncludePlanned] = useState(false);
  const [forwardRange, setForwardRange] = useState(false);

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
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const monthlyData = groupByMonth(transactions, months, includePlanned, forwardRange);
  const categoryData = groupByCategory(transactions);
  const totals = calculateTotals(transactions, includePlanned);

  const incomeCategories = groupByCategory(transactions, "income").slice(0, 5);
  const expenseCategories = groupByCategory(transactions, "expense").slice(0, 5);

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
              {totals.totalIncome.toLocaleString("ru-RU")} ₽
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Расходы</p>
            <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
              {totals.totalExpense.toLocaleString("ru-RU")} ₽
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
              {totals.balance.toLocaleString("ru-RU")} ₽
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 overflow-hidden">
          <h2 className="mb-4 text-lg font-semibold">Доходы и расходы по месяцам</h2>
          <div className="w-full max-w-full overflow-x-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
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
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="income" fill="hsl(var(--chart-1))" radius={4} />
                <Bar dataKey="expense" fill="hsl(var(--chart-2))" radius={4} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 overflow-hidden">
          <h2 className="mb-4 text-lg font-semibold">Накопления по месяцам</h2>
          <div className="w-full max-w-full overflow-x-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
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
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
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
                      data={expenseCategories}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={({ category, percent }) => {
                        const label = `${category}: ${(percent * 100).toFixed(0)}%`;
                        return label.length > 20 ? `${category.substring(0, 15)}...: ${(percent * 100).toFixed(0)}%` : label;
                      }}
                      labelLine={false}
                      className="text-xs"
                    >
                      {expenseCategories.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[(index + 1) % COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
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
                      data={incomeCategories}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      label={({ category, percent }) => {
                        const label = `${category}: ${(percent * 100).toFixed(0)}%`;
                        return label.length > 20 ? `${category.substring(0, 15)}...: ${(percent * 100).toFixed(0)}%` : label;
                      }}
                      labelLine={false}
                      className="text-xs"
                    >
                      {incomeCategories.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
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

