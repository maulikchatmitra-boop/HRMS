import { z } from 'zod';

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

export const adjustBalanceSchema = z.object({
  employeeId: z.string({ required_error: 'Employee ID is required.' })
    .regex(mongoIdRegex, 'Invalid Employee ID format.'),
  leaveTypeId: z.string({ required_error: 'Leave Type ID is required.' })
    .regex(mongoIdRegex, 'Invalid Leave Type ID format.'),
  adjustmentAmount: z.number({ required_error: 'Adjustment amount is required.' })
    .min(0, 'Adjustment amount must be a non-negative number.'),
  type: z.enum(['add', 'deduct', 'set'], {
    required_error: 'Adjustment type must be add, deduct, or set.',
  }),
  remarks: z.string().trim().optional().default(''),
});
