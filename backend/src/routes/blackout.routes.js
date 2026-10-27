import express from 'express';
import { listBlackouts, createBlackout, deleteBlackout } from '../controllers/blackout.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createBlackoutSchema, deleteBlackoutSchema } from '../validators/blackout.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.get('/', protect, asyncHandler(listBlackouts));
router.post('/', protect, requireRole('admin'), validate(createBlackoutSchema), asyncHandler(createBlackout));
router.delete('/:id', protect, requireRole('admin'), validate(deleteBlackoutSchema), asyncHandler(deleteBlackout));

export default router;
