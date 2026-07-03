import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Ticket from '../models/Ticket.js';

// Helper to parse cookie string from socket handshake headers
const parseCookies = (cookieString) => {
  if (!cookieString) return {};
  return cookieString.split(';').reduce((acc, cookie) => {
    const parts = cookie.split('=');
    acc[parts[0].trim()] = (parts[1] || '').trim();
    return acc;
  }, {});
};

const socketHandler = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const cookieString = socket.handshake.headers.cookie;
      const cookies = parseCookies(cookieString);
      
      // Look for token in cookies, query parameters, or authorization headers
      let token = cookies.token;
      
      if (!token && socket.handshake.auth) {
        token = socket.handshake.auth.token;
      }
      
      if (!token && socket.handshake.query) {
        token = socket.handshake.query.token;
      }

      if (!token) {
        console.log('Socket Connection Refused: No token provided');
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt_secret_key_12345');
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user details to socket object
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket Auth Error:', error.message);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket Connected: User ${socket.user.name} (${socket.user.role}) [ID: ${socket.id}]`);

    // Join room for a specific ticket
    socket.on('joinRoom', async ({ ticketId }) => {
      if (!ticketId) return;
      
      // Perform simple validation: make sure customer owns it (unless admin/agent)
      try {
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
          socket.emit('error', { message: 'Ticket not found' });
          return;
        }

        if (socket.user.role === 'customer' && ticket.customerId.toString() !== socket.user._id.toString()) {
          socket.emit('error', { message: 'Not authorized to join this ticket room' });
          return;
        }

        socket.join(ticketId);
        console.log(`User ${socket.user.name} joined ticket room: ${ticketId}`);
        socket.emit('joinedRoom', { ticketId });
      } catch (err) {
        console.error('Error joining room:', err.message);
      }
    });

    // Leave ticket room
    socket.on('leaveRoom', ({ ticketId }) => {
      if (!ticketId) return;
      socket.leave(ticketId);
      console.log(`User ${socket.user.name} left ticket room: ${ticketId}`);
    });

    // Listen for new messages
    socket.on('sendMessage', async ({ ticketId, message }) => {
      try {
        if (!ticketId || !message || message.trim() === '') return;

        // Verify ticket status and membership
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
          return socket.emit('error', { message: 'Ticket not found' });
        }

        if (socket.user.role === 'customer' && ticket.customerId.toString() !== socket.user._id.toString()) {
          return socket.emit('error', { message: 'Not authorized to send messages to this ticket' });
        }

        // Auto-change status to In-Progress if agent responds and it was Open
        if (socket.user.role === 'agent' && ticket.status === 'Open') {
          ticket.status = 'In-Progress';
          ticket.assignedTo = socket.user._id;
          await ticket.save();
          // Emit update
          io.to(ticketId).emit('ticketStatusUpdated', ticket);
          io.emit('ticketListUpdate', ticket);
        }

        // Save message to MongoDB
        const newMessage = await Message.create({
          ticketId,
          senderId: socket.user._id,
          senderRole: socket.user.role,
          message: message.trim(),
        });

        // Populate sender info
        const populatedMessage = await Message.findById(newMessage._id)
          .populate('senderId', 'name email role');

        // Broadcast message to everyone in the room
        io.to(ticketId).emit('newMessage', populatedMessage);
      } catch (err) {
        console.error('Error handling sendMessage:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`Socket Disconnected: User ${socket.user.name} [ID: ${socket.id}]`);
    });
  });
};

export default socketHandler;
