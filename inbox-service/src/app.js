require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { initFirebase } = require('./config/firebase');
const inboxRoutes = require('./routes/inbox.routes');
const { startConsumer } = require('./consumers/kafka.consumer');
const setupSwagger = require('../swagger/swagger');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3080'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

setupSwagger(app);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'inbox-service' }));
app.use('/api/inbox', inboxRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3005;

if (require.main === module) {
  connectDB().then(async () => {
    initFirebase();
    await startConsumer();
    app.listen(PORT, () => console.log(`inbox-service running on port ${PORT}`));
  });
}

module.exports = app;
