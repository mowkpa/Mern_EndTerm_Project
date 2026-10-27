import express from 'express';
import { parsePrompt } from '../controllers/ai.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.post('/parse', protect, asyncHandler(parsePrompt));

export default router;
