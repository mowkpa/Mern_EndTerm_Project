import express from 'express';
import { listUsers, updateUserRole } from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(protect, requireRole('admin'));

router.get('/', asyncHandler(listUsers));
router.patch('/:id/role', asyncHandler(updateUserRole));
router.put('/:id/role', asyncHandler(updateUserRole));

export default router;
