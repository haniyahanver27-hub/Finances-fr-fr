const express = require('express');
const router = express.Router();
const stockService = require('../services/stockService');
const { stocksLimiter } = require('../middleware/rateLimiter');

router.use(stocksLimiter);
const SYMBOL_PATTERN = /^[A-Z0-9.-]{1,15}$/i;
const RESOLUTIONS = new Set(['1', '5', '15', '30', '60', 'D', 'W', 'M']);

const normalizeSymbol = (symbol) => {
  const normalized = String(symbol || '').trim().toUpperCase();
  return SYMBOL_PATTERN.test(normalized) ? normalized : null;
};

const sendStockError = (res, error, fallbackMessage) => {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const errorMessage = error?.expose ? error.message : fallbackMessage;

  console.error('Stocks Route Error:', error);

  return res.status(statusCode).json({
    error: errorMessage,
    code: error?.code || 'STOCKS_ROUTE_ERROR'
  });
};

// @route GET /api/stocks/quote/:symbol
router.get('/quote/:symbol', async (req, res) => {
  const symbol = normalizeSymbol(req.params.symbol);
  if (!symbol) {
    return res.status(400).json({ error: 'A valid ticker symbol is required', code: 'INVALID_SYMBOL' });
  }

  try {
    const quote = await stockService.getQuote(symbol);
    res.json(quote);
  } catch (error) {
    sendStockError(res, error, 'Failed to fetch stock quote');
  }
});

// @route GET /api/stocks/search?q=query
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  if (q.length > 80) {
    return res.status(400).json({ error: 'Search query is too long', code: 'INVALID_SEARCH_QUERY' });
  }

  try {
    const results = await stockService.searchSymbol(q);
    res.json(results);
  } catch (error) {
    sendStockError(res, error, 'Failed to search symbol');
  }
});

// @route GET /api/stocks/candles/:symbol
router.get('/candles/:symbol', async (req, res) => {
  const symbol = normalizeSymbol(req.params.symbol);
  const resolution = String(req.query.resolution || 'D').toUpperCase();
  const from = req.query.from === undefined ? undefined : Number(req.query.from);
  const to = req.query.to === undefined ? undefined : Number(req.query.to);

  if (!symbol) {
    return res.status(400).json({ error: 'A valid ticker symbol is required', code: 'INVALID_SYMBOL' });
  }
  if (!RESOLUTIONS.has(resolution)) {
    return res.status(400).json({ error: 'Invalid candle resolution', code: 'INVALID_RESOLUTION' });
  }
  if ((from !== undefined && (!Number.isInteger(from) || from <= 0)) || (to !== undefined && (!Number.isInteger(to) || to <= 0))) {
    return res.status(400).json({ error: 'Candle timestamps must be Unix seconds', code: 'INVALID_TIMESTAMP' });
  }
  if (from !== undefined && to !== undefined && from >= to) {
    return res.status(400).json({ error: '"from" must be earlier than "to"', code: 'INVALID_DATE_RANGE' });
  }
  
  try {
    const candles = await stockService.getCandles(symbol, resolution, from, to);
    res.json(candles);
  } catch (error) {
    sendStockError(res, error, 'Failed to fetch stock candles');
  }
});

module.exports = router;
