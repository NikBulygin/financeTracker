// Утилиты для работы со стандартной валютой и форматированием

import { CURRENCY_CODES } from "./constants";

// Получение стандартной валюты пользователя из localStorage
export function getDefaultCurrency(email: string): string {
  if (typeof window === "undefined" || !email) {
    return "USD"; // Значение по умолчанию
  }
  const stored = localStorage.getItem(`default_currency_${email}`);
  return stored && CURRENCY_CODES.includes(stored as any) ? stored : "USD";
}

// Сохранение стандартной валюты пользователя в localStorage
export function setDefaultCurrency(email: string, currency: string): void {
  if (typeof window === "undefined" || !email) {
    return;
  }
  if (CURRENCY_CODES.includes(currency as any)) {
    localStorage.setItem(`default_currency_${email}`, currency);
  }
}

// Получение символа валюты
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    RUB: "₽",
    USD: "$",
    EUR: "€",
    KZT: "₸",
    CNY: "¥",
    GBP: "£",
    JPY: "¥",
  };
  return symbols[currency.toUpperCase()] || currency;
}

// Форматирование суммы с символом валюты
export function formatCurrency(
  amount: number,
  currency: string,
  showSymbol: boolean = true
): string {
  const symbol = showSymbol ? getCurrencySymbol(currency) : "";
  const formatted = amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${formatted} ${symbol}` : formatted;
}

// Форматирование суммы с символом валюты (короткий вариант без десятичных)
export function formatCurrencyShort(
  amount: number,
  currency: string,
  showSymbol: boolean = true
): string {
  const symbol = showSymbol ? getCurrencySymbol(currency) : "";
  const formatted = amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return symbol ? `${formatted} ${symbol}` : formatted;
}

