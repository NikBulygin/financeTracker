// Единый список поддерживаемых валют
export const SUPPORTED_CURRENCIES = [
  { code: "KZT", name: "Казахстанский тенге" },
  { code: "RUB", name: "Российский рубль" },
  { code: "USD", name: "Американский доллар" },
  { code: "EUR", name: "Евро" },
  { code: "GBP", name: "Британский фунт" },
  { code: "JPY", name: "Японская иена" },
  { code: "CNY", name: "Китайский юань" },
] as const;

export const CURRENCY_CODES = SUPPORTED_CURRENCIES.map(c => c.code);

// Криптовалюты
export const SUPPORTED_CRYPTOS = [
  { code: "USDT", name: "Tether" },
  { code: "ETH", name: "Ethereum" },
  { code: "BTC", name: "Bitcoin" },
  { code: "BNB", name: "Binance Coin" },
  { code: "SOL", name: "Solana" },
  { code: "XRP", name: "Ripple" },
  { code: "ADA", name: "Cardano" },
  { code: "DOGE", name: "Dogecoin" },
] as const;

export const CRYPTO_CODES = SUPPORTED_CRYPTOS.map(c => c.code);

// Акции
export const SUPPORTED_STOCKS = [
  "SBER", "GAZP", "YNDX", "AAPL", "GOOGL", "MSFT", "TSLA", "NVDA"
] as const;

