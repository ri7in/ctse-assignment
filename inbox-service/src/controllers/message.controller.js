const Joi = require('joi');
const Message = require('../models/Message');

const createMessageSchema = Joi.object({
  recipientId: Joi.string().required(),
  content: Joi.string().min(1).max(2000).required()
});

// GET /api/inbox/messages
const getMessages = async (req, res) => {
  const messages = await Message.find({
    $or: [{ senderId: req.user.id }, { recipientId: req.user.id }]
  }).sort({ createdAt: -1 }).limit(50);

  res.json(messages);
};

// POST /api/inbox/messages
const sendMessage = async (req, res) => {
  const { error, value } = createMessageSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }

  const message = await Message.create({ ...value, senderId: req.user.id });
  res.status(201).json(message);
};

module.exports = { getMessages, sendMessage };
