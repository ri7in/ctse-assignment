const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { getMe, updateMe, getById, deleteUser, createProfile } = require('../controllers/user.controller');

const router = express.Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get own profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User profile }
 *   patch:
 *     summary: Update own profile
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               timezone: { type: string }
 *     responses:
 *       200: { description: Updated profile }
 */
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User profile }
 *       404: { description: Not found }
 *   delete:
 *     summary: Delete user (admin only)
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Admin only }
 */
router.get('/:id', protect, getById);
router.delete('/:id', protect, adminOnly, deleteUser);

// Internal — called by auth-service after register (no JWT required, internal network only)
router.post('/', createProfile);

module.exports = router;
