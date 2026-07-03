import Message from '../models/Message.js';
import Ticket from '../models/Ticket.js';

// @desc    Get all messages for a ticket
// @route   GET /api/messages/:ticketId
// @access  Private
export const getTicketMessages = async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Check if ticket exists
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Access control: Customer can only view their own ticket's messages
    if (req.user.role === 'customer' && ticket.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view messages for this ticket' });
    }

    // Fetch messages
    const messages = await Message.find({ ticketId })
      .populate('senderId', 'name email role')
      .sort({ createdAt: 1 }); // Sort in chronological order

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
