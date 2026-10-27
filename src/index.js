import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js';
import { startScheduler } from './services/scheduler.service.js';

const httpServer = http.createServer(app);
const io = initSocket(httpServer);

const startServer = async () => {
  try {
    await connectDB();
    startScheduler();
    const port = env.PORT || 8084;
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`[SlotSync Server] Running on http://0.0.0.0:${port} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('[SlotSync Server] Failed to start:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { httpServer, io };
