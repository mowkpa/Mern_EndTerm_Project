import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { env } from '../config/env.js';
import { httpError } from '../utils/httpError.js';
import { cookieOptions, clearCookieOptions } from '../utils/cookieOptions.js';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const register = async (req, res) => {
  const { name, email, password, department } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw httpError(409, 'An account with this email already exists', 'EMAIL_EXISTS');
  }

  // Registration strictly enforces 'student' role. Body role is ignored.
  const user = await User.create({
    name,
    email,
    password,
    department: department || '',
    role: 'student',
  });

  const token = generateToken(user);
  res.cookie('token', token, cookieOptions);

  res.status(201).json({
    user,
    token, // Provided for non-browser/test convenience
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw httpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw httpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const token = generateToken(user);
  res.cookie('token', token, cookieOptions);

  res.status(200).json({
    user,
    token,
  });
};

export const logout = async (req, res) => {
  res.clearCookie('token', clearCookieOptions);
  res.status(200).json({ message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
  res.status(200).json({ user: req.user });
};
