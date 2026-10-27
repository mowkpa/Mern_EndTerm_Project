import mongoose from 'mongoose';
import { env } from './env.js';

let mongodInstance = null;

export const connectDB = async (uri = env.MONGODB_URI) => {
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log(`[SlotSync DB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[SlotSync DB] Primary connection to ${uri} unavailable: ${error.message}`);
    const allowFallback =
      !env.isProd ||
      process.env.ALLOW_IN_MEMORY_DB === 'true' ||
      !process.env.MONGODB_URI ||
      process.env.MONGODB_URI.includes('localhost');

    if (allowFallback) {
      try {
        console.log('[SlotSync DB] Launching embedded in-memory MongoDB for zero-configuration deployment/development...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        mongodInstance = await MongoMemoryServer.create();
        const memUri = mongodInstance.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`[SlotSync DB] Connected to embedded in-memory MongoDB at: ${memUri}`);

        // Automatically seed demo accounts, rooms, blackouts, and ~60 bookings into the in-memory database
        console.log('[SlotSync DB] Populating seeded campus demo data...');
        const { seedData } = await import('../scripts/seed.js');
        await seedData();
        console.log('[SlotSync DB] Embedded database ready with demo accounts!');

        return conn;
      } catch (fallbackError) {
        console.error(`[SlotSync DB] Fallback to in-memory MongoDB failed: ${fallbackError.message}`);
      }
    }

    if (env.isProd) {
      process.exit(1);
    }
    throw error;
  }
};
