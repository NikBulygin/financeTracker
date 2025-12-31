"use client";

import { useState, useEffect } from "react";
import { Transaction, TransactionType, addTransaction, updateTransaction } from "@/lib/transactions";
import { format } from "date-fns";
import { useToastStore } from "@/store/toastStore";
import { convertToUSD, getCryptoRate, getExchangeRates } from "@/lib/exchange";

interface TransactionFormProps {
  email: string;
  transaction?: Transaction | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const transactionTypes: { value: TransactionType; label: string }[] = [
  { value: "income", label: "Доход" },
  { value: "expense", label: "Расход" },
  { value: "investment", label: "Инвестиция" },
  { value: "crypto", label: "Криптовалюта" },
];

const commonCategories = {
  income: ["Зарплата", "Фриланс", "Дивиденды", "Прочее"],
  expense: ["Еда", "Транспорт", "Жилье", "Развлечения", "Здоровье", "Прочее"],
  investment: ["Акции", "Облигации", "Недвижимость", "Прочее"],
  crypto: ["BTC", "ETH", "Другое"],
};

export default function TransactionForm({
  email,
  transaction,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(transaction?.type || "expense");
  const [amount, setAmount] = useState<string>(transaction?.amount.toString() || "");
  const [date, setDate] = useState<string>(
    transaction?.date ? format(new Date(transaction.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );
  const [category, setCategory] = useState<string>(transaction?.category || "");
  const [description, setDescription] = useState<string>(transaction?.description || "");
  const [isPlanned, setIsPlanned] = useState<boolean>(
    transaction?.is_planned || false
  );
  const [isExchange, setIsExchange] = useState<boolean>(
    !!(transaction?.from_asset || transaction?.to_asset)
  );
  const [fromAsset, setFromAsset] = useState<string>(transaction?.from_asset || "");
  const [toAsset, setToAsset] = useState<string>(transaction?.to_asset || "");
  const [exchangeRate, setExchangeRate] = useState<string>(transaction?.exchange_rate?.toString() || "");
  const [currency, setCurrency] = useState<string>(transaction?.currency || "RUB");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [loadingRate, setLoadingRate] = useState(false);
  const { addToast } = useToastStore();

  const categories = commonCategories[type] || [];

  // Инициализация полей при редактировании
  useEffect(() => {
    if (transaction) {
      setIsExchange(!!(transaction.from_asset || transaction.to_asset));
      setFromAsset(transaction.from_asset || "");
      setToAsset(transaction.to_asset || "");
      setExchangeRate(transaction.exchange_rate?.toString() || "");
      setCurrency(transaction.currency || "RUB");
    }
  }, [transaction]);

  // Правило: инвестиции не могут быть отложенными
  useEffect(() => {
    if (type === "investment" && isPlanned) {
      setIsPlanned(false);
    }
  }, [type, isPlanned]);

  // Правило: обмен доступен только для инвестиций
  useEffect(() => {
    if (type !== "investment" && isExchange) {
      setIsExchange(false);
      setFromAsset("");
      setToAsset("");
      setExchangeRate("");
    }
  }, [type, isExchange]);

  // Популярные валюты и активы
  const currencies = ["RUB", "USD", "EUR", "GBP", "JPY", "CNY"];
  const cryptoAssets = ["BTC", "ETH", "USDT", "BNB", "SOL", "XRP", "ADA", "DOGE"];
  const stockAssets = ["SBER", "GAZP", "YNDX", "AAPL", "GOOGL", "MSFT", "TSLA", "NVDA"];

  const fetchExchangeRate = async () => {
    if (!fromAsset || !toAsset || !amount) return;
    
    setLoadingRate(true);
    try {
      let rate = 0;
      
      // Определяем тип актива
      const isFromCrypto = cryptoAssets.includes(fromAsset.toUpperCase());
      const isToCrypto = cryptoAssets.includes(toAsset.toUpperCase());
      const isFromStock = stockAssets.includes(fromAsset.toUpperCase());
      const isToStock = stockAssets.includes(toAsset.toUpperCase());
      
      if (isFromCrypto || isToCrypto) {
        // Для криптовалют
        if (isFromCrypto && toAsset.toUpperCase() === "USD") {
          rate = await getCryptoRate(fromAsset.toUpperCase());
        } else if (isToCrypto && fromAsset.toUpperCase() === "USD") {
          const cryptoRate = await getCryptoRate(toAsset.toUpperCase());
          rate = 1 / cryptoRate;
        } else {
          // Конвертация между криптовалютами через USD
          const fromRate = isFromCrypto ? await getCryptoRate(fromAsset.toUpperCase()) : 1;
          const toRate = isToCrypto ? await getCryptoRate(toAsset.toUpperCase()) : 1;
          rate = fromRate / toRate;
        }
      } else if (currencies.includes(fromAsset.toUpperCase()) && currencies.includes(toAsset.toUpperCase())) {
        // Для валют
        const rates = await getExchangeRates("USD");
        const fromRate = rates[fromAsset.toUpperCase()] || 1;
        const toRate = rates[toAsset.toUpperCase()] || 1;
        rate = fromRate / toRate;
      } else {
        addToast("Автоматическое получение курса для этого типа актива не поддерживается. Введите курс вручную.", "info");
        setLoadingRate(false);
        return;
      }
      
      if (rate > 0) {
        setExchangeRate(rate.toFixed(6));
        addToast(`Курс обновлен: 1 ${fromAsset} = ${rate.toFixed(6)} ${toAsset}`, "success");
      }
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      addToast("Не удалось получить курс. Введите его вручную.", "error");
    } finally {
      setLoadingRate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setError("Сумма должна быть положительным числом");
        setLoading(false);
        return;
      }

      if (!category.trim()) {
        setError("Укажите категорию");
        setLoading(false);
        return;
      }

      // Конвертируем в USD если указана валюта
      let amountUSD: number | undefined = undefined;
      if (currency && currency !== "USD") {
        try {
          amountUSD = await convertToUSD(amountNum, currency);
        } catch (error) {
          console.error("Error converting to USD:", error);
        }
      } else if (currency === "USD") {
        amountUSD = amountNum;
      }

      const transactionData: any = {
        type,
        amount: amountNum,
        date: new Date(date).toISOString(),
        category: category.trim(),
        description: description.trim(),
        is_planned: type === "investment" ? false : isPlanned, // Инвестиции не могут быть отложенными
        currency: currency || undefined,
        amount_usd: amountUSD,
      };

      // Если это обмен, добавляем поля обмена
      if (isExchange && fromAsset && toAsset) {
        transactionData.from_asset = fromAsset.toUpperCase();
        transactionData.to_asset = toAsset.toUpperCase();
        if (exchangeRate) {
          transactionData.exchange_rate = parseFloat(exchangeRate);
        }
      }

      if (transaction?.id) {
        await updateTransaction(email, transaction.id, transactionData);
        addToast("Транзакция обновлена успешно", "success");
      } else {
        await addTransaction(email, transactionData);
        addToast("Транзакция добавлена успешно", "success");
      }

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ошибка при сохранении";
      setError(errorMessage);
      addToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Тип операции</label>
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as TransactionType);
            setCategory("");
          }}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        >
          {transactionTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Сумма</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          placeholder="0.00"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Дата</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Категория</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        >
          <option value="">Выберите категорию</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Описание</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          placeholder="Описание операции"
        />
      </div>

      {type !== "investment" && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPlanned"
            checked={isPlanned}
            onChange={(e) => setIsPlanned(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <label htmlFor="isPlanned" className="text-sm">
            Запланированная операция
          </label>
        </div>
      )}

      {type === "investment" && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 p-3 text-sm text-blue-800 dark:text-blue-400">
          Инвестиции не могут быть отложенными
        </div>
      )}

      {type === "investment" && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isExchange"
            checked={isExchange}
            onChange={(e) => {
              setIsExchange(e.target.checked);
              if (!e.target.checked) {
                setFromAsset("");
                setToAsset("");
                setExchangeRate("");
              }
            }}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <label htmlFor="isExchange" className="text-sm">
            Это обмен (валюта-валюта, валюта-актив и т.п.)
          </label>
        </div>
      )}

      {isExchange && (
        <div className="flex flex-col gap-3 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Отдаю (валюта/актив)</label>
            <input
              type="text"
              value={fromAsset}
              onChange={(e) => setFromAsset(e.target.value)}
              placeholder="RUB, USD, BTC, SBER и т.д."
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              list="assets-list"
            />
            <datalist id="assets-list">
              {currencies.map((c) => (
                <option key={c} value={c} />
              ))}
              {cryptoAssets.map((c) => (
                <option key={c} value={c} />
              ))}
              {stockAssets.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Получаю (валюта/актив)</label>
            <input
              type="text"
              value={toAsset}
              onChange={(e) => setToAsset(e.target.value)}
              placeholder="USD, EUR, ETH, AAPL и т.д."
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              list="assets-list"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium flex-1">Курс обмена</label>
              <button
                type="button"
                onClick={fetchExchangeRate}
                disabled={loadingRate || !fromAsset || !toAsset}
                className="px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingRate ? "Загрузка..." : "Получить курс"}
              </button>
            </div>
            <input
              type="number"
              step="0.000001"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="1.0 (1 единица from_asset = X единиц to_asset)"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
            />
            {exchangeRate && fromAsset && toAsset && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                1 {fromAsset.toUpperCase()} = {parseFloat(exchangeRate).toFixed(6)} {toAsset.toUpperCase()}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Валюта суммы</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Валюта, в которой указана сумма. Автоматически конвертируется в USD.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors active:bg-[#383838] hover:bg-[#383838] dark:active:bg-[#ccc] dark:hover:bg-[#ccc] touch-manipulation disabled:opacity-50"
        >
          {loading ? "Сохранение..." : transaction ? "Обновить" : "Добавить"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-sm font-medium transition-colors active:bg-zinc-100 dark:active:bg-zinc-900 touch-manipulation"
          >
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}

