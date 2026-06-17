import { z } from 'zod';

export const createDesignationSchema = z.object({
  title: z.string({ required_error: 'Designation title is required.' })
    .trim()
    .min(1, 'Designation title cannot be empty.'),
  description: z.string().trim().optional(),
});

export const updateDesignationSchema = z.object({
  title: z.string().trim().min(1, 'Designation title cannot be empty.').optional(),
  description: z.string().trim().optional(),
});
