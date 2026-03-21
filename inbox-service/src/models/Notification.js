const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  event: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  read: { type: Boolean, default: false },
  metadata: {
    taskId: String,
    projectId: String,
    actorId: String
  }
}, { timestamps: true });

NotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
