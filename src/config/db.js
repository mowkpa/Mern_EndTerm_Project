import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async (uri = env.MONGODB_URI) => {
  try {
    const conn = await mongoose.connect(uri);
    console.log(`[SlotSync DB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[SlotSync DB] Connection error: ${error.message}`);
    if (env.isProd) {
      process.exit(1);
    }
    throw error;
  }
};
