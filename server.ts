import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('klik-kazan.db');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    level INTEGER DEFAULT 1,
    total_credits REAL DEFAULT 0,
    available_credits REAL DEFAULT 0,
    daily_click_limit INTEGER DEFAULT 100,
    tron_wallet TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advertiser_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    target_url TEXT NOT NULL,
    credits_per_click REAL NOT NULL,
    total_budget REAL NOT NULL,
    spent_budget REAL DEFAULT 0,
    min_view_seconds INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending',
    total_clicks INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (advertiser_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ad_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_id INTEGER,
    user_id INTEGER,
    credits_earned REAL NOT NULL,
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ad_id) REFERENCES ads(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount_credits REAL NOT NULL,
    amount_usdt REAL NOT NULL,
    tron_wallet TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Create a default admin user if none exists
const adminExists = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (email, username, password, role) VALUES (?, ?, ?, ?)").run(
    'admin@klikkazan.com', 'admin', 'admin123', 'admin'
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  });

  app.post('/api/auth/register', (req, res) => {
    const { email, username, password } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (email, username, password) VALUES (?, ?, ?)").run(email, username, password);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      res.json({ success: true, user });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message });
    }
  });

  // User details
  app.get('/api/users/:id', (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (user) {
      // Get today's clicks
      const todayClicks = db.prepare("SELECT COUNT(*) as count FROM ad_clicks WHERE user_id = ? AND date(clicked_at) = date('now')").get(req.params.id) as {count: number};
      res.json({ ...user, today_clicks: todayClicks.count });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  });

  // Ads
  app.get('/api/ads', (req, res) => {
    const ads = db.prepare("SELECT * FROM ads WHERE status = 'active' AND spent_budget < total_budget").all();
    res.json(ads);
  });

  app.get('/api/admin/ads', (req, res) => {
    const ads = db.prepare("SELECT * FROM ads").all();
    res.json(ads);
  });

  app.post('/api/ads', (req, res) => {
    const { advertiser_id, title, description, target_url, credits_per_click, total_budget, min_view_seconds } = req.body;
    
    // Check if advertiser has enough credits
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(advertiser_id) as any;
    if (!user || user.available_credits < total_budget) {
      return res.status(400).json({ success: false, message: 'Insufficient credits' });
    }

    // Deduct credits
    db.prepare("UPDATE users SET available_credits = available_credits - ? WHERE id = ?").run(total_budget, advertiser_id);

    const result = db.prepare(`
      INSERT INTO ads (advertiser_id, title, description, target_url, credits_per_click, total_budget, min_view_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(advertiser_id, title, description, target_url, credits_per_click, total_budget, min_view_seconds);
    
    res.json({ success: true, ad_id: result.lastInsertRowid });
  });

  app.put('/api/admin/ads/:id/status', (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE ads SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Click Ad
  app.post('/api/ads/:id/click', (req, res) => {
    const { user_id } = req.body;
    const ad_id = req.params.id;

    const ad = db.prepare("SELECT * FROM ads WHERE id = ? AND status = 'active'").get(ad_id) as any;
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found or inactive' });

    if (ad.spent_budget + ad.credits_per_click > ad.total_budget) {
       db.prepare("UPDATE ads SET status = 'completed' WHERE id = ?").run(ad_id);
       return res.status(400).json({ success: false, message: 'Ad budget exhausted' });
    }

    // Check if user already clicked today
    const clickedToday = db.prepare("SELECT * FROM ad_clicks WHERE ad_id = ? AND user_id = ? AND date(clicked_at) = date('now')").get(ad_id, user_id);
    if (clickedToday) {
      return res.status(400).json({ success: false, message: 'Already clicked today' });
    }

    // Process click
    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO ad_clicks (ad_id, user_id, credits_earned) VALUES (?, ?, ?)").run(ad_id, user_id, ad.credits_per_click);
      db.prepare("UPDATE ads SET spent_budget = spent_budget + ?, total_clicks = total_clicks + 1 WHERE id = ?").run(ad.credits_per_click, ad_id);
      db.prepare("UPDATE users SET total_credits = total_credits + ?, available_credits = available_credits + ? WHERE id = ?").run(ad.credits_per_click, ad.credits_per_click, user_id);
    });

    try {
      transaction();
      res.json({ success: true, credits_earned: ad.credits_per_click });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Withdrawals
  app.post('/api/withdrawals', (req, res) => {
    const { user_id, amount_credits, tron_wallet } = req.body;
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(user_id) as any;
    if (!user || user.available_credits < amount_credits) {
      return res.status(400).json({ success: false, message: 'Insufficient credits' });
    }

    // 100 credits = 1 USDT
    const amount_usdt = amount_credits / 100;

    const transaction = db.transaction(() => {
      db.prepare("UPDATE users SET available_credits = available_credits - ? WHERE id = ?").run(amount_credits, user_id);
      db.prepare("INSERT INTO withdrawal_requests (user_id, amount_credits, amount_usdt, tron_wallet) VALUES (?, ?, ?, ?)").run(user_id, amount_credits, amount_usdt, tron_wallet);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.get('/api/admin/withdrawals', (req, res) => {
    const withdrawals = db.prepare("SELECT w.*, u.email, u.username FROM withdrawal_requests w JOIN users u ON w.user_id = u.id").all();
    res.json(withdrawals);
  });

  app.put('/api/admin/withdrawals/:id/status', (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE withdrawal_requests SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/stats', (req, res) => {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
    const totalAds = db.prepare("SELECT COUNT(*) as count FROM ads").get() as any;
    const totalClicks = db.prepare("SELECT COUNT(*) as count FROM ad_clicks").get() as any;
    
    res.json({
      totalUsers: totalUsers.count,
      totalAds: totalAds.count,
      totalClicks: totalClicks.count
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
