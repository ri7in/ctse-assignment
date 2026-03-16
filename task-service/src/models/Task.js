const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  projectId: { type: String, required: true },
  assigneeId: { type: String, default: null },
  reporterId: { type: String, required: true },
  status: {
    type: String,
    enum: ['backlog', 'todo', 'in-progress', 'in-review', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  labels: [{ type: String }],
  dueDate: { type: Date, default: null },
  trackedTime: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
