const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'shopwave-secret-key';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// PostgreSQL
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'authdb',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// Redis
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

// Init schema + seed
async function initDB(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id           SERIAL PRIMARY KEY,
          name         VARCHAR(120) NOT NULL,
          email        VARCHAR(200) UNIQUE NOT NULL,
          password     VARCHAR(255) NOT NULL,
          role         VARCHAR(20)  DEFAULT 'customer',
          created_at   TIMESTAMP    DEFAULT NOW()
        );
      `);
      // Seed demo user
      const hashed = await bcrypt.hash('demo123', 10);
      await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ('Demo User','demo@shopwave.com',$1,'customer')
         ON CONFLICT DO NOTHING`, [hashed]
      );
      console.log('✅ Auth DB ready');
      return;
    } catch (e) {
      console.log(`⏳ DB retry ${i+1}/${retries}...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  process.exit(1);
}

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// Routes
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-service' }));

app.post('/api/users/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  try {
    const hashed = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING id,name,email,role',
      [name, email, hashed]
    );
    const user = r.rows[0];
    res.status(201).json({ user, token: sign(user) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!r.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = r.rows[0];
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = sign(user);
    await redisClient.setEx(`session:${user.id}`, 7 * 86400, token).catch(() => {});
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const r = await pool.query('SELECT id,name,email,role,created_at FROM users WHERE id=$1', [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const r = await pool.query('SELECT id,name,email,role,created_at FROM users ORDER BY id');
  res.json(r.rows);
});

app.post('/api/users/logout', authMiddleware, async (req, res) => {
  await redisClient.del(`session:${req.user.id}`).catch(() => {});
  res.json({ message: 'Logged out' });
});

// Token verify endpoint (used by API gateway / other services)
app.post('/api/users/verify', (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch { res.status(401).json({ valid: false, error: 'Invalid token' }); }
});

const PORT = process.env.PORT || 3001;
initDB().then(() => app.listen(PORT, () => console.log(`🔐 Auth Service → port ${PORT}`)));
