# OmniSupport — Real-Time Support Ticket System

OmniSupport is a full-stack real-time helpdesk application built for customer support workflows. It includes distinct dashboards for customers, agents, and admins, with live ticket creation, agent assignment, chat, and ticket auditing.

## Features
- Customer ticket submission with category and priority selection
- Agent dashboard for claiming tickets, updating status, and chatting with customers
- Admin dashboard for monitoring ticket audit, customer progress, and system status
- Real-time updates using Socket.IO
- Authentication and role-based access control
- Responsive interface built with React and Tailwind CSS

## Architecture
- `backend/` — Express server with MongoDB, authentication, and Socket.IO real-time support
- `frontend/` — React + Vite application that consumes backend APIs and socket events

## Getting Started

### Backend
1. Open a terminal in `backend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your database and JWT settings, for example:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/omnisupport
   JWT_SECRET=your-secret
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend
1. Open a terminal in `frontend/`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the local Vite URL shown in the terminal

## Key Pages
- `/login` — User login page
- `/register` — Customer registration page
- `/customer` — Customer dashboard with ticket creation and ticket history
- `/agent` — Agent dashboard for claiming and responding to tickets
- `/admin` — Admin dashboard for ticket auditing and system monitoring

## Technologies
- Frontend: React, Vite, Tailwind CSS, React Router, Socket.IO Client
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, Socket.IO

## Notes
- Ensure the backend server is running before using the frontend app.
- The app relies on secure cookies for session management, so use the same base URL for frontend and backend during local testing.
