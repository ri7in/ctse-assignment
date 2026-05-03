require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const projectRoutes = require('./routes/project.routes');
const internalRoutes = require('./routes/internal.routes');
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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'project-service' }));
app.use('/api/projects', projectRoutes);
app.use('/internal', internalRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3002;

if (require.main === module) {
  connectDB().then(async () => {
    await startConsumer();
    app.listen(PORT, () => console.log(`project-service running on port ${PORT}`));
  });
}

module.exports = app;
