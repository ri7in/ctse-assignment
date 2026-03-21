const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  recipientId: { type: String, required: true },
  content: { type: String, required: true, maxlength: 2000 },
  readAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
