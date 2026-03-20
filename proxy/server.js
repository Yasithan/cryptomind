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

// Binance has multiple API hosts - try each until one works
const BINANCE_HOSTS = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com'
];

async function binanceFetch(path) {
  let lastError = null;
  for (const host of BINANCE_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        timeout: 8000
      });
      const data = await res.json();
      if (data && data.code && data.code !== 0) {
        lastError = `Binance error ${data.code}: ${data.msg}`;
        continue; // try next host
      }
      return data;
    } catch (e) {
      lastError = e.message;
      continue;
    }
  }
  throw new Error(lastError || 'All Binance hosts failed');
}

// CoinGecko symbol map for fallback
const CG_IDS = {
  BTCUSDT: 'bitcoin', ETHUSDT: 'ethereum', BNBUSDT: 'binancecoin',
  SOLUSDT: 'solana',  XRPUSDT: 'ripple',   DOGEUSDT: 'dogecoin',
  ADAUSDT: 'cardano', AVAXUSDT: 'avalanche-2'
};

// CoinGecko fallback for ticker data
async function coingeckoTicker(symbol) {
  const id = CG_IDS[symbol.toUpperCase()];
  if (!id) throw new Error('Unknown symbol: ' + symbol);
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&sparkline=true`,
    { headers: { 'Accept': 'application/json' } }
  );
  const d = await res.json();
  const md = d.market_data;
  // Shape it like Binance ticker response
  return {
    symbol: symbol.toUpperCase(),
    lastPrice: String(md.current_price.usd),
    priceChangePercent: String(md.price_change_percentage_24h),
    highPrice: String(md.high_24h.usd),
    lowPrice: String(md.low_24h.usd),
    quoteVolume: String(md.total_volume.usd),
    source: 'coingecko'
  };
}

// CoinGecko fallback for klines (returns hourly sparkline as fake klines)
async function coingeckoKlines(symbol) {
  const id = CG_IDS[symbol.toUpperCase()];
  if (!id) throw new Error('Unknown symbol: ' + symbol);
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&sparkline=true`,
    { headers: { 'Accept': 'application/json' } }
  );
  const d = await res.json();
  const prices = d.market_data.sparkline_7d?.price || [];
  const last24 = prices.slice(-24);
  // Shape into Binance kline format: [openTime, open, high, low, close, volume, ...]
  return last24.map((price, i) => {
    const prev = last24[i - 1] || price;
    const vol = d.market_data.total_volume.usd / 168; // rough hourly vol
    return [
      Date.now() - (24 - i) * 3600000, // openTime
      String(prev),   // open
      String(Math.max(prev, price) * 1.001), // high (approx)
      String(Math.min(prev, price) * 0.999), // low (approx)
      String(price),  // close
      String(vol),    // volume
      Date.now() - (23 - i) * 3600000  // closeTime
    ];
  });
}

// Diagnostic ping
app.get('/api/ping', async (req, res) => {
  const results = {};
  for (const host of BINANCE_HOSTS) {
    try {
      const r = await fetch(`${host}/api/v3/ticker/price?symbol=BTCUSDT`, { timeout: 5000 });
      const d = await r.json();
      results[host] = d.price ? `✓ price=${d.price}` : `✗ ${JSON.stringify(d).slice(0,80)}`;
    } catch (e) {
      results[host] = `✗ ${e.message}`;
    }
  }
  res.json({ results });
});

// GET /api/ticker/:symbol  — tries Binance, falls back to CoinGecko
app.get('/api/ticker/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await binanceFetch(`/api/v3/ticker/24hr?symbol=${symbol}`);
    res.json({ ...data, source: 'binance' });
  } catch (e) {
    console.log(`Binance ticker failed (${e.message}), trying CoinGecko...`);
    try {
      const data = await coingeckoTicker(symbol);
      res.json(data);
    } catch (e2) {
      res.status(500).json({ error: `Binance: ${e.message} | CoinGecko: ${e2.message}` });
    }
  }
});

// GET /api/klines/:symbol  — tries Binance, falls back to CoinGecko
app.get('/api/klines/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const { interval = '1h', limit = 24 } = req.query;
  try {
    const data = await binanceFetch(`/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!Array.isArray(data)) throw new Error('Not an array');
    res.json(data);
  } catch (e) {
    console.log(`Binance klines failed (${e.message}), trying CoinGecko...`);
    try {
      const data = await coingeckoKlines(symbol);
      res.json(data);
    } catch (e2) {
      res.status(500).json({ error: `Binance: ${e.message} | CoinGecko: ${e2.message}` });
    }
  }
});

app.listen(PORT, () => console.log(`Proxy on port ${PORT}`));
