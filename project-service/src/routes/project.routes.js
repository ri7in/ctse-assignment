const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  createProject, listProjects, getProject, updateProject,
  deleteProject, addMember, removeMember, getStats
} = require('../controllers/project.controller');

const router = express.Router();

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Project created }
 *   get:
 *     summary: List my projects
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of projects }
 */
router.post('/', protect, createProject);
router.get('/', protect, listProjects);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project detail
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Project }
 *       404: { description: Not found }
 *   patch:
 *     summary: Update project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Updated project }
 *   delete:
 *     summary: Delete project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/:id', protect, getProject);
router.patch('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);

/**
 * @swagger
 * /api/projects/{id}/stats:
 *   get:
 *     summary: Get project task statistics
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Project stats }
 */
router.get('/:id/stats', protect, getStats);

/**
 * @swagger
 * /api/projects/{id}/members:
 *   post:
 *     summary: Add member to project
 *     tags: [Projects]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200: { description: Member added }
 */
router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);

module.exports = router;
