import { z } from 'zod';

export const createShiftSchema = z.object({
  name: z.string({ required_error: 'Shift name is required.' })
    .trim()
    .min(1, 'Shift name cannot be empty.'),
  startTime: z.string({ required_error: 'Start time is required.' })
    .trim()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM).'),
  endTime: z.string({ required_error: 'End time is required.' })
    .trim()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM).'),
  description: z.string().trim().optional(),
});

export const updateShiftSchema = z.object({
  name: z.string().trim().min(1, 'Shift name cannot be empty.').optional(),
  startTime: z.string().trim().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM).').optional(),
  endTime: z.string().trim().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM).').optional(),
  description: z.string().trim().optional(),
});
