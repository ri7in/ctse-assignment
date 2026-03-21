const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tasktracker-auth-test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Auth Service', () => {
  const user = { email: 'test@example.com', password: 'Test1234!', name: 'Test User' };
  let token;

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns token', async () => {
      const res = await request(app).post('/api/auth/register').send(user);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(user.email);
      token = res.body.token;
    });

    it('rejects duplicate email', async () => {
      const res = await request(app).post('/api/auth/register').send(user);
      expect(res.status).toBe(409);
    });

    it('rejects invalid payload', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'bad' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: user.email,
        password: user.password
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('rejects wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: user.email,
        password: 'wrongpassword'
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/verify', () => {
    it('validates a good token', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });

    it('rejects a bad token', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer badtoken');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
