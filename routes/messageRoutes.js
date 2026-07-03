import express from 'express';
import { getTicketMessages } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:ticketId', protect, getTicketMessages);

export default router;
