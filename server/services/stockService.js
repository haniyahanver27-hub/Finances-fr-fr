const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const BASE_URL = 'https://finnhub.io/api/v1';
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
  const apiKey = getFinnhubApiKey();
  const separator = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${separator}token=${apiKey}`;

  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new StockServiceError('Unable to reach Finnhub right now.', {
      statusCode: 502,
      code: 'FINNHUB_UNREACHABLE',
      expose: true,
      cause: error
    });
  }

  if (!response.ok) {
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

const getQuote = async (symbol) => {
  const safeSymbol = symbol.toUpperCase();
  const data = await requestFinnhub(`/quote?symbol=${encodeURIComponent(safeSymbol)}`);

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
    is_delayed: true
  };
};

const searchSymbol = async (query) => {
  const data = await requestFinnhub(`/search?q=${encodeURIComponent(query)}`);
  const results = Array.isArray(data.result) ? data.result : [];

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
  const data = await requestFinnhub(
    `/stock/candle?symbol=${encodeURIComponent(safeSymbol)}&resolution=${encodeURIComponent(
      resolution
    )}&from=${encodeURIComponent(fromTime)}&to=${encodeURIComponent(toTime)}`
  );

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
    data: candles
  };
};

module.exports = {
  getQuote,
  searchSymbol,
  getCandles,
  StockServiceError
};
