const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'CryptoMind proxy running', time: new Date().toISOString() });
});

async function binanceFetch(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  });
  const data = await res.json();
  if (data && data.code) throw new Error(`Binance error ${data.code}: ${data.msg}`);
  return data;
}

app.get('/api/ping', async (req, res) => {
  try {
    const price = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT').then(r => r.json());
    res.json({ binance_reachable: true, btc_price: price.price });
  } catch (e) {
    res.status(500).json({ binance_reachable: false, error: e.message });
  }
});

app.get('/api/ticker/:symbol', async (req, res) => {
  try {
    const data = await binanceFetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${req.params.symbol.toUpperCase()}`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/klines/:symbol', async (req, res) => {
  try {
    const { interval = '1h', limit = 24 } = req.query;
    const data = await binanceFetch(`https://api.binance.com/api/v3/klines?symbol=${req.params.symbol.toUpperCase()}&interval=${interval}&limit=${limit}`);
    if (!Array.isArray(data)) throw new Error('Not an array: ' + JSON.stringify(data).slice(0, 100));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Proxy on port ${PORT}`));
