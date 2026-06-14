const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load the documented root environment file, with server/.env as an optional override.
dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '.env'), override: true, quiet: true });

const app = express();
const PORT = process.env.PORT || 5001;
const corsOrigin = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : process.env.NODE_ENV === 'production' ? false : true;

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api/ai', require('./routes/ai'));
app.use('/api/sfx', require('./routes/sfx'));
app.use('/api/stocks', require('./routes/stocks'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ClanVest API is running' });
});

app.get('/api/status', (req, res) => {
  const aiStatus = require('./services/aiService').getStatus();
  const stockStatus = require('./services/stockService').getStatus();
  const sfxStatus = require('./services/sfxService').getStatus();
  res.json({
    status: 'ok',
    services: {
      alphaMeow: aiStatus.openaiAvailable ? 'openai' : 'local',
      openai: aiStatus.openaiConfigured ? (aiStatus.openaiAvailable ? 'ready' : 'cooldown') : 'not_configured',
      gemini: aiStatus.geminiConfigured ? 'configured' : 'local_fallback',
      soundEffects: sfxStatus.available ? 'elevenlabs_with_local_fallback' : 'local',
      finnhub: stockStatus.available ? 'ready' : 'local_fallback',
      supabase: process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY
        ? 'configured'
        : 'not_configured'
    }
  });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Handle React routing, return all non-API requests to React app
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  console.error('Unhandled API error:', error);
  const isInvalidJson = error instanceof SyntaxError && error?.type === 'entity.parse.failed';
  const statusCode = error?.type === 'entity.too.large' ? 413 : isInvalidJson ? 400 : 500;
  return res.status(statusCode).json({
    error: statusCode === 413 ? 'Request body is too large' : isInvalidJson ? 'Request body contains invalid JSON' : 'Internal server error',
    code: statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : isInvalidJson ? 'INVALID_JSON' : 'INTERNAL_SERVER_ERROR'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
