import { z } from 'zod';

export const createWorkLocationSchema = z.object({
  name: z.string({ required_error: 'Work location name is required.' })
    .trim()
    .min(1, 'Work location name cannot be empty.'),
  description: z.string().trim().optional(),
});

export const updateWorkLocationSchema = z.object({
  name: z.string().trim().min(1, 'Work location name cannot be empty.').optional(),
  description: z.string().trim().optional(),
});
