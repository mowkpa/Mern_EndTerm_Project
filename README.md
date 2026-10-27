# SlotSync Backend API

Backend REST API and real-time Socket.IO server for the SlotSync Smart Campus Room and Lab Booking System.

## Tech Stack
- Node.js (ES Modules, Node 18+)
- Express.js
- MongoDB / Mongoose (with partial unique compound indexes)
- Socket.IO
- Vitest & Supertest (93 tests passing)
- node-cron

## Deployment on Render
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`

## Environment Variables
- `NODE_ENV`: `production`
- `PORT`: `10000`
- `CLIENT_URL`: `https://vite-project-sandy-one.vercel.app`
- `JWT_SECRET`: 64+ char random hex string
- `ALLOW_IN_MEMORY_DB`: `true` (runs zero-configuration seeded database if no external MongoDB URI is provided)
- `MONGODB_URI`: (optional) MongoDB Atlas connection string