import { z } from 'zod';
import { isValidDateString } from '../utils/time.js';

export const createBlackoutSchema = {
  body: z.object({
    date: z.string().refine(isValidDateString, 'Invalid date format. Expected YYYY-MM-DD'),
    roomId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid room ID').nullable().optional(),
    reason: z.string().trim().min(3, 'Reason must be at least 3 characters'),
  }),
};

export const deleteBlackoutSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid blackout ID'),
  }),
};
