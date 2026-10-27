import { Server } from 'socket.io';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { env } from './config/env.js';
import { User } from './models/user.model.js';

let ioInstance = null;

export const initSocket = (httpServer) => {
  const allowedOrigins = Array.from(
    new Set([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://vite-project-sandy-one.vercel.app',
      env.CLIENT_URL,
    ].filter(Boolean))
  );

  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    },
  });

  // Authentication middleware for socket connections
  ioInstance.use(async (socket, next) => {
    try {
      let token = null;

      // 1. Try cookie
      const cookieHeader = socket.handshake.headers.cookie;
      if (cookieHeader) {
        const parsedCookies = cookie.parse(cookieHeader);
        token = parsedCookies.token;
      }

      // 2. Try auth payload or authorization header (useful for dev/test tools)
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }
      if (!token && socket.handshake.headers.authorization?.startsWith('Bearer ')) {
        token = socket.handshake.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('Authentication required: user not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication required: invalid session'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const user = socket.user;
    if (!user) return;

    // Join private user room
    socket.join(`user:${user._id.toString()}`);

    // Admins join the global admins room for approval broadcasts
    if (user.role === 'admin') {
      socket.join('admins');
    }

    // Subscribe to date-specific availability changes
    socket.on('availability:watch', (data) => {
      if (data?.date) {
        socket.join(`date:${data.date}`);
      }
    });

    socket.on('availability:unwatch', (data) => {
      if (data?.date) {
        socket.leave(`date:${data.date}`);
      }
    });
  });

  return ioInstance;
};

export const getIO = () => {
  return ioInstance;
};
