const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  getNotifications, getUnreadCount, markRead, markAllRead, dismissNotification
} = require('../controllers/notification.controller');
const { getMessages, sendMessage } = require('../controllers/message.controller');

const router = express.Router();

/**
 * @swagger
 * /api/inbox/notifications:
 *   get:
 *     summary: Get user notifications (paginated)
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Notifications list }
 */
router.get('/notifications', protect, getNotifications);

/**
 * @swagger
 * /api/inbox/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
router.get('/unread-count', protect, getUnreadCount);

/**
 * @swagger
 * /api/inbox/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/notifications/read-all', protect, markAllRead);

/**
 * @swagger
 * /api/inbox/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/notifications/:id/read', protect, markRead);

/**
 * @swagger
 * /api/inbox/notifications/{id}:
 *   delete:
 *     summary: Dismiss (delete) a notification
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 */
router.delete('/notifications/:id', protect, dismissNotification);

/**
 * @swagger
 * /api/inbox/messages:
 *   get:
 *     summary: Get team messages
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Send a message to a teammate
 *     tags: [Inbox]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/messages', protect, getMessages);
router.post('/messages', protect, sendMessage);

module.exports = router;
