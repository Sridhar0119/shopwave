const express = require('express');
const { MongoClient } = require('mongodb');
const redis = require('redis');

const app = express();
app.use(express.json());

const MONGO_URI  = process.env.MONGO_URI  || 'mongodb://localhost:27017';
const REDIS_URL  = process.env.REDIS_URL  || 'redis://localhost:6379';
const DB_NAME    = process.env.DB_NAME    || 'notificationsdb';

let db;
let notifCol;

async function initMongo(retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
      db = client.db(DB_NAME);
      notifCol = db.collection('notifications');
      await notifCol.createIndex({ user_id: 1, created_at: -1 });
      await notifCol.createIndex({ type: 1 });
      console.log('✅ Notification MongoDB ready');
      return;
    } catch (e) {
      console.log(`⏳ MongoDB retry ${i+1}/${retries}: ${e.message}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  process.exit(1);
}

const redisClient = redis.createClient({ url: REDIS_URL });
redisClient.connect().catch(console.error);

// Subscribe to notification events from Redis pub/sub
async function subscribeEvents() {
  const sub = redisClient.duplicate();
  await sub.connect();
  await sub.subscribe('notifications', async (message) => {
    try {
      const event = JSON.parse(message);
      await sendNotification(event);
    } catch (e) { console.error('Event error:', e.message); }
  });
  console.log('📡 Subscribed to Redis notification events');
}

const TEMPLATES = {
  order_placed: (d) => ({
    subject: `Order #${d.order_id} Confirmed! 🎉`,
    body: `Hi ${d.user_name}, your order of $${d.total} has been placed successfully. We'll notify you when it ships!`,
  }),
  order_shipped: (d) => ({
    subject: `Your order is on its way! 🚚`,
    body: `Hi ${d.user_name}, order #${d.order_id} has been shipped. Track with: ${d.tracking_number || 'SW' + d.order_id}`,
  }),
  order_delivered: (d) => ({
    subject: `Order Delivered! ✅`,
    body: `Hi ${d.user_name}, your order #${d.order_id} has been delivered. Enjoy your purchase!`,
  }),
  payment_success: (d) => ({
    subject: `Payment Received 💳`,
    body: `Payment of $${d.amount} for order #${d.order_id} was successful. Transaction: ${d.transaction_id}`,
  }),
  payment_failed: (d) => ({
    subject: `Payment Failed ❌`,
    body: `Your payment of $${d.amount} for order #${d.order_id} failed. Please update your payment method.`,
  }),
  welcome: (d) => ({
    subject: `Welcome to ShopWave, ${d.user_name}! 🛍️`,
    body: `Hi ${d.user_name}, welcome aboard! Start shopping at shopwave.com`,
  }),
};

async function sendNotification(event) {
  const template = TEMPLATES[event.type];
  if (!template) {
    console.log(`⚠️  Unknown notification type: ${event.type}`);
    return;
  }
  const { subject, body } = template(event.data || {});

  // In production: integrate SendGrid/SES/Twilio here
  console.log(`📧 [${event.type}] To: ${event.email || 'unknown'}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body: ${body.slice(0, 80)}...`);

  const notification = {
    user_id:    event.user_id || null,
    email:      event.email   || null,
    type:       event.type,
    subject,
    body,
    status:     'sent',
    channel:    event.channel || 'email',
    created_at: new Date(),
    metadata:   event.data || {},
  };

  await notifCol.insertOne(notification);
  return notification;
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));

// Manual send
app.post('/api/notifications/send', async (req, res) => {
  try {
    const notif = await sendNotification(req.body);
    res.status(201).json(notif);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Publish event (other services call this)
app.post('/api/notifications/publish', async (req, res) => {
  try {
    await redisClient.publish('notifications', JSON.stringify(req.body));
    res.json({ message: 'Event published' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get notifications for a user
app.get('/api/notifications/user/:userId', async (req, res) => {
  try {
    const docs = await notifCol
      .find({ user_id: parseInt(req.params.userId) })
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    res.json(docs.map(d => { d.id = d._id.toString(); delete d._id; return d; }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all recent notifications (admin)
app.get('/api/notifications', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const docs = await notifCol.find().sort({ created_at: -1 }).limit(limit).toArray();
    res.json(docs.map(d => { d.id = d._id.toString(); delete d._id; return d; }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3005;
initMongo().then(async () => {
  await subscribeEvents();
  app.listen(PORT, () => console.log(`🔔 Notification Service → port ${PORT}`));
});
