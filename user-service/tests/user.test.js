const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const UserProfile = require('../src/models/UserProfile');

// Mock Kafka producer to avoid real broker dependency in tests
jest.mock('../src/services/kafka.producer', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined)
}));

// Mock auth middleware to avoid calling auth-service
jest.mock('../src/middleware/auth.middleware', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 'test-auth-id', email: 'test@example.com', role: 'member' };
    next();
  },
  adminOnly: (req, _res, next) => next()
}));

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tasktracker-users-test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('User Service', () => {
  beforeEach(async () => {
    await UserProfile.deleteMany({});
  });

  describe('POST /api/users (create profile)', () => {
    it('creates a user profile', async () => {
      const res = await request(app).post('/api/users').send({
        authId: 'test-auth-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member'
      });
      expect(res.status).toBe(201);
      expect(res.body.email).toBe('test@example.com');
    });
  });

  describe('GET /api/users/me', () => {
    it('returns own profile', async () => {
      await UserProfile.create({
        authId: 'test-auth-id',
        email: 'test@example.com',
        name: 'Test User'
      });
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('test@example.com');
    });

    it('returns 404 when profile does not exist', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('updates own profile', async () => {
      await UserProfile.create({
        authId: 'test-auth-id',
        email: 'test@example.com',
        name: 'Test User'
      });
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', 'Bearer mocktoken')
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });
});
