const Notification = require('../models/Notification');
const { publish } = require('./kafka.producer');
const { pushNotification } = require('../config/firebase');

const createNotification = async ({ userId, event, title, body = '', metadata = {} }) => {
  const notification = await Notification.create({ userId, event, title, body, metadata });

  // Push to Firebase for real-time frontend update
  await pushNotification(userId, notification._id.toString(), {
    event,
    title,
    body,
    read: false,
    createdAt: notification.createdAt.toISOString(),
    metadata
  });

  // Publish to inbox-events topic (audit/extensibility)
  await publish('notification.sent', {
    notificationId: notification._id.toString(),
    userId,
    event,
    title
  });

  return notification;
};

module.exports = { createNotification };
