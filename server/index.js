const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
