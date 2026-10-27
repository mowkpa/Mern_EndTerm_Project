import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProd,
  PORT: parseInt(process.env.PORT || '8084', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/slotsync',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_key_minimum_64_characters_long_for_slotsync_testing_purposes_only',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  GRACE_MINUTES: parseInt(process.env.GRACE_MINUTES || '15', 10),
  MAX_ADVANCE_DAYS: parseInt(process.env.MAX_ADVANCE_DAYS || '14', 10),
  QUOTA_STUDENT: parseInt(process.env.QUOTA_STUDENT || '3', 10),
  QUOTA_FACULTY: parseInt(process.env.QUOTA_FACULTY || '6', 10),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'claude-haiku-5-5',
};
