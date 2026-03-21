const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Notification = require('../src/models/Notification');

jest.mock('../src/services/kafka.producer', () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/consumers/kafka.consumer', () => ({
  startConsumer: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/config/firebase', () => ({
  initFirebase: jest.fn(),
  pushNotification: jest.fn().mockResolvedValue(undefined),
  deleteUserNotifications: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../src/middleware/auth.middleware', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 'user-1', email: 'user@example.com', role: 'member' };
    next();
  }
}));

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tasktracker-inbox-test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('Inbox Service', () => {
  beforeEach(async () => {
    await Notification.deleteMany({});
  });

  describe('GET /api/inbox/notifications', () => {
    it('returns paginated notifications', async () => {
      await Notification.create({
        userId: 'user-1',
        event: 'task.assigned',
        title: 'New task assigned'
      });
      const res = await request(app)
        .get('/api/inbox/notifications')
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });
  });

  describe('GET /api/inbox/unread-count', () => {
    it('returns unread count', async () => {
      await Notification.create({ userId: 'user-1', event: 'task.assigned', title: 'N1', read: false });
      await Notification.create({ userId: 'user-1', event: 'task.completed', title: 'N2', read: true });
      const res = await request(app)
        .get('/api/inbox/unread-count')
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(1);
    });
  });

  describe('PATCH /api/inbox/notifications/:id/read', () => {
    it('marks notification as read', async () => {
      const n = await Notification.create({ userId: 'user-1', event: 'task.assigned', title: 'N3' });
      const res = await request(app)
        .patch(`/api/inbox/notifications/${n._id}/read`)
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
      expect(res.body.read).toBe(true);
    });
  });

  describe('PATCH /api/inbox/notifications/read-all', () => {
    it('marks all as read', async () => {
      await Notification.create([
        { userId: 'user-1', event: 'e1', title: 'N4' },
        { userId: 'user-1', event: 'e2', title: 'N5' }
      ]);
      const res = await request(app)
        .patch('/api/inbox/notifications/read-all')
        .set('Authorization', 'Bearer mocktoken');
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/inbox/notifications/:id', () => {
    it('dismisses a notification', async () => {
      const n = await Notification.create({ userId: 'user-1', event: 'e3', title: 'N6' });
      const res = await request(app)
        .delete(`/api/inbox/notifications/${n._id}`)
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
