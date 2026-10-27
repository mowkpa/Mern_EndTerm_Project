import { Server } from 'socket.io';
import { env } from './config/env.js';

let ioInstance = null;

export const initSocket = (httpServer) => {
  const allowedOrigins = Array.from(new Set(['http://localhost:5173', 'http://127.0.0.1:5173', env.CLIENT_URL].filter(Boolean)));

  ioInstance = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  return ioInstance;
};

export const getIO = () => {
  return ioInstance;
};
