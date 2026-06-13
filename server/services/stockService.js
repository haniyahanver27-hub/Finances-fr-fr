const fetch = require('node-fetch');

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

const getQuote = async (symbol) => {
  try {
    const response = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
    if (!response.ok) throw new Error('Finnhub API Error');
    const data = await response.json();
    
    // Finnhub quote mapping:
    // c: Current price, d: Change, dp: Percent change, h: High, l: Low, o: Open, pc: Previous close
    return {
      symbol: symbol.toUpperCase(),
      current_price: data.c,
      change: data.d,
      percent_change: data.dp,
      high_of_day: data.h,
      low_of_day: data.l,
      previous_close: data.pc,
      // Note: Data is 15-min delayed for free tier
      is_delayed: true
    };
  } catch (error) {
    console.error('Stock Service Error:', error);
    throw error;
  }
};

const searchSymbol = async (query) => {
  try {
    const response = await fetch(`${BASE_URL}/search?q=${query}&token=${FINNHUB_API_KEY}`);
    if (!response.ok) throw new Error('Finnhub API Error');
    const data = await response.json();
    
    return data.result.slice(0, 10).map(item => ({
      symbol: item.symbol,
      description: item.description,
      type: item.type
    }));
  } catch (error) {
    console.error('Stock Service Error:', error);
    throw error;
  }
};

const getCandles = async (symbol, resolution = 'D', from, to) => {
  try {
    // defaults to last 30 days if not provided
    const toTime = to || Math.floor(Date.now() / 1000);
    const fromTime = from || toTime - (30 * 24 * 60 * 60);

    const response = await fetch(`${BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${fromTime}&to=${toTime}&token=${FINNHUB_API_KEY}`);
    if (!response.ok) throw new Error('Finnhub API Error');
    const data = await response.json();
    
    if (data.s === 'no_data') {
      return { symbol, data: [] };
    }

    // Map into easy to use array
    const candles = data.t.map((timestamp, index) => ({
      t: timestamp,
      o: data.o[index],
      h: data.h[index],
      l: data.l[index],
      c: data.c[index],
      v: data.v[index]
    }));

    return {
      symbol,
      data: candles
    };
  } catch (error) {
    console.error('Stock Service Error:', error);
    throw error;
  }
};

module.exports = {
  getQuote,
  searchSymbol,
  getCandles
};
