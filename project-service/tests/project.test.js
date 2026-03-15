const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Project = require('../src/models/Project');

jest.mock('../src/services/kafka.producer', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/consumers/kafka.consumer', () => ({
  startConsumer: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/middleware/auth.middleware', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 'owner-id', email: 'owner@example.com', role: 'member' };
    next();
  }
}));

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tasktracker-projects-test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Project Service', () => {
  let projectId;

  beforeEach(async () => {
    await Project.deleteMany({});
  });

  describe('POST /api/projects', () => {
    it('creates a project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer mocktoken')
        .send({ name: 'Hope Redesign', description: 'UI overhaul' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Hope Redesign');
      expect(res.body.ownerId).toBe('owner-id');
      projectId = res.body._id;
    });

    it('rejects missing name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer mocktoken')
        .send({ description: 'No name' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/projects', () => {
    it('lists projects for the user', async () => {
      await Project.create({ name: 'P1', ownerId: 'owner-id', members: ['owner-id'] });
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('returns a project the user is member of', async () => {
      const p = await Project.create({ name: 'P2', ownerId: 'owner-id', members: ['owner-id'] });
      const res = await request(app)
        .get(`/api/projects/${p._id}`)
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
    });

    it('returns 403 for non-member', async () => {
      const p = await Project.create({ name: 'P3', ownerId: 'other-id', members: ['other-id'] });
      const res = await request(app)
        .get(`/api/projects/${p._id}`)
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    it('updates project as owner', async () => {
      const p = await Project.create({ name: 'P4', ownerId: 'owner-id', members: ['owner-id'] });
      const res = await request(app)
        .patch(`/api/projects/${p._id}`)
        .set('Authorization', 'Bearer mocktoken')
        .send({ name: 'P4 Updated' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('P4 Updated');
    });
  });

  describe('GET /api/projects/:id/stats', () => {
    it('returns stats', async () => {
      const p = await Project.create({
        name: 'P5', ownerId: 'owner-id', members: ['owner-id'],
        totalTasks: 10, completedTasks: 5
      });
      const res = await request(app)
        .get(`/api/projects/${p._id}/stats`)
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body.completionPct).toBe(50);
    });
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });
});
