import express from 'express';
import { getApprovals } from '../controllers/booking.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(protect, requireRole('admin'));

router.get('/approvals', asyncHandler(getApprovals));

export default router;
