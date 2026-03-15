const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  generatedBy: { type: String, required: true },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  totalMinutes: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Report', ReportSchema);
