import { z } from 'zod';

export const createLeaveTypeSchema = z.object({
  name: z.string({ required_error: 'Leave type name is required.' })
    .trim()
    .min(1, 'Leave type name cannot be empty.'),
  code: z.string({ required_error: 'Leave type code is required.' })
    .trim()
    .min(1, 'Leave type code cannot be empty.')
    .max(10, 'Leave type code cannot exceed 10 characters.'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateLeaveTypeSchema = z.object({
  name: z.string().trim().min(1, 'Leave type name cannot be empty.').optional(),
  code: z.string().trim().min(1, 'Leave type code cannot be empty.').max(10, 'Leave type code cannot exceed 10 characters.').optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
