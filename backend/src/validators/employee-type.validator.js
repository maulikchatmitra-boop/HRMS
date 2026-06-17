import { z } from 'zod';

export const createEmployeeTypeSchema = z.object({
  name: z.string({ required_error: 'Employee type name is required.' })
    .trim()
    .min(1, 'Employee type name cannot be empty.'),
  description: z.string().trim().optional(),
});

export const updateEmployeeTypeSchema = z.object({
  name: z.string().trim().min(1, 'Employee type name cannot be empty.').optional(),
  description: z.string().trim().optional(),
});
