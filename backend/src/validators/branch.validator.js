import { z } from 'zod';

export const createBranchSchema = z.object({
  name: z.string({ required_error: 'Branch name is required.' })
    .trim()
    .min(1, 'Branch name cannot be empty.'),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
});

export const updateBranchSchema = z.object({
  name: z.string().trim().min(1, 'Branch name cannot be empty.').optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  country: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
});
