// API для получения курсов валют и конвертации

const EXCHANGE_API_URL = "https://api.exchangerate-api.com/v4/latest";

export interface ExchangeRates {
  [currency: string]: number;
}

// Кэш для курсов валют (обновляется раз в час)
let ratesCache: { rates: ExchangeRates; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 час

export async function getExchangeRates(baseCurrency: string = "USD"): Promise<ExchangeRates> {
  // Проверяем кэш
  if (ratesCache && Date.now() - ratesCache.timestamp < CACHE_DURATION) {
    return ratesCache.rates;
  }

  try {
    const response = await fetch(`${EXCHANGE_API_URL}/${baseCurrency}`);
    if (!response.ok) {
      throw new Error("Failed to fetch exchange rates");
    }
    const data = await response.json();
    const rates: ExchangeRates = data.rates || {};
    
    // Сохраняем в кэш
    ratesCache = {
      rates,
      timestamp: Date.now(),
    };
    
    return rates;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    // Возвращаем кэшированные данные или дефолтные значения
    if (ratesCache) {
      return ratesCache.rates;
    }
    // Дефолтные курсы (примерные)
    return {
      USD: 1,
      EUR: 0.92,
      RUB: 92,
      GBP: 0.79,
      JPY: 150,
      CNY: 7.2,
      KZT: 450,
    };
  }
}

export async function convertToUSD(
  amount: number,
  fromCurrency: string
): Promise<number> {
  if (fromCurrency === "USD") {
    return amount;
  }

  const rates = await getExchangeRates("USD");
  const rate = rates[fromCurrency.toUpperCase()];
  
  if (!rate) {
    console.warn(`Exchange rate not found for ${fromCurrency}, using 1:1`);
    return amount;
  }

  // Если курс относительно USD, то делим
  // Например, если RUB = 92, то 100 RUB = 100 / 92 = 1.09 USD
  return amount / rate;
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getExchangeRates("USD");
  const fromRate = rates[fromCurrency.toUpperCase()];
  const toRate = rates[toCurrency.toUpperCase()];

  if (!fromRate || !toRate) {
    console.warn(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
    return amount;
  }

  // Конвертируем через USD
  const amountInUSD = amount / fromRate;
  return amountInUSD * toRate;
}

// Получение курса для криптовалют (используем CoinGecko API)
export async function getCryptoRate(crypto: string, toCurrency: string = "USD"): Promise<number> {
  const cryptoUpper = crypto.toUpperCase();
  
  // Маппинг криптовалют
  const cryptoMap: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    USDT: "tether",
    BNB: "binancecoin",
    SOL: "solana",
    XRP: "ripple",
    ADA: "cardano",
    DOGE: "dogecoin",
  };

  const cryptoId = cryptoMap[cryptoUpper] || crypto.toLowerCase();

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${toCurrency.toLowerCase()}`
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch crypto rate");
    }
    
    const data = await response.json();
    return data[cryptoId]?.[toCurrency.toLowerCase()] || 0;
  } catch (error) {
    console.error(`Error fetching crypto rate for ${crypto}:`, error);
    // Дефолтные значения для популярных криптовалют
    const defaultRates: Record<string, number> = {
      BTC: 45000,
      ETH: 2500,
      USDT: 1,
    };
    return defaultRates[cryptoUpper] || 0;
  }
}

// Получение курса для акций (используем Alpha Vantage или Yahoo Finance API)
// Для простоты используем фиктивные данные или можно интегрировать реальный API
export async function getStockRate(symbol: string): Promise<number> {
  // В реальном приложении здесь был бы вызов API для получения курса акций
  // Например, Alpha Vantage API или Yahoo Finance API
  // Для демо возвращаем 0, пользователь может ввести курс вручную
  console.warn(`Stock rate API not implemented for ${symbol}`);
  return 0;
}

