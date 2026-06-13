const express = require('express');
const router = express.Router();
const stockService = require('../services/stockService');
const { stocksLimiter } = require('../middleware/rateLimiter');

router.use(stocksLimiter);

// @route GET /api/stocks/quote/:symbol
router.get('/quote/:symbol', async (req, res) => {
  try {
    const quote = await stockService.getQuote(req.params.symbol);
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock quote' });
  }
});

// @route GET /api/stocks/search?q=query
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const results = await stockService.searchSymbol(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search symbol' });
  }
});

// @route GET /api/stocks/candles/:symbol
router.get('/candles/:symbol', async (req, res) => {
  const { resolution, from, to } = req.query;
  
  try {
    const candles = await stockService.getCandles(req.params.symbol, resolution, from, to);
    res.json(candles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock candles' });
  }
});

module.exports = router;
