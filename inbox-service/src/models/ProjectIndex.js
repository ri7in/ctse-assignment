const mongoose = require('mongoose');

// Materialized view of {projectId → ownerId, members[]} kept in sync
// from project-events. Lets task-event handlers fan out notifications
// to project members without a cross-service HTTP call.
const ProjectIndexSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true, index: true },
  ownerId:   { type: String, required: true },
  members:   { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('ProjectIndex', ProjectIndexSchema);
