import { Transaction } from "./transactions";
import { calculateTotals, calculateExpenseRatio } from "./analytics";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface Alert {
  type: "warning" | "danger";
  message: string;
}

export function getAlerts(transactions: Transaction[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Текущий месяц
  const currentMonthTx = transactions.filter((tx) => {
    if (tx.is_planned) return false;
    const txDate = new Date(tx.date);
    return txDate >= currentMonthStart && txDate <= currentMonthEnd;
  });

  const currentTotals = calculateTotals(currentMonthTx);
  const currentRatio = calculateExpenseRatio(currentMonthTx);

  // Предупреждение если расходы >= доходам
  if (currentTotals.totalExpense >= currentTotals.totalIncome && currentTotals.totalIncome > 0) {
    alerts.push({
      type: "danger",
      message: `Внимание! Расходы (${currentTotals.totalExpense.toLocaleString("ru-RU")} ₽) превышают или равны доходам (${currentTotals.totalIncome.toLocaleString("ru-RU")} ₽) в текущем месяце.`,
    });
  }
  // Предупреждение если расходы > 80% от доходов
  else if (currentRatio > 80 && currentTotals.totalIncome > 0) {
    alerts.push({
      type: "warning",
      message: `Предупреждение! Расходы составляют ${currentRatio.toFixed(0)}% от доходов в текущем месяце.`,
    });
  }

  // Предыдущий месяц для сравнения
  const lastMonthTx = transactions.filter((tx) => {
    if (tx.is_planned) return false;
    const txDate = new Date(tx.date);
    return txDate >= lastMonthStart && txDate <= lastMonthEnd;
  });

  const lastMonthTotals = calculateTotals(lastMonthTx);
  const lastMonthRatio = calculateExpenseRatio(lastMonthTx);

  // Сравнение с предыдущим месяцем
  if (lastMonthTotals.totalIncome > 0 && currentTotals.totalIncome > 0) {
    const ratioDiff = currentRatio - lastMonthRatio;
    if (ratioDiff > 10) {
      alerts.push({
        type: "warning",
        message: `Расходы выросли на ${ratioDiff.toFixed(0)}% по сравнению с предыдущим месяцем.`,
      });
    }
  }

  return alerts;
}

