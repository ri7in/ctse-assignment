const Joi = require('joi');
const UserProfile = require('../models/UserProfile');
const { publish } = require('../services/kafka.producer');

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  avatar: Joi.string().uri().allow(null),
  timezone: Joi.string()
});

// GET /api/users/me
const getMe = async (req, res) => {
  const profile = await UserProfile.findOne({ authId: req.user.id });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
};

// PATCH /api/users/me
const updateMe = async (req, res) => {
  const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }

  const profile = await UserProfile.findOneAndUpdate(
    { authId: req.user.id },
    { $set: value },
    { new: true, runValidators: true }
  );
  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  await publish('tasky.user-events', 'user.updated', { userId: profile._id.toString(), changes: value });
  res.json(profile);
};

// GET /api/users/:id
const getById = async (req, res) => {
  const profile = await UserProfile.findById(req.params.id);
  if (!profile) return res.status(404).json({ error: 'User not found' });
  res.json(profile);
};

// DELETE /api/users/:id  (admin only)
const deleteUser = async (req, res) => {
  const profile = await UserProfile.findByIdAndDelete(req.params.id);
  if (!profile) return res.status(404).json({ error: 'User not found' });

  await publish('tasky.user-events', 'user.deleted', { userId: req.params.id });
  res.json({ message: 'User deleted' });
};

// POST /api/users  (called internally after register to create profile)
const createProfile = async (req, res) => {
  const { authId, email, name, role } = req.body;
  const profile = await UserProfile.create({ authId, email, name, role });
  await publish('tasky.user-events', 'user.registered', {
    userId: profile._id.toString(),
    email,
    name,
    role
  });
  res.status(201).json(profile);
};

module.exports = { getMe, updateMe, getById, deleteUser, createProfile };
