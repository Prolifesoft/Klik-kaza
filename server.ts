import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

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
    referral_code TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending', -- pending, approved (after KYC or some activity)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advertiser_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    target_url TEXT,
    iframe_code TEXT,
    type TEXT DEFAULT 'url',
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

try {
  db.exec("ALTER TABLE users ADD COLUMN kyc_status TEXT DEFAULT 'unverified'");
} catch (e) {
  // Column might already exist
}

try {
  db.exec("ALTER TABLE ads ADD COLUMN type TEXT DEFAULT 'url'");
} catch (e) {
}

try {
  db.exec("ALTER TABLE ads ADD COLUMN iframe_code TEXT");
} catch (e) {
}

try {
  db.exec("ALTER TABLE users ADD COLUMN total_clicks INTEGER DEFAULT 0");
} catch (e) {
  // Column might already exist
}

db.exec(`
  CREATE TABLE IF NOT EXISTS level_definitions (
    level INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    required_clicks INTEGER NOT NULL,
    multiplier REAL NOT NULL,
    bonus_limit INTEGER NOT NULL
  );
`);

// Seed level definitions
db.exec(`
  INSERT OR IGNORE INTO level_definitions (level, name, required_clicks, multiplier, bonus_limit) VALUES 
  (1, 'Bronz', 0, 1.0, 0),
  (2, 'Gümüş', 500, 1.1, 5),
  (3, 'Altın', 2000, 1.25, 10),
  (4, 'Platin', 5000, 1.5, 20),
  (5, 'Elmas', 10000, 2.0, 50);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS kyc_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    document_type TEXT NOT NULL,
    front_image TEXT NOT NULL,
    back_image TEXT NOT NULL,
    selfie_image TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT,
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

  // Trust proxy if behind a reverse proxy (like Nginx, Heroku, etc.)
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images

  // General API rate limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' }
  });

  // Specific rate limiter for ad clicks (prevent fast clicking/bots)
  const clickLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 clicks per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Çok hızlı tıklıyorsunuz. Lütfen biraz bekleyin.' }
  });

  // Apply general rate limiter to all API routes
  app.use('/api/', apiLimiter);

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
    const { email, username, password, referral_code } = req.body;
    try {
      // Generate a unique referral code for the new user
      const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const transaction = db.transaction(() => {
        const result = db.prepare("INSERT INTO users (email, username, password, referral_code) VALUES (?, ?, ?, ?)").run(email, username, password, newReferralCode);
        const newUserId = result.lastInsertRowid;

        // If a referral code was provided, link them
        if (referral_code) {
          const referrer = db.prepare("SELECT id FROM users WHERE referral_code = ?").get(referral_code) as any;
          if (referrer) {
            db.prepare("INSERT INTO referrals (referrer_id, referred_id, status) VALUES (?, ?, 'pending')").run(referrer.id, newUserId);
          }
        }
        return newUserId;
      });

      const userId = transaction();
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      res.json({ success: true, user });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message });
    }
  });

  // User details
  app.get('/api/users/:id', (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as any;
    if (user) {
      // Get today's clicks
      const todayClicks = db.prepare("SELECT COUNT(*) as count FROM ad_clicks WHERE user_id = ? AND date(clicked_at) = date('now')").get(req.params.id) as {count: number};
      
      // Get level info
      const currentLevel = db.prepare("SELECT * FROM level_definitions WHERE level = ?").get(user.level);
      const nextLevel = db.prepare("SELECT * FROM level_definitions WHERE level = ?").get(user.level + 1) || null;
      
      res.json({ 
        ...user, 
        today_clicks: todayClicks.count,
        level_info: currentLevel,
        next_level_info: nextLevel
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  });

  app.get('/api/users/:id/referrals', (req, res) => {
    const referrals = db.prepare(`
      SELECT r.status, r.created_at, u.username, u.level
      FROM referrals r
      JOIN users u ON r.referred_id = u.id
      WHERE r.referrer_id = ?
    `).all(req.params.id);
    res.json(referrals);
  });

  app.get('/api/users/:id/earnings', (req, res) => {
    const earnings = db.prepare(`
      SELECT date(clicked_at) as date, SUM(credits_earned) as amount
      FROM ad_clicks
      WHERE user_id = ? AND clicked_at >= date('now', '-6 days')
      GROUP BY date(clicked_at)
      ORDER BY date(clicked_at) ASC
    `).all(req.params.id);
    res.json(earnings);
  });

  app.get('/api/users/:id/kyc', (req, res) => {
    const kyc = db.prepare("SELECT * FROM kyc_documents WHERE user_id = ?").get(req.params.id);
    res.json(kyc || null);
  });

  app.post('/api/users/:id/kyc', (req, res) => {
    const { document_type, front_image, back_image, selfie_image } = req.body;
    const userId = req.params.id;
    
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO kyc_documents (user_id, document_type, front_image, back_image, selfie_image, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
        ON CONFLICT(user_id) DO UPDATE SET
          document_type=excluded.document_type,
          front_image=excluded.front_image,
          back_image=excluded.back_image,
          selfie_image=excluded.selfie_image,
          status='pending',
          rejection_reason=NULL
      `).run(userId, document_type, front_image, back_image, selfie_image);
      
      db.prepare("UPDATE users SET kyc_status = 'pending' WHERE id = ?").run(userId);
    });
    
    try {
      transaction();
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      res.json({ success: true, user });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.put('/api/users/:id/settings', (req, res) => {
    const { tron_wallet, password } = req.body;
    const userId = req.params.id;
    
    try {
      if (password) {
        db.prepare("UPDATE users SET tron_wallet = ?, password = ? WHERE id = ?").run(tron_wallet, password, userId);
      } else {
        db.prepare("UPDATE users SET tron_wallet = ? WHERE id = ?").run(tron_wallet, userId);
      }
      const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      res.json({ success: true, user: updatedUser });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Ads
  app.get('/api/ads', (req, res) => {
    const ads = db.prepare("SELECT * FROM ads WHERE status = 'active' AND spent_budget < total_budget").all();
    res.json(ads);
  });

  app.get('/api/admin/users', (req, res) => {
    const users = db.prepare("SELECT id, email, username, role, available_credits FROM users").all();
    res.json(users);
  });

  app.post('/api/admin/users/:id/credits', (req, res) => {
    const { amount, type } = req.body;
    const userId = req.params.id;
    
    if (type === 'add') {
      db.prepare("UPDATE users SET available_credits = available_credits + ?, total_credits = total_credits + ? WHERE id = ?").run(amount, amount, userId);
    } else if (type === 'subtract') {
      db.prepare("UPDATE users SET available_credits = MAX(0, available_credits - ?) WHERE id = ?").run(amount, userId);
    }
    res.json({ success: true });
  });

  app.delete('/api/admin/ads/:id', (req, res) => {
    const adId = req.params.id;
    // Delete related clicks first
    db.prepare("DELETE FROM ad_clicks WHERE ad_id = ?").run(adId);
    // Delete ad
    db.prepare("DELETE FROM ads WHERE id = ?").run(adId);
    res.json({ success: true });
  });

  app.get('/api/admin/kyc', (req, res) => {
    const docs = db.prepare(`
      SELECT k.*, u.email, u.username 
      FROM kyc_documents k 
      JOIN users u ON k.user_id = u.id 
      ORDER BY k.created_at DESC
    `).all();
    res.json(docs);
  });

  app.put('/api/admin/kyc/:id/status', (req, res) => {
    const { status, rejection_reason } = req.body;
    const kycId = req.params.id;
    
    const transaction = db.transaction(() => {
      db.prepare("UPDATE kyc_documents SET status = ?, rejection_reason = ? WHERE id = ?").run(status, rejection_reason || null, kycId);
      const kyc = db.prepare("SELECT user_id FROM kyc_documents WHERE id = ?").get(kycId) as any;
      if (kyc) {
        db.prepare("UPDATE users SET kyc_status = ? WHERE id = ?").run(status, kyc.user_id);
        
        // If approved, handle referral bonus
        if (status === 'approved') {
          const referral = db.prepare("SELECT referrer_id FROM referrals WHERE referred_id = ? AND status = 'pending'").get(kyc.user_id) as any;
          if (referral) {
            db.prepare("UPDATE referrals SET status = 'approved' WHERE referred_id = ?").run(kyc.user_id);
            db.prepare("UPDATE users SET daily_click_limit = daily_click_limit + 5 WHERE id = ?").run(referral.referrer_id);
          }
        }
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  app.get('/api/admin/ads', (req, res) => {
    const ads = db.prepare("SELECT * FROM ads").all();
    res.json(ads);
  });

  app.post('/api/ads', (req, res) => {
    const { advertiser_id, title, description, target_url, iframe_code, type, credits_per_click, total_budget, min_view_seconds } = req.body;
    
    // Check if advertiser has enough credits
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(advertiser_id) as any;
    
    // If it's an admin creating a system ad, we can skip budget deduction if we want,
    // but let's assume admin also needs budget or we just bypass if user.role === 'admin'
    if (user.role !== 'admin') {
      if (!user || user.available_credits < total_budget) {
        return res.status(400).json({ success: false, message: 'Insufficient credits' });
      }
      // Deduct credits
      db.prepare("UPDATE users SET available_credits = available_credits - ? WHERE id = ?").run(total_budget, advertiser_id);
    }

    const result = db.prepare(`
      INSERT INTO ads (advertiser_id, title, description, target_url, iframe_code, type, credits_per_click, total_budget, min_view_seconds, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      advertiser_id, 
      title, 
      description, 
      target_url || '', 
      iframe_code || '', 
      type || 'url', 
      credits_per_click, 
      total_budget, 
      min_view_seconds,
      user.role === 'admin' ? 'active' : 'pending' // Auto-approve admin ads
    );
    
    res.json({ success: true, ad_id: result.lastInsertRowid });
  });

  app.put('/api/admin/ads/:id/status', (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE ads SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  const activeAdSessions = new Map<string, number>();

  app.post('/api/ads/:id/start', (req, res) => {
    const { user_id } = req.body;
    const ad_id = req.params.id;
    activeAdSessions.set(`${user_id}_${ad_id}`, Date.now());
    res.json({ success: true });
  });

  // Click Ad
  app.post('/api/ads/:id/click', clickLimiter, (req, res) => {
    const { user_id } = req.body;
    const ad_id = req.params.id;

    const sessionKey = `${user_id}_${ad_id}`;
    const startTime = activeAdSessions.get(sessionKey);

    const ad = db.prepare("SELECT * FROM ads WHERE id = ? AND status = 'active'").get(ad_id) as any;
    if (!ad) return res.status(404).json({ success: false, message: 'Ad not found or inactive' });

    // Verify view time (with 1 second buffer for network latency)
    if (!startTime || (Date.now() - startTime) < (ad.min_view_seconds * 1000 - 1000)) {
      return res.status(400).json({ success: false, message: 'Reklam izleme süresini tamamlamadınız.' });
    }

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
      const user = db.prepare("SELECT level, total_clicks FROM users WHERE id = ?").get(user_id) as any;
      const levelDef = db.prepare("SELECT multiplier FROM level_definitions WHERE level = ?").get(user.level) as any;
      
      const earned = ad.credits_per_click * (levelDef?.multiplier || 1.0);
      const newTotalClicks = (user.total_clicks || 0) + 1;

      db.prepare("INSERT INTO ad_clicks (ad_id, user_id, credits_earned) VALUES (?, ?, ?)").run(ad_id, user_id, earned);
      db.prepare("UPDATE ads SET spent_budget = spent_budget + ?, total_clicks = total_clicks + 1 WHERE id = ?").run(earned, ad_id);
      db.prepare("UPDATE users SET total_credits = total_credits + ?, available_credits = available_credits + ?, total_clicks = ? WHERE id = ?").run(earned, earned, newTotalClicks, user_id);

      // Check level up
      const nextLevelDef = db.prepare("SELECT * FROM level_definitions WHERE required_clicks <= ? ORDER BY level DESC LIMIT 1").get(newTotalClicks) as any;
      
      let leveledUp = false;
      if (nextLevelDef && nextLevelDef.level > user.level) {
        db.prepare("UPDATE users SET level = ?, daily_click_limit = daily_click_limit + ? WHERE id = ?").run(nextLevelDef.level, nextLevelDef.bonus_limit, user_id);
        leveledUp = true;
      }

      return { earned, leveledUp, newLevel: nextLevelDef?.level };
    });

    try {
      const result = transaction();
      activeAdSessions.delete(sessionKey); // Clear session after successful claim
      res.json({ success: true, credits_earned: result.earned, leveledUp: result.leveledUp, newLevel: result.newLevel });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Notifications
  app.get('/api/users/:id/notifications', (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC").all(req.params.id);
    res.json(notifications);
  });

  app.put('/api/notifications/:id/read', (req, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put('/api/users/:id/notifications/read-all', (req, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Withdrawals
  app.post('/api/withdrawals', (req, res) => {
    const { user_id, amount_credits, tron_wallet } = req.body;
    
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(user_id) as any;
    if (!user || user.available_credits < amount_credits) {
      return res.status(400).json({ success: false, message: 'Insufficient credits' });
    }
    
    if (user.kyc_status !== 'approved') {
      return res.status(403).json({ success: false, message: 'KYC onayı gereklidir' });
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

  app.post('/api/admin/notifications', (req, res) => {
    const { user_id, title, message, type } = req.body;
    
    try {
      if (user_id === 'all') {
        // Send to all users
        const users = db.prepare("SELECT id FROM users").all() as any[];
        const insert = db.prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)");
        
        const transaction = db.transaction(() => {
          for (const user of users) {
            insert.run(user.id, title, message, type || 'info');
          }
        });
        
        transaction();
      } else {
        // Send to specific user
        db.prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)").run(
          user_id, title, message, type || 'info'
        );
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
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
