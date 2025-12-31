import { getCSV, saveCSV, initCSV, type CSVRow, type CSVData } from "./csv";
import { format, parseISO, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";

export type TransactionType = "income" | "expense" | "investment" | "crypto";
export type TransactionStatus = "pending" | "completed" | "rejected";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO date string
  category: string;
  description: string;
  is_planned: boolean;
  status: TransactionStatus;
  // Для обменов
  from_asset?: string; // Что отдаю (например, "RUB", "USD", "BTC", "SBER")
  to_asset?: string; // Что получаю (например, "USD", "EUR", "ETH", "AAPL")
  exchange_rate?: number; // Курс обмена
  currency?: string; // Валюта суммы (RUB, USD, EUR и т.д.)
  amount_usd?: number; // Сумма в USD
  created_at: string;
}

const TRANSACTION_HEADERS = [
  "id",
  "type",
  "amount",
  "date",
  "category",
  "description",
  "is_planned",
  "status",
  "from_asset",
  "to_asset",
  "exchange_rate",
  "currency",
  "amount_usd",
  "created_at",
];

// Инициализация CSV для транзакций
export async function initTransactionsCSV(email: string): Promise<CSVData> {
  // getCSV автоматически проверит и добавит недостающие заголовки
  return getCSV(email, TRANSACTION_HEADERS);
}

// Получение всех транзакций
export async function getTransactions(email: string): Promise<Transaction[]> {
  const data = await getCSV(email, TRANSACTION_HEADERS);
  return data.rows
    .filter((row) => row.type !== "metadata")
    .map((row) => ({
      id: String(row.id || ""),
      type: (row.type as TransactionType) || "expense",
      amount: Number(row.amount) || 0,
      date: String(row.date || ""),
      category: String(row.category || ""),
      description: String(row.description || ""),
      is_planned: row.is_planned === true || row.is_planned === "true",
      status: (row.status as TransactionStatus) || (row.is_planned === true || row.is_planned === "true" ? "pending" : "completed"),
      from_asset: row.from_asset ? String(row.from_asset) : undefined,
      to_asset: row.to_asset ? String(row.to_asset) : undefined,
      exchange_rate: row.exchange_rate ? Number(row.exchange_rate) : undefined,
      currency: row.currency ? String(row.currency) : undefined,
      amount_usd: row.amount_usd ? Number(row.amount_usd) : undefined,
      created_at: String(row.created_at || ""),
    }))
    .filter((t) => t.id); // Фильтруем пустые записи
}

// Добавление транзакции
export async function addTransaction(
  email: string,
  transaction: Omit<Transaction, "id" | "created_at" | "status">
): Promise<Transaction> {
  const data = await getCSV(email, TRANSACTION_HEADERS);
  const id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newTransaction: Transaction = {
    ...transaction,
    id,
    status: transaction.is_planned ? "pending" : "completed",
    created_at: new Date().toISOString(),
  };

  const row: CSVRow = {
    id: newTransaction.id,
    type: newTransaction.type,
    amount: newTransaction.amount,
    date: newTransaction.date,
    category: newTransaction.category,
    description: newTransaction.description,
    is_planned: newTransaction.is_planned,
    status: newTransaction.status,
    from_asset: newTransaction.from_asset || null,
    to_asset: newTransaction.to_asset || null,
    exchange_rate: newTransaction.exchange_rate || null,
    currency: newTransaction.currency || null,
    amount_usd: newTransaction.amount_usd || null,
    created_at: newTransaction.created_at,
  };

  data.rows.push(row);
  await saveCSV(email, data);
  return newTransaction;
}

// Обновление транзакции
export async function updateTransaction(
  email: string,
  id: string,
  updates: Partial<Omit<Transaction, "id" | "created_at">>
): Promise<Transaction | null> {
  const data = await getCSV(email, TRANSACTION_HEADERS);
  const index = data.rows.findIndex((row) => row.id === id);
  if (index === -1) return null;

  const existing = data.rows[index];
  const updated: CSVRow = {
    ...existing,
    ...updates,
    id: existing.id as string,
  };

  data.rows[index] = updated;
  await saveCSV(email, data);

  return {
    id: String(updated.id),
    type: (updated.type as TransactionType) || "expense",
    amount: Number(updated.amount) || 0,
    date: String(updated.date || ""),
    category: String(updated.category || ""),
    description: String(updated.description || ""),
    is_planned: updated.is_planned === true || updated.is_planned === "true",
    status: (updated.status as TransactionStatus) || (updated.is_planned === true || updated.is_planned === "true" ? "pending" : "completed"),
    from_asset: updated.from_asset ? String(updated.from_asset) : undefined,
    to_asset: updated.to_asset ? String(updated.to_asset) : undefined,
    exchange_rate: updated.exchange_rate ? Number(updated.exchange_rate) : undefined,
    currency: updated.currency ? String(updated.currency) : undefined,
    amount_usd: updated.amount_usd ? Number(updated.amount_usd) : undefined,
    created_at: String(updated.created_at || ""),
  };
}

// Удаление транзакции
export async function deleteTransaction(
  email: string,
  id: string
): Promise<boolean> {
  const data = await getCSV(email, TRANSACTION_HEADERS);
  const index = data.rows.findIndex((row) => row.id === id);
  if (index === -1) return false;

  data.rows.splice(index, 1);
  await saveCSV(email, data);
  return true;
}

// Получение запланированных транзакций
export async function getPlannedTransactions(
  email: string,
  days: number = 30
): Promise<Transaction[]> {
  const transactions = await getTransactions(email);
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return transactions
    .filter((t) => {
      // Показываем только pending транзакции (не выполненные и не отклоненные)
      if (t.status !== "pending") return false;
      const txDate = parseISO(t.date);
      return isAfter(txDate, now) && isBefore(txDate, futureDate);
    })
    .sort((a, b) => {
      const dateA = parseISO(a.date);
      const dateB = parseISO(b.date);
      return dateA.getTime() - dateB.getTime();
    });
}

// Фильтрация транзакций
export function filterTransactions(
  transactions: Transaction[],
  filters: {
    type?: TransactionType;
    category?: string;
    startDate?: Date;
    endDate?: Date;
    isPlanned?: boolean;
    search?: string;
  }
): Transaction[] {
  return transactions.filter((t) => {
    if (filters.type && t.type !== filters.type) return false;
    if (filters.category && t.category !== filters.category) return false;
    if (filters.isPlanned !== undefined && t.is_planned !== filters.isPlanned)
      return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !t.description.toLowerCase().includes(searchLower) &&
        !t.category.toLowerCase().includes(searchLower)
      )
        return false;
    }
    if (filters.startDate || filters.endDate) {
      const txDate = parseISO(t.date);
      if (filters.startDate && isBefore(txDate, filters.startDate))
        return false;
      if (filters.endDate && isAfter(txDate, filters.endDate)) return false;
    }
    return true;
  });
}

// Получение категорий
export async function getCategories(
  email: string,
  type?: TransactionType
): Promise<string[]> {
  const transactions = await getTransactions(email);
  const filtered = type
    ? transactions.filter((t) => t.type === type)
    : transactions;
  const categories = new Set(filtered.map((t) => t.category).filter(Boolean));
  return Array.from(categories).sort();
}

