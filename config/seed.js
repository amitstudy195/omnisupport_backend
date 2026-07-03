import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import Message from '../models/Message.js';
import connectDB from './db.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('Clearing existing database contents...');
    await User.deleteMany();
    await Ticket.deleteMany();
    await Message.deleteMany();

    console.log('Seeding Users...');

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Create Users
    const users = await User.create([
      {
        name: 'System Administrator',
        email: 'admin@ticket.com',
        password: hashedPassword,
        role: 'admin',
      },
      {
        name: 'Sarah Agent',
        email: 'agent1@ticket.com',
        password: hashedPassword,
        role: 'agent',
      },
      {
        name: 'Michael Agent',
        email: 'agent2@ticket.com',
        password: hashedPassword,
        role: 'agent',
      },
      {
        name: 'Alice Customer',
        email: 'customer1@ticket.com',
        password: hashedPassword,
        role: 'customer',
      },
      {
        name: 'Bob Customer',
        email: 'customer2@ticket.com',
        password: hashedPassword,
        role: 'customer',
      },
    ]);

    const admin = users[0];
    const agent1 = users[1];
    const agent2 = users[2];
    const customer1 = users[3];
    const customer2 = users[4];

    console.log('Seeding Tickets...');

    const tickets = await Ticket.create([
      {
        title: 'Unable to connect to VPS instance',
        description: 'I get a connection timeout error when trying to SSH into my node-1 instance. I have verified security groups and they look open on port 22.',
        category: 'Technical',
        priority: 'High',
        status: 'Open',
        customerId: customer1._id,
        assignedTo: null,
      },
      {
        title: 'Charged twice for invoice #4829',
        description: 'My credit card was charged twice for the renewal invoice. I have attached the transactions. Please refund the duplicate payment.',
        category: 'Billing',
        priority: 'Medium',
        status: 'In-Progress',
        customerId: customer1._id,
        assignedTo: agent1._id,
      },
      {
        title: 'How do I enable 2FA on my profile?',
        description: 'I am looking for the two-factor authentication toggle in my profile dashboard. I could not find it in Settings. Where is it located?',
        category: 'General',
        priority: 'Low',
        status: 'Resolved',
        customerId: customer2._id,
        assignedTo: agent2._id,
      },
      {
        title: 'SSL Certificate expired on staging site',
        description: 'The Let\'s Encrypt certificate on our staging site expired yesterday, throwing browser errors for our QA team. Please renew it.',
        category: 'Technical',
        priority: 'High',
        status: 'Closed',
        customerId: customer2._id,
        assignedTo: agent1._id,
      },
    ]);

    console.log('Seeding Chat Messages...');

    // Messages for Ticket 2 (In-Progress Billing issue)
    await Message.create([
      {
        ticketId: tickets[1]._id,
        senderId: customer1._id,
        senderRole: 'customer',
        message: 'Hi, I saw two charges of $49.00 on my bank statement. Can you look into this?',
      },
      {
        ticketId: tickets[1]._id,
        senderId: agent1._id,
        senderRole: 'agent',
        message: 'Hello Alice, I see both transactions in our gateway logs. It looks like a connection glitch during checkout. I have initiated a refund for the second transaction. It should reflect in 3-5 business days.',
      },
      {
        ticketId: tickets[1]._id,
        senderId: customer1._id,
        senderRole: 'customer',
        message: 'Perfect, thank you for the quick response!',
      },
    ]);

    // Messages for Ticket 3 (Resolved General issue)
    await Message.create([
      {
        ticketId: tickets[2]._id,
        senderId: customer2._id,
        senderRole: 'customer',
        message: 'Is 2FA supported yet? I want to secure my account.',
      },
      {
        ticketId: tickets[2]._id,
        senderId: agent2._id,
        senderRole: 'agent',
        message: 'Hi Bob! Yes, 2FA is supported. Navigate to Profile -> Security tab, and click Enable Authenticator App.',
      },
      {
        ticketId: tickets[2]._id,
        senderId: customer2._id,
        senderRole: 'customer',
        message: 'Found it and set it up. Thanks!',
      },
    ]);

    console.log('Database seeded successfully!');
    console.log(`Created ${users.length} Users`);
    console.log(`Created ${tickets.length} Tickets`);
    
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed database:', error.message);
    process.exit(1);
  }
};

seedData();
