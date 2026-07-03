import Ticket from '../models/Ticket.js';
import User from '../models/User.js';

// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Private (Customer only, or others too, but mainly Customer)
export const createTicket = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    const ticket = await Ticket.create({
      title,
      description,
      category,
      priority: priority || 'Medium',
      customerId: req.user._id,
    });

    // Populate customer info for display
    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('customerId', 'name email role')
      .populate('assignedTo', 'name email role');

    // Real-time global notification for Admins/Agents
    const io = req.app.get('io');
    if (io) {
      io.emit('newTicketAlert', populatedTicket);
    }

    res.status(201).json({
      success: true,
      ticket: populatedTicket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all tickets (Filtered by role)
// @route   GET /api/tickets
// @access  Private
export const getTickets = async (req, res) => {
  try {
    let query = {};

    // Customers can only see their own tickets
    if (req.user.role === 'customer') {
      query.customerId = req.user._id;
    }
    // Agents can see tickets assigned to them OR unassigned tickets in the queue
    else if (req.user.role === 'agent') {
      const { filter } = req.query; // 'assigned', 'unassigned', or 'all'
      if (filter === 'assigned') {
        query.assignedTo = req.user._id;
      } else if (filter === 'unassigned') {
        query.assignedTo = null;
      } else {
        // Show assigned to them OR unassigned
        query.$or = [{ assignedTo: req.user._id }, { assignedTo: null }];
      }
    }
    // Admins see all tickets

    const tickets = await Ticket.find(query)
      .populate('customerId', 'name email role')
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single ticket details
// @route   GET /api/tickets/:id
// @access  Private
export const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('customerId', 'name email role')
      .populate('assignedTo', 'name email role');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Access control: customer must own the ticket
    if (req.user.role === 'customer' && ticket.customerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this ticket' });
    }

    res.status(200).json({
      success: true,
      ticket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update ticket status
// @route   PUT /api/tickets/:id/status
// @access  Private (Agent / Admin)
export const updateTicketStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Open', 'In-Progress', 'Resolved', 'Closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Agents can only update status if it is assigned to them
    if (req.user.role === 'agent' && (!ticket.assignedTo || ticket.assignedTo.toString() !== req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not authorized: Ticket is not assigned to you' });
    }

    ticket.status = status;
    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('customerId', 'name email role')
      .populate('assignedTo', 'name email role');

    // Notify ticket room about status update
    const io = req.app.get('io');
    if (io) {
      io.to(ticket._id.toString()).emit('ticketStatusUpdated', updatedTicket);
    }

    res.status(200).json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign ticket to agent
// @route   PUT /api/tickets/:id/assign
// @access  Private (Agent / Admin)
export const assignTicket = async (req, res) => {
  try {
    const { agentId } = req.body;
    let ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Agent can self-assign if it is currently unassigned
    if (req.user.role === 'agent') {
      if (ticket.assignedTo) {
        return res.status(400).json({ success: false, message: 'Ticket is already assigned to another agent' });
      }
      ticket.assignedTo = req.user._id;
      ticket.status = 'In-Progress'; // Auto-progress to In-Progress
    } 
    // Admin can assign to any agent
    else if (req.user.role === 'admin') {
      if (!agentId) {
        return res.status(400).json({ success: false, message: 'Please provide an agentId' });
      }
      const agent = await User.findById(agentId);
      if (!agent || agent.role !== 'agent') {
        return res.status(400).json({ success: false, message: 'Invalid agent ID' });
      }
      ticket.assignedTo = agentId;
      ticket.status = 'In-Progress';
    }

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate('customerId', 'name email role')
      .populate('assignedTo', 'name email role');

    // Notify the room and also send general update
    const io = req.app.get('io');
    if (io) {
      io.to(ticket._id.toString()).emit('ticketAssigned', updatedTicket);
      // Emit global ticket update to update dashboards live
      io.emit('ticketListUpdate', updatedTicket);
    }

    res.status(200).json({
      success: true,
      ticket: updatedTicket,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dashboard metrics / statistics
// @route   GET /api/tickets/stats
// @access  Private (Admin only)
export const getStats = async (req, res) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const openTickets = await Ticket.countDocuments({ status: 'Open' });
    const inProgressTickets = await Ticket.countDocuments({ status: 'In-Progress' });
    const resolvedTickets = await Ticket.countDocuments({ status: 'Resolved' });
    const closedTickets = await Ticket.countDocuments({ status: 'Closed' });

    const priorityHigh = await Ticket.countDocuments({ priority: 'High' });
    const priorityMedium = await Ticket.countDocuments({ priority: 'Medium' });
    const priorityLow = await Ticket.countDocuments({ priority: 'Low' });

    const agentsCount = await User.countDocuments({ role: 'agent' });
    const customersCount = await User.countDocuments({ role: 'customer' });

    res.status(200).json({
      success: true,
      stats: {
        tickets: {
          total: totalTickets,
          open: openTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          closed: closedTickets,
        },
        priority: {
          high: priorityHigh,
          medium: priorityMedium,
          low: priorityLow,
        },
        users: {
          agents: agentsCount,
          customers: customersCount,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
