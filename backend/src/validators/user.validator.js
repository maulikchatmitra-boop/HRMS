import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string({ required_error: 'First name is required.' })
    .trim()
    .min(2, 'First name must be at least 2 characters.')
    .max(50, 'First name cannot exceed 50 characters.')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces.'),
  lastName: z.string({ required_error: 'Last name is required.' })
    .trim()
    .min(2, 'Last name must be at least 2 characters.')
    .max(50, 'Last name cannot exceed 50 characters.')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces.'),
  email: z.string({ required_error: 'Email address is required.' })
    .trim()
    .email('Please enter a valid email address.'),
  password: z.string({ required_error: 'Password is required.' })
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'),
  roleId: z.string({ required_error: 'Role ID mapping is required.' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID format (must be Mongoose ObjectId).'),
  status: z.enum(['active', 'inactive']).optional(),
  departmentId: z.string({ required_error: 'Department is required.' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Department ID format.'),
  designationId: z.string({ required_error: 'Designation is required.' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Designation ID format.'),
  reportingManagerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Reporting Manager ID format.').nullable().optional(),
  branchId: z.string({ required_error: 'Branch is required.' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Branch ID format.'),
  shiftId: z.string({ required_error: 'Shift schedule is required.' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Shift ID format.'),
  joiningDate: z.string({ required_error: 'Joining date is required.' })
    .min(1, 'Joining date is required.'),
  dateOfBirth: z.string().optional().nullable()
});

export const updateUserSchema = z.object({
  firstName: z.string().trim()
    .min(2, 'First name must be at least 2 characters.')
    .max(50, 'First name cannot exceed 50 characters.')
    .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces.')
    .optional(),
  lastName: z.string().trim()
    .min(2, 'Last name must be at least 2 characters.')
    .max(50, 'Last name cannot exceed 50 characters.')
    .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces.')
    .optional(),
  email: z.string().trim().email('Please enter a valid email address.').optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.')
    .optional(),
  roleId: z.string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Role ID format.')
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
  departmentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Department ID format.').nullable().optional(),
  designationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Designation ID format.').nullable().optional(),
  reportingManagerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Reporting Manager ID format.').nullable().optional(),
  branchId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Branch ID format.').nullable().optional(),
  shiftId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Shift ID format.').nullable().optional(),
  joiningDate: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable()
});
