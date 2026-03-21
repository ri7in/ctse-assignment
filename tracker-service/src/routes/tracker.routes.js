const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  createEntry, listEntries, updateEntry, deleteEntry,
  getDashboard, getProjectReport, getUserReport, getMilestones
} = require('../controllers/tracker.controller');

const router = express.Router();

/**
 * @swagger
 * /api/tracker/entries:
 *   post:
 *     summary: Log a time entry manually
 *     tags: [Tracker]
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     summary: List time entries (filter by taskId, userId, from, to)
 *     tags: [Tracker]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/entries', protect, createEntry);
router.get('/entries', protect, listEntries);

/**
 * @swagger
 * /api/tracker/entries/{id}:
 *   patch:
 *     summary: Update time entry
 *     tags: [Tracker]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Delete time entry
 *     tags: [Tracker]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/entries/:id', protect, updateEntry);
router.delete('/entries/:id', protect, deleteEntry);

/**
 * @swagger
 * /api/tracker/dashboard:
 *   get:
 *     summary: Get weekly dashboard stats
 *     tags: [Tracker]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/dashboard', protect, getDashboard);

/**
 * @swagger
 * /api/tracker/reports/project/{id}:
 *   get:
 *     summary: Generate project time/progress report
 *     tags: [Tracker]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/reports/project/:id', protect, getProjectReport);

/**
 * @swagger
 * /api/tracker/reports/user/{id}:
 *   get:
 *     summary: Get user productivity report
 *     tags: [Tracker]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/reports/user/:id', protect, getUserReport);

/**
 * @swagger
 * /api/tracker/milestones/{projectId}:
 *   get:
 *     summary: Get milestone progress for project
 *     tags: [Tracker]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/milestones/:projectId', protect, getMilestones);

module.exports = router;
