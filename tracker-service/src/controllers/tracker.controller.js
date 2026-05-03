const Joi = require('joi');
const TimeEntry = require('../models/TimeEntry');
const Report = require('../models/Report');
const { publish } = require('../services/kafka.producer');

const createEntrySchema = Joi.object({
  taskId: Joi.string().required(),
  projectId: Joi.string().required(),
  description: Joi.string().max(500).optional().allow(''),
  startedAt: Joi.date().iso().required(),
  endedAt: Joi.date().iso().optional(),
  duration: Joi.number().integer().min(0).optional()
});

// POST /api/tracker/entries
const createEntry = async (req, res) => {
  const { error, value } = createEntrySchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }

  if (value.startedAt && value.endedAt && !value.duration) {
    value.duration = Math.round((new Date(value.endedAt) - new Date(value.startedAt)) / 60000);
  }

  const entry = await TimeEntry.create({ ...value, userId: req.user.id });

  await publish('timeEntry.logged', {
    entryId: entry._id.toString(),
    taskId: entry.taskId,
    projectId: entry.projectId,
    userId: entry.userId,
    duration: entry.duration
  });

  res.status(201).json(entry);
};

// GET /api/tracker/entries
const listEntries = async (req, res) => {
  const { taskId, userId, from, to } = req.query;
  const filter = {};
  if (taskId) filter.taskId = taskId;
  if (userId) filter.userId = userId;
  if (from || to) {
    filter.startedAt = {};
    if (from) filter.startedAt.$gte = new Date(from);
    if (to) filter.startedAt.$lte = new Date(to);
  }
  const entries = await TimeEntry.find(filter).sort({ startedAt: -1 });
  res.json(entries);
};

// PATCH /api/tracker/entries/:id
const updateEntry = async (req, res) => {
  const entry = await TimeEntry.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!entry) return res.status(404).json({ error: 'Time entry not found' });
  res.json(entry);
};

// DELETE /api/tracker/entries/:id
const deleteEntry = async (req, res) => {
  const entry = await TimeEntry.findByIdAndDelete(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Time entry not found' });

  await publish('timeEntry.deleted', {
    entryId: entry._id.toString(),
    taskId: entry.taskId,
    duration: entry.duration
  });

  res.json({ message: 'Time entry deleted' });
};

// GET /api/tracker/dashboard
const getDashboard = async (req, res) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const entries = await TimeEntry.find({
    userId: req.user.id,
    startedAt: { $gte: sevenDaysAgo }
  });

  // Group by day
  const dailyMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = { date: key, totalMinutes: 0, entryCount: 0 };
  }

  for (const entry of entries) {
    const key = entry.startedAt.toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].totalMinutes += entry.duration;
      dailyMap[key].entryCount += 1;
    }
  }

  res.json({ dailyStats: Object.values(dailyMap) });
};

// GET /api/tracker/reports/project/:id
const getProjectReport = async (req, res) => {
  const { id: projectId } = req.params;

  const entries = await TimeEntry.find({ projectId });
  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);

  const report = await Report.create({
    projectId,
    generatedBy: req.user.id,
    periodStart: entries.length ? entries[entries.length - 1].startedAt : new Date(),
    periodEnd: new Date(),
    totalMinutes,
    tasksCompleted: 0,
    data: { entryCount: entries.length }
  });

  await publish('report.generated', {
    reportId: report._id.toString(),
    projectId,
    projectName: '',
    generatedBy: req.user.id,
    totalMinutes,
    tasksCompleted: 0
  });

  res.json(report);
};

// GET /api/tracker/reports/user/:id
const getUserReport = async (req, res) => {
  const entries = await TimeEntry.find({ userId: req.params.id });
  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
  res.json({ userId: req.params.id, totalMinutes, entryCount: entries.length });
};

// GET /api/tracker/milestones/:projectId
const getMilestones = async (req, res) => {
  const entries = await TimeEntry.find({ projectId: req.params.projectId });
  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
  res.json({ projectId: req.params.projectId, totalMinutes });
};

module.exports = {
  createEntry, listEntries, updateEntry, deleteEntry,
  getDashboard, getProjectReport, getUserReport, getMilestones
};
