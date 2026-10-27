import express from 'express';
import {
  listNotifications,
  markAllAsRead,
  markAsRead,
} from '../controllers/notification.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.use(protect);

router.get('/', asyncHandler(listNotifications));
router.patch('/read-all', asyncHandler(markAllAsRead));
router.patch('/:id/read', asyncHandler(markAsRead));

export default router;
