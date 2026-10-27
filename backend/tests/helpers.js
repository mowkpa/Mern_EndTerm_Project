import jwt from 'jsonwebtoken';
import { User } from '../src/models/user.model.js';
import { env } from '../config/env.js';

export const createTestUser = async (overrides = {}) => {
  const email = overrides.email || `user_${Date.now()}_${Math.random().toString(36).substring(7)}@slotsync.demo`;
  const user = await User.create({
    name: 'Test User',
    email,
    password: 'Password123!',
    role: 'student',
    department: 'Computer Science',
    ...overrides,
  });
  return user;
};

export const createAuthToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};
