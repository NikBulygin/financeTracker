import { Transaction } from "./transactions";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  balance: number;
  cumulative: number;
}

export interface CategoryData {
  category: string;
  amount: number;
  type: string;
}

// Группировка транзакций по месяцам
export function groupByMonth(
  transactions: Transaction[],
  months: number = 12,
  includePlanned: boolean = false,
  forwardRange: boolean = false
): MonthlyData[] {
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

  const monthlyMap = new Map<string, { income: number; expense: number }>();

  transactions.forEach((tx) => {
    // Фильтруем планируемые операции
    if (!includePlanned && tx.is_planned) return;
    // Если включены планируемые, берем только pending
    if (includePlanned && tx.is_planned && tx.status !== "pending") return;
    
    const txDate = parseISO(tx.date);
    const monthKey = format(txDate, "yyyy-MM");
    
    // Проверяем, что транзакция попадает в диапазон
    if (txDate < startOfMonth(startDate) || txDate > endOfMonth(endDate)) {
      return;
    }
    
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { income: 0, expense: 0 });
    }
    
    const monthData = monthlyMap.get(monthKey)!;
    if (tx.type === "income") {
      monthData.income += tx.amount;
    } else if (tx.type === "expense") {
      monthData.expense += tx.amount;
    }
  });

  const result: MonthlyData[] = [];
  let cumulative = 0;

  monthsList.forEach((month) => {
    const monthKey = format(month, "yyyy-MM");
    const data = monthlyMap.get(monthKey) || { income: 0, expense: 0 };
    const balance = data.income - data.expense;
    cumulative += balance;

    result.push({
      month: format(month, "MMM yyyy"),
      income: data.income,
      expense: data.expense,
      balance,
      cumulative,
    });
  });

  return result;
}

// Группировка по категориям
export function groupByCategory(
  transactions: Transaction[],
  type?: "income" | "expense"
): CategoryData[] {
  const categoryMap = new Map<string, number>();

  transactions.forEach((tx) => {
    if (tx.is_planned) return;
    if (type && tx.type !== type) return;
    
    const key = `${tx.type}_${tx.category}`;
    const current = categoryMap.get(key) || 0;
    categoryMap.set(key, current + tx.amount);
  });

  return Array.from(categoryMap.entries())
    .map(([key, amount]) => {
      const [type, category] = key.split("_");
      return { category, amount, type };
    })
    .sort((a, b) => b.amount - a.amount);
}

// Расчет общих сумм
export function calculateTotals(
  transactions: Transaction[],
  includePlanned: boolean = false
): {
  totalIncome: number;
  totalExpense: number;
  balance: number;
} {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((tx) => {
    // Фильтруем планируемые операции
    if (!includePlanned && tx.is_planned) return;
    // Если включены планируемые, берем только pending
    if (includePlanned && tx.is_planned && tx.status !== "pending") return;
    
    if (tx.type === "income") {
      totalIncome += tx.amount;
    } else if (tx.type === "expense") {
      totalExpense += tx.amount;
    }
  });

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
export function calculateExpenseRatio(
  transactions: Transaction[],
  period?: { start: Date; end: Date }
): number {
  const filtered = period
    ? getPeriodData(transactions, period.start, period.end)
    : transactions;
  
  const totals = calculateTotals(filtered);
  if (totals.totalIncome === 0) return 0;
  return (totals.totalExpense / totals.totalIncome) * 100;
}

