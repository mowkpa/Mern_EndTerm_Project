import { z } from 'zod';
import { isValidDateString } from '../utils/time.js';

export const createWaitlistSchema = {
  body: z.object({
    roomId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid room ID'),
    date: z.string().refine(isValidDateString, 'Invalid date format. Expected YYYY-MM-DD'),
    slot: z.number().int().min(0).max(23),
  }),
};

export const waitlistByIdSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid waitlist ID'),
  }),
};
