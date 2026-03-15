const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  ownerId: { type: String, required: true },
  members: [{ type: String }],
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  totalTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  lastReportAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
