import express from 'express';
import { listRooms, getRoom, createRoom, updateRoom, deleteRoom, getRoomAvailability } from '../controllers/room.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createRoomSchema, updateRoomSchema, roomByIdSchema } from '../validators/room.validator.js';
import { availabilityQuerySchema } from '../validators/booking.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Public/authenticated room browsing & availability
router.get('/availability', protect, validate(availabilityQuerySchema), asyncHandler(getRoomAvailability));
router.get('/', protect, asyncHandler(listRooms));
router.get('/:id', protect, validate(roomByIdSchema), asyncHandler(getRoom));

// Admin management
router.post('/', protect, requireRole('admin'), validate(createRoomSchema), asyncHandler(createRoom));
router.put('/:id', protect, requireRole('admin'), validate(updateRoomSchema), asyncHandler(updateRoom));
router.delete('/:id', protect, requireRole('admin'), validate(roomByIdSchema), asyncHandler(deleteRoom));

export default router;
