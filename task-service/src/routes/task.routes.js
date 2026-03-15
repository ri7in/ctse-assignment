const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  createTask, listTasks, getTask, getByProject,
  updateTask, assignTask, completeTask, deleteTask
} = require('../controllers/task.controller');

const router = express.Router();

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *   get:
 *     summary: List tasks (filter by projectId, assigneeId, status)
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 */
router.post('/', protect, createTask);
router.get('/', protect, listTasks);

/**
 * @swagger
 * /api/tasks/project/{projectId}:
 *   get:
 *     summary: Get all tasks for a project
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/project/:projectId', protect, getByProject);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task detail
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *   patch:
 *     summary: Update task fields
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 *   delete:
 *     summary: Delete task
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/:id', protect, getTask);
router.patch('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);

/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   patch:
 *     summary: Assign task to user
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/:id/assign', protect, assignTask);

/**
 * @swagger
 * /api/tasks/{id}/complete:
 *   patch:
 *     summary: Mark task as complete
 *     tags: [Tasks]
 *     security: [{ bearerAuth: [] }]
 */
router.patch('/:id/complete', protect, completeTask);

module.exports = router;
