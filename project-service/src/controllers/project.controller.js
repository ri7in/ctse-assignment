const Joi = require('joi');
const Project = require('../models/Project');
const { publish } = require('../services/kafka.producer');

const createSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(2000).optional().allow('')
});

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  description: Joi.string().max(2000).allow(''),
  status: Joi.string().valid('active', 'completed', 'archived')
});

// POST /api/projects
const createProject = async (req, res) => {
  const { error, value } = createSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }

  const project = await Project.create({
    ...value,
    ownerId: req.user.id,
    members: [req.user.id]
  });

  await publish('project.created', {
    projectId: project._id.toString(),
    name: project.name,
    ownerId: project.ownerId,
    members: project.members
  });

  res.status(201).json(project);
};

// GET /api/projects
const listProjects = async (req, res) => {
  const projects = await Project.find({ members: req.user.id }).sort({ createdAt: -1 });
  res.json(projects);
};

// GET /api/projects/:id
const getProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!project.members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.json(project);
};

// PATCH /api/projects/:id
const updateProject = async (req, res) => {
  const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id },
    { $set: value },
    { new: true, runValidators: true }
  );
  if (!project) return res.status(404).json({ error: 'Project not found or access denied' });

  await publish('project.updated', {
    projectId: project._id.toString(),
    changes: value,
    actorId: req.user.id
  });

  res.json(project);
};

// DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
  if (!project) return res.status(404).json({ error: 'Project not found or access denied' });

  await publish('project.deleted', {
    projectId: req.params.id,
    actorId: req.user.id
  });

  res.json({ message: 'Project deleted' });
};

// POST /api/projects/:id/members
const addMember = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id },
    { $addToSet: { members: userId } },
    { new: true }
  );
  if (!project) return res.status(404).json({ error: 'Project not found or access denied' });

  await publish('member.added', {
    projectId: project._id.toString(),
    projectName: project.name,
    userId,
    addedBy: req.user.id
  });

  res.json(project);
};

// DELETE /api/projects/:id/members/:userId
const removeMember = async (req, res) => {
  const { userId } = req.params;

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id },
    { $pull: { members: userId } },
    { new: true }
  );
  if (!project) return res.status(404).json({ error: 'Project not found or access denied' });

  await publish('member.removed', {
    projectId: project._id.toString(),
    userId,
    removedBy: req.user.id
  });

  res.json(project);
};

// GET /api/projects/:id/stats
const getStats = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!project.members.includes(req.user.id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const completionPct = project.totalTasks > 0
    ? Math.round((project.completedTasks / project.totalTasks) * 100)
    : 0;

  res.json({
    projectId: project._id,
    totalTasks: project.totalTasks,
    completedTasks: project.completedTasks,
    completionPct,
    lastReportAt: project.lastReportAt
  });
};

module.exports = { createProject, listProjects, getProject, updateProject, deleteProject, addMember, removeMember, getStats };
