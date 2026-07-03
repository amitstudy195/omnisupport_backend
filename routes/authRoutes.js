import express from 'express';
import { register, login, logout, getMe, getAgents } from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.get('/agents', protect, authorize('admin'), getAgents);

export default router;
