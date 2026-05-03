const express = require('express');
const Project = require('../models/Project');

const router = express.Router();

// Service-to-service routes — gated by a shared internal token (JWT_SECRET,
// which all services already have) sent in the X-Internal-Token header.
// Reachable only from inside the docker network in any case (these ports
// are not published to the host or to the internet).
const requireInternalToken = (req, res, next) => {
  const token = req.header('X-Internal-Token');
  if (!process.env.JWT_SECRET || token !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

router.use(requireInternalToken);

// GET /internal/projects → minimal snapshot for materialized-view consumers.
router.get('/projects', async (_req, res) => {
  const projects = await Project.find({}, { _id: 1, ownerId: 1, members: 1 }).lean();
  res.json(projects.map((p) => ({ projectId: p._id.toString(), ownerId: p.ownerId, members: p.members })));
});

// GET /internal/projects/:id → on-demand single-project snapshot.
router.get('/projects/:id', async (req, res) => {
  const p = await Project.findById(req.params.id, { _id: 1, ownerId: 1, members: 1 }).lean();
  if (!p) return res.status(404).json({ error: 'Project not found' });
  res.json({ projectId: p._id.toString(), ownerId: p.ownerId, members: p.members });
});

module.exports = router;
