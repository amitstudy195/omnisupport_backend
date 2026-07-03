import express from 'express';
import { 
  createTicket, 
  getTickets, 
  getTicketById, 
  updateTicketStatus, 
  assignTicket,
  getStats
} from '../controllers/ticketController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Secure all ticket routes

router.route('/')
  .post(createTicket)
  .get(getTickets);

// Stats route must be placed before /:id to avoid treating 'stats' as a ticket ID
router.get('/stats', authorize('admin'), getStats);

router.route('/:id')
  .get(getTicketById);

router.put('/:id/status', authorize('agent', 'admin'), updateTicketStatus);
router.put('/:id/assign', authorize('agent', 'admin'), assignTicket);

export default router;
