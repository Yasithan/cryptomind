const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3001;

// Allow requests from any origin (your frontend)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check - also used by UptimeRobot to keep server awake
app.get('/', (req, res) => {
  res.json({ status: 'CryptoMind proxy running', time: new Date().toISOString() });
});

// GET /api/ticker/BTCUSDT  -> Binance 24hr ticker
app.get('/api/ticker/:symbol', async (req, res) => {
  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${req.params.symbol.toUpperCase()}`;
    const data = await fetch(url).then(r => r.json());
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/klines/BTCUSDT?interval=1h&limit=24  -> candlestick data
app.get('/api/klines/:symbol', async (req, res) => {
  try {
    const { interval = '1h', limit = 24 } = req.query;
    const url = `https://api.binance.com/api/v3/klines?symbol=${req.params.symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;
    const data = await fetch(url).then(r => r.json());
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/price/BTCUSDT  -> simple current price only
app.get('/api/price/:symbol', async (req, res) => {
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${req.params.symbol.toUpperCase()}`;
    const data = await fetch(url).then(r => r.json());
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`CryptoMind proxy running on port ${PORT}`);
});
