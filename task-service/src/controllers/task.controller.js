const Joi = require('joi');
const Task = require('../models/Task');
const { publish } = require('../services/kafka.producer');

const createSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(2000).optional().allow(''),
  projectId: Joi.string().required(),
  assigneeId: Joi.string().optional().allow(null),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  labels: Joi.array().items(Joi.string()).default([]),
  dueDate: Joi.date().iso().optional()
});

const updateSchema = Joi.object({
  title: Joi.string().min(2).max(200),
  description: Joi.string().max(2000).allow(''),
  status: Joi.string().valid('backlog', 'todo', 'in-progress', 'in-review', 'done'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  labels: Joi.array().items(Joi.string()),
  dueDate: Joi.date().iso().allow(null)
});

// POST /api/tasks
const createTask = async (req, res) => {
  const { error, value } = createSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }

  const task = await Task.create({ ...value, reporterId: req.user.id });

  await publish('task.created', {
    taskId: task._id.toString(),
    title: task.title,
    projectId: task.projectId,
    reporterId: task.reporterId,
    assigneeId: task.assigneeId,
    priority: task.priority,
    status: task.status
  });

  if (task.assigneeId) {
    await publish('task.assigned', {
      taskId: task._id.toString(),
      title: task.title,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      actorId: req.user.id
    });
  }

  res.status(201).json(task);
};

// GET /api/tasks
const listTasks = async (req, res) => {
  const { projectId, assigneeId, status } = req.query;
  const filter = {};
  if (projectId) filter.projectId = projectId;
  if (assigneeId) filter.assigneeId = assigneeId;
  if (status) filter.status = status;

  const tasks = await Task.find(filter).sort({ createdAt: -1 });
  res.json(tasks);
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
};

// GET /api/tasks/project/:projectId
const getByProject = async (req, res) => {
  const tasks = await Task.find({ projectId: req.params.projectId }).sort({ createdAt: -1 });
  res.json(tasks);
};

// PATCH /api/tasks/:id
const updateTask = async (req, res) => {
  const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }

  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const oldStatus = task.status;
  Object.assign(task, value);
  await task.save();

  if (value.status && value.status !== oldStatus) {
    await publish('task.status.changed', {
      taskId: task._id.toString(),
      title: task.title,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      oldStatus,
      newStatus: value.status,
      actorId: req.user.id
    });
  } else {
    await publish('task.updated', {
      taskId: task._id.toString(),
      projectId: task.projectId,
      changes: value,
      actorId: req.user.id
    });
  }

  res.json(task);
};

// PATCH /api/tasks/:id/assign
const assignTask = async (req, res) => {
  const { assigneeId } = req.body;
  if (!assigneeId) return res.status(400).json({ error: 'assigneeId is required' });

  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { $set: { assigneeId } },
    { new: true }
  );
  if (!task) return res.status(404).json({ error: 'Task not found' });

  await publish('task.assigned', {
    taskId: task._id.toString(),
    title: task.title,
    projectId: task.projectId,
    assigneeId,
    actorId: req.user.id
  });

  res.json(task);
};

// PATCH /api/tasks/:id/complete
const completeTask = async (req, res) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { $set: { status: 'done' } },
    { new: true }
  );
  if (!task) return res.status(404).json({ error: 'Task not found' });

  await publish('task.completed', {
    taskId: task._id.toString(),
    title: task.title,
    projectId: task.projectId,
    assigneeId: task.assigneeId,
    completedBy: req.user.id
  });

  res.json(task);
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  await publish('task.deleted', {
    taskId: req.params.id,
    projectId: task.projectId,
    wasCompleted: task.status === 'done',
    actorId: req.user.id
  });

  res.json({ message: 'Task deleted' });
};

module.exports = { createTask, listTasks, getTask, getByProject, updateTask, assignTask, completeTask, deleteTask };
