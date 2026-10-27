import { z } from 'zod';

export const createRoomSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    building: z.string().trim().min(1, 'Building is required'),
    capacity: z.number().int().min(1, 'Capacity must be at least 1'),
    equipment: z.array(z.string()).optional().default([]),
    requiresApproval: z.boolean().optional().default(false),
    openHour: z.number().int().min(0).max(23).optional().default(8),
    closeHour: z.number().int().min(1).max(24).optional().default(20),
    description: z.string().trim().optional().default(''),
  }).refine((data) => data.closeHour > data.openHour, {
    message: 'closeHour must be greater than openHour',
    path: ['closeHour'],
  }),
};

export const updateRoomSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid room ID'),
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    building: z.string().trim().min(1).optional(),
    capacity: z.number().int().min(1).optional(),
    equipment: z.array(z.string()).optional(),
    requiresApproval: z.boolean().optional(),
    openHour: z.number().int().min(0).max(23).optional(),
    closeHour: z.number().int().min(1).max(24).optional(),
    isActive: z.boolean().optional(),
    description: z.string().trim().optional(),
  }),
};

export const roomByIdSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid room ID'),
  }),
};
