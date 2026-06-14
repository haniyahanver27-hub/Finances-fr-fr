const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const BASE_URL = 'https://finnhub.io/api/v1';
const fallbackStocks = [
  { symbol: 'NVDA', description: 'NVIDIA Corporation', type: 'Common Stock', price: 126.42, change: 2.8 },
  { symbol: 'AAPL', description: 'Apple Inc', type: 'Common Stock', price: 203.16, change: -0.7 },
  { symbol: 'MSFT', description: 'Microsoft Corporation', type: 'Common Stock', price: 481.05, change: 1.2 },
  { symbol: 'TSLA', description: 'Tesla Inc', type: 'Common Stock', price: 178.74, change: 4.4 },
  { symbol: 'SPY', description: 'SPDR S&P 500 ETF Trust', type: 'ETF', price: 547.91, change: 0.4 },
  { symbol: 'DIS', description: 'Walt Disney Co', type: 'Common Stock', price: 94.28, change: -1.6 }
];
let finnhubUnavailableUntil = 0;
const FINNHUB_RETRY_DELAY_MS = 5 * 60 * 1000;
class StockServiceError extends Error {
  constructor(message, { statusCode = 500, code = 'STOCK_SERVICE_ERROR', expose = false, cause } = {}) {
    super(message);
    this.name = 'StockServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.expose = expose;
    if (cause) this.cause = cause;
  }
}

const getFinnhubApiKey = () => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new StockServiceError(
      'FINNHUB_API_KEY is missing. Add it to server/.env and restart the backend.',
      { statusCode: 503, code: 'FINNHUB_API_KEY_MISSING', expose: true }
    );
  }
  return apiKey;
};

