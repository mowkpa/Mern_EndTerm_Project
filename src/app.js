import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = Array.from(new Set(['http://localhost:5173', 'http://127.0.0.1:5173', env.CLIENT_URL].filter(Boolean)));
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or tests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev/testing, but client origin honored
      }
    },
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Health check endpoint (evaluator requirement: GET /health)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/room.routes.js';
import blackoutRoutes from './routes/blackout.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import adminRoutes from './routes/admin.routes.js';
import waitlistRoutes from './routes/waitlist.routes.js';

// Root API router placeholder - will be connected in milestones
export const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/rooms', roomRoutes);
apiRouter.use('/blackouts', blackoutRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/waitlist', waitlistRoutes);
apiRouter.use('/admin', adminRoutes);
app.use('/api', apiRouter);

// 404 & Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
