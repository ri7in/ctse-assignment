const mongoose = require('mongoose');

const TimeEntrySchema = new mongoose.Schema({
  taskId: { type: String, required: true },
  projectId: { type: String, required: true },
  userId: { type: String, required: true },
  description: { type: String, default: '' },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 },  // minutes
  completed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('TimeEntry', TimeEntrySchema);
