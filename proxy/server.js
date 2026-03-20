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
  res.json({ status: 'CryptoMind proxy running', source: 'CoinGecko', time: new Date().toISOString() });
});

// Map Binance symbol -> CoinGecko ID
const CG_IDS = {
  BTCUSDT:  'bitcoin',
  ETHUSDT:  'ethereum',
  BNBUSDT:  'binancecoin',
  SOLUSDT:  'solana',
  XRPUSDT:  'ripple',
  DOGEUSDT: 'dogecoin',
  ADAUSDT:  'cardano',
  AVAXUSDT: 'avalanche-2'
};

// Fetch full coin data from CoinGecko (includes sparkline)
async function fetchCoinData(symbol) {
  const id = CG_IDS[symbol.toUpperCase()];
  if (!id) throw new Error('Unknown symbol: ' + symbol);
  const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('CoinGecko HTTP ' + res.status);
  return res.json();
}

// GET /api/ping
app.get('/api/ping', async (req, res) => {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const d = await r.json();
    res.json({ source: 'CoinGecko', reachable: true, btc_price: d.bitcoin?.usd });
  } catch (e) {
    res.status(500).json({ reachable: false, error: e.message });
  }
});

// GET /api/ticker/:symbol  -> shaped like Binance 24hr ticker
app.get('/api/ticker/:symbol', async (req, res) => {
  try {
    const d = await fetchCoinData(req.params.symbol);
    const md = d.market_data;
    res.json({
      symbol:             req.params.symbol.toUpperCase(),
      lastPrice:          String(md.current_price.usd),
      priceChangePercent: String(md.price_change_percentage_24h?.toFixed(4) ?? 0),
      highPrice:          String(md.high_24h.usd),
      lowPrice:           String(md.low_24h.usd),
      quoteVolume:        String(md.total_volume.usd),
      source:             'coingecko'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/klines/:symbol  -> array shaped like Binance klines
app.get('/api/klines/:symbol', async (req, res) => {
  try {
    const d = await fetchCoinData(req.params.symbol);
    const prices = d.market_data.sparkline_7d?.price || [];
    // Take last 24 hourly price points
    const last24 = prices.slice(-25);
    const avgVol = d.market_data.total_volume.usd / 168;

    const klines = last24.slice(1).map((price, i) => {
      const open  = last24[i];
      const close = price;
      const high  = Math.max(open, close) * 1.0015;
      const low   = Math.min(open, close) * 0.9985;
      const now   = Date.now();
      const openTime  = now - (24 - i) * 3600000;
      const closeTime = openTime + 3599999;
      // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
      return [openTime, String(open), String(high), String(low), String(close), String(avgVol), closeTime, '0', 0, '0', '0', '0'];
    });

    res.json(klines);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`CryptoMind proxy (CoinGecko) running on port ${PORT}`));
