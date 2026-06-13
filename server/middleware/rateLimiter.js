const rateLimit = require('express-rate-limit');

// AI Route Limiter: 20 requests per minute
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    status: 'error',
    message: 'Too many AI requests from this IP, please try again after a minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// TTS Route Limiter: 10 requests per minute
const ttsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    status: 'error',
    message: 'Too many audio requests from this IP, please try again after a minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stocks Route Limiter: 60 requests per minute (Finnhub free tier limit)
const stocksLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    status: 'error',
    message: 'Too many stock data requests from this IP, please try again after a minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  aiLimiter,
  ttsLimiter,
  stocksLimiter
};
