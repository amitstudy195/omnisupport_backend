import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a ticket title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description of the issue'],
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      enum: ['Billing', 'Technical', 'General', 'Feedback'],
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Open', 'In-Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
