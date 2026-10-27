import express from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authRateLimiter } from '../middlewares/rateLimit.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.post('/register', authRateLimiter, validate(registerSchema), asyncHandler(register));
router.post('/login', authRateLimiter, validate(loginSchema), asyncHandler(login));
router.post('/logout', protect, asyncHandler(logout));
router.get('/me', protect, asyncHandler(getMe));

export default router;
