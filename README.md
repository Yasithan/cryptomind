# CryptoMind Live 📡

AI-powered crypto market analyst using live Binance data.

## Folder Structure

```
cryptomind/
├── proxy/          ← Node.js server (deploy as Render Web Service)
│   ├── server.js
│   └── package.json
├── frontend/       ← Static HTML app (deploy as Render Static Site)
│   └── index.html
└── README.md
```

---

## Deploy on Render.com (Free)

### Step 1 — Push to GitHub
1. Create a free account at https://github.com
2. Create a new repository called `cryptomind`
3. Upload all these files keeping the folder structure

### Step 2 — Deploy the Proxy (Web Service)
1. Go to https://render.com and sign up free
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Root directory:** `proxy`
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
   - **Instance type:** Free
5. Click **Create Web Service**
6. Wait ~2 min. You'll get a URL like: `https://cryptomind-proxy.onrender.com`

### Step 3 — Deploy the Frontend (Static Site)
1. In Render, click **New → Static Site**
2. Connect the same GitHub repo
3. Settings:
   - **Root directory:** `frontend`
   - **Build command:** (leave empty)
   - **Publish directory:** `.`
4. Click **Create Static Site**
5. You'll get a URL like: `https://cryptomind.onrender.com`

### Step 4 — Connect them
1. Open your frontend URL on any device
2. Paste your proxy URL into the "Proxy URL" box
3. Click **Connect**
4. Select a coin and start analyzing!

---

## Keep Proxy Awake (Free)

Render's free tier sleeps after 15 minutes. To keep it awake:
1. Go to https://uptimerobot.com (free)
2. Add a new HTTP monitor
3. URL: `https://your-proxy.onrender.com/`
4. Interval: every 5 minutes
5. Done — proxy stays awake 24/7

---

## Local Development

```bash
cd proxy
npm install
node server.js
# Proxy runs on http://localhost:3001
```

Then open `frontend/index.html` in your browser and set proxy URL to `http://localhost:3001`.
