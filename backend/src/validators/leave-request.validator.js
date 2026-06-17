import { z } from 'zod';

const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

export const createLeaveRequestSchema = z.object({
  leaveTypeId: z.string({ required_error: 'Leave Type ID is required.' })
    .regex(mongoIdRegex, 'Invalid Leave Type ID format.'),
  fromDate: z.string({ required_error: 'From date is required.' })
    .min(1, 'From date cannot be empty.'),
  toDate: z.string({ required_error: 'To date is required.' })
    .min(1, 'To date cannot be empty.'),
  isHalfDay: z.boolean().optional().default(false),
  reason: z.string({ required_error: 'Reason is required.' })
    .trim()
    .min(1, 'Reason cannot be empty.'),
  attachment: z.string().trim().nullable().optional(),
});

export const handleLeaveActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'send_back', 'cancel'], {
    required_error: 'Action is required.',
  }),
  remarks: z.string().trim().optional(),
}).refine(
  (data) => {
    if ((data.action === 'reject' || data.action === 'send_back') && (!data.remarks || data.remarks.trim() === '')) {
      return false;
    }
    return true;
  },
  {
    message: 'Remarks are required for rejecting or sending back a leave request.',
    path: ['remarks'],
  }
);
