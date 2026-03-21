const Notification = require('../models/Notification');
const { publish } = require('../services/kafka.producer');

// GET /api/inbox/notifications
const getNotifications = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments({ userId: req.user.id });

  res.json({ notifications, total, page, pages: Math.ceil(total / limit) });
};

// GET /api/inbox/unread-count
const getUnreadCount = async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user.id, read: false });
  res.json({ unreadCount: count });
};

// PATCH /api/inbox/notifications/:id/read
const markRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { $set: { read: true } },
    { new: true }
  );
  if (!notification) return res.status(404).json({ error: 'Notification not found' });

  await publish('notification.read', { notificationId: req.params.id, userId: req.user.id });
  res.json(notification);
};

// PATCH /api/inbox/notifications/read-all
const markAllRead = async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
  res.json({ message: 'All notifications marked as read' });
};

// DELETE /api/inbox/notifications/:id
const dismissNotification = async (req, res) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
  if (!notification) return res.status(404).json({ error: 'Notification not found' });

  await publish('notification.dismissed', { notificationId: req.params.id, userId: req.user.id });
  res.json({ message: 'Notification dismissed' });
};

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead, dismissNotification };