const requestFinnhub = async (path) => {
  if (Date.now() < finnhubUnavailableUntil) {
    throw new StockServiceError('Finnhub is temporarily unavailable.', {
      statusCode: 503,
      code: 'FINNHUB_COOLDOWN',
      expose: true
    });
  }

  const apiKey = getFinnhubApiKey();
  const separator = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${separator}token=${apiKey}`;

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    finnhubUnavailableUntil = Date.now() + FINNHUB_RETRY_DELAY_MS;
    throw new StockServiceError('Unable to reach Finnhub right now.', {
      statusCode: 502,
      code: 'FINNHUB_UNREACHABLE',
      expose: true,
      cause: error
    });
  }

  if (!response.ok) {
    finnhubUnavailableUntil = Date.now() + FINNHUB_RETRY_DELAY_MS;
    if (response.status === 401) {
      throw new StockServiceError(
        'Finnhub rejected FINNHUB_API_KEY. Update the key and restart the backend.',
        { statusCode: 503, code: 'FINNHUB_API_KEY_INVALID', expose: true }
      );
    }
    if (response.status === 403) {
      throw new StockServiceError(
        'Finnhub denied access to this endpoint for the current API key or subscription plan.',
        { statusCode: 403, code: 'FINNHUB_PERMISSION_DENIED', expose: true }
      );
    }

    throw new StockServiceError(`Finnhub request failed with status ${response.status}.`, {
      statusCode: 502,
      code: 'FINNHUB_UPSTREAM_ERROR',
      expose: true
    });
  }

  try {
    return await response.json();
  } catch (error) {
    throw new StockServiceError('Finnhub returned an invalid response.', {
      statusCode: 502,
      code: 'FINNHUB_INVALID_RESPONSE',
      expose: true,
      cause: error
    });
  }
};

const getFallbackStock = (symbol) => fallbackStocks.find((stock) => stock.symbol === symbol)
  || { symbol, description: symbol, type: 'Common Stock', price: 100, change: 0 };

const fallbackQuote = (symbol) => {
  const stock = getFallbackStock(symbol);
  const previousClose = stock.price / (1 + stock.change / 100);
  return {
    symbol,
    current_price: stock.price,
    change: stock.price - previousClose,
    percent_change: stock.change,
    high_of_day: stock.price * 1.012,
    low_of_day: stock.price * 0.988,
    previous_close: previousClose,
    is_delayed: true,
    provider: 'local'
  };
};

const fallbackCandles = (symbol, from, to) => {
  const stock = getFallbackStock(symbol);
  const end = Number(to) || Math.floor(Date.now() / 1000);
  const start = Number(from) || end - (30 * 24 * 60 * 60);
  const step = Math.max(Math.floor((end - start) / 29), 1);
  const data = Array.from({ length: 30 }, (_, index) => {
    const wave = Math.sin(index / 3) * stock.price * 0.025;
    const close = stock.price + wave + (index - 29) * stock.price * 0.001;
    return {
      t: start + index * step,
      o: close * 0.997,
      h: close * 1.008,
      l: close * 0.992,
      c: close,
      v: 1000000 + index * 17000
    };
  });
  return { symbol, data, provider: 'local' };
};

const getQuote = async (symbol) => {
  const safeSymbol = symbol.toUpperCase();
  let data;
  try {
    data = await requestFinnhub(`/quote?symbol=${encodeURIComponent(safeSymbol)}`);
  } catch (error) {
    console.error('Finnhub quote fallback:', error.message);
    return fallbackQuote(safeSymbol);
  }

  // Finnhub quote mapping:
  // c: Current price, d: Change, dp: Percent change, h: High, l: Low, o: Open, pc: Previous close
  return {
    symbol: safeSymbol,
    current_price: data.c,
    change: data.d,
    percent_change: data.dp,
    high_of_day: data.h,
    low_of_day: data.l,
    previous_close: data.pc,
    // Note: Data is 15-min delayed for free tier
    is_delayed: true,
    provider: 'finnhub'
  };
};

const searchSymbol = async (query) => {
  let results;
  try {
    const data = await requestFinnhub(`/search?q=${encodeURIComponent(query)}`);
    results = Array.isArray(data.result) ? data.result : [];
  } catch (error) {
    console.error('Finnhub search fallback:', error.message);
    const normalized = query.toLowerCase();
    return fallbackStocks.filter((stock) => (
      stock.symbol.toLowerCase().includes(normalized)
      || stock.description.toLowerCase().includes(normalized)
    )).slice(0, 10).map(({ symbol, description, type }) => ({ symbol, description, type, provider: 'local' }));
  }

  return results.slice(0, 10).map(item => ({
    symbol: item.symbol,
    description: item.description,
    type: item.type
  }));
};

const getCandles = async (symbol, resolution = 'D', from, to) => {
  // defaults to last 30 days if not provided
  const toTime = to || Math.floor(Date.now() / 1000);
  const fromTime = from || toTime - (30 * 24 * 60 * 60);
  const safeSymbol = symbol.toUpperCase();
  let data;
  try {
    data = await requestFinnhub(
      `/stock/candle?symbol=${encodeURIComponent(safeSymbol)}&resolution=${encodeURIComponent(
        resolution
      )}&from=${encodeURIComponent(fromTime)}&to=${encodeURIComponent(toTime)}`
    );
  } catch (error) {
    console.error('Finnhub candles fallback:', error.message);
    return fallbackCandles(safeSymbol, fromTime, toTime);
  }

  if (data.s === 'no_data') {
    return { symbol: safeSymbol, data: [] };
  }

  // Map into easy to use array
  const candles = Array.isArray(data.t)
    ? data.t.map((timestamp, index) => ({
        t: timestamp,
        o: data.o[index],
        h: data.h[index],
        l: data.l[index],
        c: data.c[index],
        v: data.v[index]
      }))
    : [];

  return {
    symbol: safeSymbol,
    data: candles,
    provider: 'finnhub'
  };
};

module.exports = {
  getQuote,
  searchSymbol,
  getCandles,
  StockServiceError,
  getStatus: () => ({
    configured: Boolean(process.env.FINNHUB_API_KEY),
    available: Boolean(process.env.FINNHUB_API_KEY) && Date.now() >= finnhubUnavailableUntil
  })
};
