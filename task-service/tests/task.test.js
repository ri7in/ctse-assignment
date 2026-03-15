const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Task = require('../src/models/Task');

jest.mock('../src/services/kafka.producer', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/consumers/kafka.consumer', () => ({
  startConsumer: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/middleware/auth.middleware', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 'reporter-id', email: 'reporter@example.com', role: 'member' };
    next();
  }
}));

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tasktracker-tasks-test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Task Service', () => {
  let taskId;

  beforeEach(async () => {
    await Task.deleteMany({});
  });

  describe('POST /api/tasks', () => {
    it('creates a task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer mocktoken')
        .send({ title: 'Design login page', projectId: 'proj-1', priority: 'high' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Design login page');
      expect(res.body.reporterId).toBe('reporter-id');
      taskId = res.body._id;
    });

    it('rejects missing title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', 'Bearer mocktoken')
        .send({ projectId: 'proj-1' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks', () => {
    it('lists tasks', async () => {
      await Task.create({ title: 'T1', projectId: 'proj-1', reporterId: 'reporter-id' });
      const res = await request(app).get('/api/tasks').set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('filters by projectId', async () => {
      await Task.create({ title: 'T2', projectId: 'proj-2', reporterId: 'reporter-id' });
      const res = await request(app)
        .get('/api/tasks?projectId=proj-2')
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body.every((t) => t.projectId === 'proj-2')).toBe(true);
    });
  });

  describe('PATCH /api/tasks/:id/complete', () => {
    it('marks task as done', async () => {
      const task = await Task.create({ title: 'T3', projectId: 'proj-1', reporterId: 'reporter-id' });
      const res = await request(app)
        .patch(`/api/tasks/${task._id}/complete`)
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('updates task status and emits status.changed event', async () => {
      const { publish } = require('../src/services/kafka.producer');
      const task = await Task.create({ title: 'T4', projectId: 'proj-1', reporterId: 'reporter-id' });
      const res = await request(app)
        .patch(`/api/tasks/${task._id}`)
        .set('Authorization', 'Bearer mocktoken')
        .send({ status: 'in-progress' });
      expect(res.status).toBe(200);
      expect(publish).toHaveBeenCalledWith('task.status.changed', expect.objectContaining({ newStatus: 'in-progress' }));
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('deletes a task', async () => {
      const task = await Task.create({ title: 'T5', projectId: 'proj-1', reporterId: 'reporter-id' });
      const res = await request(app)
        .delete(`/api/tasks/${task._id}`)
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
