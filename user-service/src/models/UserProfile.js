const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  authId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  avatar: { type: String, default: null },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  timezone: { type: String, default: 'UTC' }
}, { timestamps: true });

module.exports = mongoose.model('UserProfile', UserProfileSchema);
