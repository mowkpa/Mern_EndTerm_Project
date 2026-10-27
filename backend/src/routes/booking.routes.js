import express from 'express';
import { create, getMyBookings, getBookingById } from '../controllers/booking.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createBookingSchema, bookingByIdSchema } from '../validators/booking.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.post('/', protect, validate(createBookingSchema), asyncHandler(create));
router.get('/mine', protect, asyncHandler(getMyBookings));
router.get('/:id', protect, validate(bookingByIdSchema), asyncHandler(getBookingById));

export default router;
