const axios = require('axios');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const { data } = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    req.user = data.user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { protect };
