const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
app.use(express.json());

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'paymentsdb',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

async function initDB(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id           SERIAL PRIMARY KEY,
          order_id     INT NOT NULL,
          amount       DECIMAL(10,2) NOT NULL,
          method       VARCHAR(30) DEFAULT 'card',
          status       VARCHAR(30) DEFAULT 'pending',
          card_last4   VARCHAR(4),
          transaction_id VARCHAR(100),
          created_at   TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Payments DB ready');
      return;
    } catch (e) {
      console.log(`⏳ DB retry ${i+1}/${retries}...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  process.exit(1);
}

// Simulate payment processing
function processPayment(cardNumber, amount) {
  // Test card: 4242424242424242 always succeeds
  if (cardNumber === '4242424242424242') return { success: true };
  // 4000000000000002 always declines
  if (cardNumber === '4000000000000002') return { success: false, reason: 'Card declined' };
  // Random ~95% success for other cards
  return Math.random() > 0.05
    ? { success: true }
    : { success: false, reason: 'Insufficient funds' };
}

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'payment-service' }));

app.post('/api/payments', async (req, res) => {
  const { order_id, amount, card_last4, card_number, method = 'card' } = req.body;
  if (!order_id || !amount) return res.status(400).json({ error: 'order_id and amount required' });

  const result = processPayment(card_number || '', amount);
  const status = result.success ? 'completed' : 'failed';
  const txId = result.success ? `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` : null;

  try {
    const r = await pool.query(
      `INSERT INTO payments(order_id,amount,method,status,card_last4,transaction_id)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [order_id, amount, method, status, card_last4 || '0000', txId]
    );
    const payment = r.rows[0];

    // Cache payment result
    await redisClient.setEx(`payment:order:${order_id}`, 3600, JSON.stringify(payment)).catch(() => {});

    if (!result.success) {
      return res.status(402).json({ error: result.reason || 'Payment failed', payment });
    }
    res.status(201).json(payment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/payments/:id', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM payments WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Payment not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/payments/order/:orderId', async (req, res) => {
  const cached = await redisClient.get(`payment:order:${req.params.orderId}`).catch(() => null);
  if (cached) return res.json(JSON.parse(cached));
  try {
    const r = await pool.query('SELECT * FROM payments WHERE order_id=$1 ORDER BY id DESC LIMIT 1', [req.params.orderId]);
    if (!r.rows.length) return res.status(404).json({ error: 'Payment not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payments/:id/refund', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE payments SET status='refunded' WHERE id=$1 RETURNING *`, [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Payment not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3004;
initDB().then(() => app.listen(PORT, () => console.log(`💳 Payment Service → port ${PORT}`)));
