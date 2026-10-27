import { z } from 'zod';
import { isValidDateString } from '../utils/time.js';

export const createBookingSchema = {
  body: z.object({
    roomId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid room ID'),
    date: z.string().refine(isValidDateString, 'Invalid date format. Expected YYYY-MM-DD'),
    slot: z.number().int().min(0).max(23),
    purpose: z.string().trim().min(3, 'Purpose must be at least 3 characters').max(200, 'Purpose cannot exceed 200 characters'),
  }),
};

export const availabilityQuerySchema = {
  query: z.object({
    date: z.string().refine(isValidDateString, 'Invalid date format. Expected YYYY-MM-DD'),
    startHour: z.string().regex(/^\d+$/).transform(Number).optional(),
    endHour: z.string().regex(/^\d+$/).transform(Number).optional(),
    capacity: z.string().regex(/^\d+$/).transform(Number).optional(),
    equipment: z.string().optional(),
  }),
};

export const bookingByIdSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid booking ID'),
  }),
};
