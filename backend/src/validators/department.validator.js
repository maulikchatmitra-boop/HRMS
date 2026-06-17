import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string({ required_error: 'Department name is required.' })
    .trim()
    .min(1, 'Department name cannot be empty.'),
  code: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name cannot be empty.').optional(),
  code: z.string().trim().optional(),
  description: z.string().trim().optional(),
});
