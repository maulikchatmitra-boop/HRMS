import { z } from 'zod';

export const regularizeSchema = z.object({
  attendanceDate: z.string({ required_error: 'Attendance date is required.' })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD.'),
  regularizationReason: z.string({ required_error: 'Regularization explanation is required.' })
    .trim()
    .min(1, 'Regularization explanation cannot be empty.'),
});

export const approveRegularizationSchema = z.object({
  action: z.enum(['approve', 'reject'], { required_error: 'Action is required.' }),
  regularizedStatus: z.enum(['present', 'half_day']).optional(),
  remarks: z.string().trim().optional(),
});

export const adminOverrideSchema = z.object({
  employeeId: z.string({ required_error: 'Employee ID is required.' }).trim().min(1),
  attendanceDate: z.string({ required_error: 'Attendance date is required.' })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Expected YYYY-MM-DD.'),
  status: z.enum(['checked_in', 'present', 'half_day', 'absent', 'missed_punch', 'pending_regularization']),
  checkInTime: z.string().optional().nullable(),
  checkOutTime: z.string().optional().nullable(),
  overrideReason: z.string({ required_error: 'Override reason is required.' }).trim().min(1),
});
