"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNav from "@/components/BottomNav";
import { getExchangeRates, getCryptoRate } from "@/lib/exchange";
import { useToastStore } from "@/store/toastStore";

interface CurrencyRate {
  code: string;
  name: string;
  rate: number;
  change24h?: number;
}

interface CryptoRate {
  code: string;
  name: string;
  rate: number;
  change24h?: number;
}

export default function RatesPage() {
  return (
    <ProtectedRoute>
      <RatesContent />
    </ProtectedRoute>
  );
}

function RatesContent() {
  const { session } = useAuthStore();
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
  const [cryptos, setCryptos] = useState<CryptoRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const { addToast } = useToastStore();

  const currencyList = [
    { code: "KZT", name: "Казахстанский тенге" },
    { code: "RUB", name: "Российский рубль" },
    { code: "USD", name: "Американский доллар" },
    { code: "CNY", name: "Китайский юань" },
  ];

  const cryptoList = [
    { code: "USDT", name: "Tether" },
    { code: "ETH", name: "Ethereum" },
    { code: "BTC", name: "Bitcoin" },
  ];

  const loadRates = async () => {
    setLoading(true);
    try {
      // Загружаем курсы валют
      const rates = await getExchangeRates(baseCurrency);
      const currencyRates: CurrencyRate[] = currencyList.map((curr) => ({
        code: curr.code,
        name: curr.name,
        rate: rates[curr.code] || 0,
      }));
      setCurrencies(currencyRates);

      // Загружаем курсы криптовалют
      const cryptoRates: CryptoRate[] = await Promise.all(
        cryptoList.map(async (crypto) => {
          const rate = await getCryptoRate(crypto.code, baseCurrency);
          return {
            code: crypto.code,
            name: crypto.name,
            rate: rate || 0,
          };
        })
      );
      setCryptos(cryptoRates);

      addToast("Курсы обновлены", "success");
    } catch (error) {
      console.error("Error loading rates:", error);
      addToast("Ошибка загрузки курсов", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCurrency]);

  const formatRate = (rate: number) => {
    if (rate === 0) return "N/A";
    if (rate >= 1) {
      return rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return rate.toFixed(6);
  };

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <main className="flex w-full flex-col gap-6 py-4 px-4 sm:py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Курсы валют и криптовалют</h1>
          <button
            onClick={loadRates}
            disabled={loading}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Обновление..." : "Обновить"}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Базовая валюта</label>
          <select
            value={baseCurrency}
            onChange={(e) => setBaseCurrency(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          >
            {currencyList.map((curr) => (
              <option key={curr.code} value={curr.code}>
                {curr.name} ({curr.code})
              </option>
            ))}
          </select>
        </div>

        {/* Валюты */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="mb-4 text-lg font-semibold">Валюты</h2>
          {loading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка курсов...</p>
          ) : (
            <div className="space-y-3">
              {currencies.map((currency) => (
                <div
                  key={currency.code}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
                >
                  <div>
                    <p className="font-medium">{currency.name}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{currency.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {formatRate(currency.rate)} {baseCurrency}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      1 {currency.code} = {currency.rate > 0 ? formatRate(1 / currency.rate) : "N/A"} {baseCurrency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Криптовалюты */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="mb-4 text-lg font-semibold">Криптовалюты</h2>
          {loading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка курсов...</p>
          ) : (
            <div className="space-y-3">
              {cryptos.map((crypto) => (
                <div
                  key={crypto.code}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
                >
                  <div>
                    <p className="font-medium">{crypto.name}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{crypto.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {formatRate(crypto.rate)} {baseCurrency}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      1 {crypto.code} = {crypto.rate > 0 ? formatRate(1 / crypto.rate) : "N/A"} {baseCurrency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Таблица конвертации */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="mb-4 text-lg font-semibold">Таблица конвертации</h2>
          {loading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Загрузка...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="p-2 text-left">Валюта</th>
                    {currencyList.map((curr) => (
                      <th key={curr.code} className="p-2 text-right">
                        {curr.code}
                      </th>
                    ))}
                    {cryptoList.map((crypto) => (
                      <th key={crypto.code} className="p-2 text-right">
                        {crypto.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...currencyList, ...cryptoList].map((asset) => {
                    const assetRate = asset.code.startsWith("BTC") || asset.code.startsWith("ETH") || asset.code.startsWith("USDT")
                      ? cryptos.find((c) => c.code === asset.code)?.rate || 0
                      : currencies.find((c) => c.code === asset.code)?.rate || 0;
                    
                    return (
                      <tr key={asset.code} className="border-b border-zinc-200 dark:border-zinc-800">
                        <td className="p-2 font-medium">{asset.code}</td>
                        {currencyList.map((curr) => {
                          const currRate = currencies.find((c) => c.code === curr.code)?.rate || 0;
                          const conversion = assetRate > 0 && currRate > 0 
                            ? (assetRate / currRate).toFixed(4)
                            : "N/A";
                          return (
                            <td key={curr.code} className="p-2 text-right">
                              {conversion}
                            </td>
                          );
                        })}
                        {cryptoList.map((crypto) => {
                          const cryptoRate = cryptos.find((c) => c.code === crypto.code)?.rate || 0;
                          const conversion = assetRate > 0 && cryptoRate > 0
                            ? (assetRate / cryptoRate).toFixed(6)
                            : "N/A";
                          return (
                            <td key={crypto.code} className="p-2 text-right">
                              {conversion}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

