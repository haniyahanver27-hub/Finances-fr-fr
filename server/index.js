const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '127.0.0.1';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', require('./routes/ai'));
app.use('/api/sfx', require('./routes/sfx'));
app.use('/api/stocks', require('./routes/stocks'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Future Fortune Hack Express Proxy is running' });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

server.on('error', (error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
