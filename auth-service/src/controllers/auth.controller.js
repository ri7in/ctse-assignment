const jwt = require('jsonwebtoken');
const Joi = require('joi');
const AuthUser = require('../models/AuthUser');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required(),
  role: Joi.string().valid('admin', 'member').default('member')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// POST /api/auth/register
const register = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }

  const exists = await AuthUser.findOne({ email: value.email });
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const user = await AuthUser.create(value);
  const token = signToken(user);

  res.status(201).json({
    token,
    user: { id: user._id, email: user.email, name: user.name, role: user.role }
  });
};

// POST /api/auth/login
const login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: 'Validation failed', details: error.details.map((d) => d.message) });
  }

  const user = await AuthUser.findOne({ email: value.email }).select('+password');
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await user.comparePassword(value.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user);

  res.json({
    token,
    user: { id: user._id, email: user.email, name: user.name, role: user.role }
  });
};

// GET /api/auth/verify
const verify = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: { id: decoded.id, email: decoded.email, role: decoded.role } });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { register, login, verify };
