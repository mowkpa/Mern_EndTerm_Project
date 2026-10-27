import express from 'express';
import { join, leave, mine } from '../controllers/waitlist.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createWaitlistSchema, waitlistByIdSchema } from '../validators/waitlist.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(protect);

router.post('/', validate(createWaitlistSchema), asyncHandler(join));
router.get('/mine', asyncHandler(mine));
router.delete('/:id', validate(waitlistByIdSchema), asyncHandler(leave));

export default router;
