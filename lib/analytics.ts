import { Transaction } from "./transactions";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { convertCurrency } from "./exchange";

export interface CurrencyBreakdown {
  currency: string;
  amount: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
  cumulative: number;
  incomeBreakdown?: CurrencyBreakdown[];
  expenseBreakdown?: CurrencyBreakdown[];
}

export interface CategoryData {
  category: string;
  amount: number;
  type: string;
}

// Группировка транзакций по месяцам
export async function groupByMonth(
  transactions: Transaction[],
  months: number = 12,
  includePlanned: boolean = false,
  forwardRange: boolean = false,
  defaultCurrency?: string
): Promise<MonthlyData[]> {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (forwardRange) {
    // Диапазон ±N месяцев от текущего месяца
    startDate = subMonths(now, months);
    endDate = subMonths(now, -months); // +N месяцев вперед
  } else {
    // Обычный диапазон: последние N месяцев
    startDate = subMonths(now, months - 1);
    endDate = now;
  }

  const monthsList = eachMonthOfInterval({
    start: startOfMonth(startDate),
    end: endOfMonth(endDate),
  });

  const monthlyMap = new Map<string, { 
    income: number; 
    expense: number;
    incomeBreakdown: Map<string, number>;
    expenseBreakdown: Map<string, number>;
  }>();

  // Обрабатываем транзакции и собираем информацию о валютах
  for (const tx of transactions) {
    // Фильтруем планируемые операции
    if (!includePlanned && tx.is_planned) continue;
    // Если включены планируемые, берем только pending
    if (includePlanned && tx.is_planned && tx.status !== "pending") continue;
    
    const txDate = parseISO(tx.date);
    const monthKey = format(txDate, "yyyy-MM");
    
    // Проверяем, что транзакция попадает в диапазон
    if (txDate < startOfMonth(startDate) || txDate > endOfMonth(endDate)) {
      continue;
    }
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { 
        income: 0, 
        expense: 0,
        incomeBreakdown: new Map(),
        expenseBreakdown: new Map(),
      });
    }
    
    const monthData = monthlyMap.get(monthKey)!;
    const txCurrency = tx.currency || defaultCurrency || "USD";
    let amount = tx.amount;
    
    // Конвертируем в стандартную валюту, если нужно
    if (defaultCurrency && txCurrency !== defaultCurrency) {
      try {
        amount = await convertCurrency(tx.amount, txCurrency, defaultCurrency);
      } catch (error) {
        console.error(`Error converting currency for transaction ${tx.id}:`, error);
        // Используем исходную сумму при ошибке конвертации
      }
    }
    
    if (tx.type === "income") {
      monthData.income += amount;
      const current = monthData.incomeBreakdown.get(txCurrency) || 0;
      monthData.incomeBreakdown.set(txCurrency, current + tx.amount);
    } else if (tx.type === "expense") {
      monthData.expense += amount;
      const current = monthData.expenseBreakdown.get(txCurrency) || 0;
      monthData.expenseBreakdown.set(txCurrency, current + tx.amount);
    }
  }

  const result: MonthlyData[] = [];
  let cumulative = 0;

  monthsList.forEach((month) => {
    const monthKey = format(month, "yyyy-MM");
    const data = monthlyMap.get(monthKey) || { 
      income: 0, 
      expense: 0,
      incomeBreakdown: new Map(),
      expenseBreakdown: new Map(),
    };
    const balance = data.income - data.expense;
    cumulative += balance;

    // Преобразуем Map в массив для разбивки по валютам
    const incomeBreakdown: CurrencyBreakdown[] = Array.from(data.incomeBreakdown.entries())
      .map(([currency, amount]) => ({ currency, amount }));
    const expenseBreakdown: CurrencyBreakdown[] = Array.from(data.expenseBreakdown.entries())
      .map(([currency, amount]) => ({ currency, amount }));

    result.push({
      month: format(month, "MMM yyyy"),
      income: data.income,
      expense: data.expense,
      balance,
      cumulative,
      incomeBreakdown: incomeBreakdown.length > 0 ? incomeBreakdown : undefined,
      expenseBreakdown: expenseBreakdown.length > 0 ? expenseBreakdown : undefined,
    });
  });

  return result;
}

// Группировка по категориям
export async function groupByCategory(
  transactions: Transaction[],
  type?: "income" | "expense",
  includePlanned: boolean = false,
  defaultCurrency?: string
): Promise<CategoryData[]> {
  const categoryMap = new Map<string, number>();

  for (const tx of transactions) {
    // Фильтруем планируемые операции
    if (!includePlanned && tx.is_planned) continue;
    // Если включены планируемые, берем только pending
    if (includePlanned && tx.is_planned && tx.status !== "pending") continue;
    // Исключаем отклоненные транзакции
    if (tx.status === "rejected") continue;
    
    if (type && tx.type !== type) continue;
    
    const txCurrency = tx.currency || defaultCurrency || "USD";
    let amount = tx.amount;
    
    // Конвертируем в стандартную валюту, если нужно
    if (defaultCurrency && txCurrency !== defaultCurrency) {
      try {
        amount = await convertCurrency(tx.amount, txCurrency, defaultCurrency);
      } catch (error) {
        console.error(`Error converting currency for transaction ${tx.id}:`, error);
        // Используем исходную сумму при ошибке конвертации
      }
    }
    
    const key = `${tx.type}_${tx.category}`;
    const current = categoryMap.get(key) || 0;
    categoryMap.set(key, current + amount);
  }

  return Array.from(categoryMap.entries())
    .map(([key, amount]) => {
      const [type, category] = key.split("_");
      return { category, amount, type };
    })
    .sort((a, b) => b.amount - a.amount);
}

// Расчет общих сумм
export async function calculateTotals(
  transactions: Transaction[],
  includePlanned: boolean = false,
  defaultCurrency?: string
): Promise<{
  totalIncome: number;
  totalExpense: number;
  balance: number;
}> {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    // Фильтруем планируемые операции
    if (!includePlanned && tx.is_planned) continue;
    // Если включены планируемые, берем только pending
    if (includePlanned && tx.is_planned && tx.status !== "pending") continue;
    
    const txCurrency = tx.currency || defaultCurrency || "USD";
    let amount = tx.amount;
    
    // Конвертируем в стандартную валюту, если нужно
    if (defaultCurrency && txCurrency !== defaultCurrency) {
      try {
        amount = await convertCurrency(tx.amount, txCurrency, defaultCurrency);
      } catch (error) {
        console.error(`Error converting currency for transaction ${tx.id}:`, error);
        // Используем исходную сумму при ошибке конвертации
      }
    }
    
    if (tx.type === "income") {
      totalIncome += amount;
    } else if (tx.type === "expense") {
      totalExpense += amount;
    }
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

// Получение данных за период
export function getPeriodData(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): Transaction[] {
  return transactions.filter((tx) => {
    if (tx.is_planned) return false;
    const txDate = parseISO(tx.date);
    return txDate >= startDate && txDate <= endDate;
  });
}

// Расчет процента расходов от доходов
export async function calculateExpenseRatio(
  transactions: Transaction[],
  period?: { start: Date; end: Date },
  defaultCurrency?: string
): Promise<number> {
  const filtered = period
    ? getPeriodData(transactions, period.start, period.end)
    : transactions;
  
  const totals = await calculateTotals(filtered, false, defaultCurrency);
  if (totals.totalIncome === 0) return 0;
  return (totals.totalExpense / totals.totalIncome) * 100;
}

