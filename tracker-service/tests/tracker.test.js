const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const TimeEntry = require('../src/models/TimeEntry');

jest.mock('../src/services/kafka.producer', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/consumers/kafka.consumer', () => ({
  startConsumer: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/middleware/auth.middleware', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 'user-1', email: 'user@example.com', role: 'member' };
    next();
  }
}));

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tasktracker-tracker-test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Tracker Service', () => {
  beforeEach(async () => {
    await TimeEntry.deleteMany({});
  });

  describe('POST /api/tracker/entries', () => {
    it('creates a time entry', async () => {
      const res = await request(app)
        .post('/api/tracker/entries')
        .set('Authorization', 'Bearer mocktoken')
        .send({
          taskId: 'task-1',
          projectId: 'proj-1',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          endedAt: new Date().toISOString()
        });
      expect(res.status).toBe(201);
      expect(res.body.taskId).toBe('task-1');
      expect(res.body.duration).toBeGreaterThan(0);
    });

    it('rejects missing taskId', async () => {
      const res = await request(app)
        .post('/api/tracker/entries')
        .set('Authorization', 'Bearer mocktoken')
        .send({ projectId: 'proj-1', startedAt: new Date().toISOString() });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tracker/entries', () => {
    it('lists entries', async () => {
      await TimeEntry.create({
        taskId: 'task-1', projectId: 'proj-1',
        userId: 'user-1', startedAt: new Date(), duration: 60
      });
      const res = await request(app)
        .get('/api/tracker/entries')
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  describe('GET /api/tracker/dashboard', () => {
    it('returns daily stats', async () => {
      const res = await request(app)
        .get('/api/tracker/dashboard')
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('dailyStats');
      expect(res.body.dailyStats).toHaveLength(7);
    });
  });

  describe('DELETE /api/tracker/entries/:id', () => {
    it('deletes an entry', async () => {
      const entry = await TimeEntry.create({
        taskId: 'task-1', projectId: 'proj-1',
        userId: 'user-1', startedAt: new Date(), duration: 30
      });
      const res = await request(app)
        .delete(`/api/tracker/entries/${entry._id}`)
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });
});
