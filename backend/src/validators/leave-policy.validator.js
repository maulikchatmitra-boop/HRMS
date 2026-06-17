import { z } from 'zod';

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

const leaveAllocationSchema = z.object({
  leaveTypeId: z.string({ required_error: 'Leave Type ID is required.' })
    .regex(mongoIdRegex, 'Invalid Leave Type ID format.'),
  annualQuota: z.number({ required_error: 'Annual quota is required.' })
    .min(0, 'Annual quota must be a non-negative number.'),
});

export const createLeavePolicySchema = z.object({
  policyName: z.string({ required_error: 'Policy name is required.' })
    .trim()
    .min(1, 'Policy name cannot be empty.'),
  description: z.string().trim().optional(),
  leaveAllocations: z.array(leaveAllocationSchema, {
    required_error: 'Leave allocations are required.',
  }).min(1, 'At least one leave allocation is required.'),
  status: z.enum(['active', 'inactive']).optional(),
});

export const updateLeavePolicySchema = z.object({
  policyName: z.string().trim().min(1, 'Policy name cannot be empty.').optional(),
  description: z.string().trim().optional(),
  leaveAllocations: z.array(leaveAllocationSchema).min(1, 'At least one leave allocation is required.').optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
