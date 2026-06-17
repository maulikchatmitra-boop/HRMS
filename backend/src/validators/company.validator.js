import { z } from 'zod';

const isDummyPhone = (val) => {
  if (/^(\d)\1{9}$/.test(val)) return true;
  if (val === '1234567890' || val === '0123456789' || val === '9876543210') return true;
  return false;
};

export const onboardCompanySchema = z.object({
  company: z.object({
    companyName: z.string({ required_error: 'Company name is required.' })
      .trim()
      .min(2, 'Company name must be at least 2 characters long.')
      .max(100, 'Company name cannot exceed 100 characters.')
      .regex(/^[a-zA-Z0-9\s.,&'-]+$/, 'Company name can only contain letters, numbers, spaces, hyphens, periods, ampersands, commas, and apostrophes.'),
    companyCode: z.string({ required_error: 'Company code is required.' })
      .trim()
      .min(2, 'Company code must be at least 2 characters long.')
      .max(10, 'Company code cannot exceed 10 characters.')
      .regex(/^[A-Z0-9]+$/, 'Company code must contain only uppercase letters and numbers.'),
    email: z.string({ required_error: 'Company contact email is required.' })
      .trim()
      .email('Please enter a valid company contact email address.'),
    phone: z.string({ required_error: 'Company phone number is required.' })
      .trim()
      .min(1, 'Company phone number is required.')
      .regex(/^[0-9]{10}$/, 'Company phone number must be exactly 10 digits.')
      .refine(val => !isDummyPhone(val), { message: 'Dummy phone sequences (like repeating digits or sequential digits) are not allowed.' }),
    status: z.enum(['active', 'inactive']).optional(),
    subscriptionStatus: z.enum(['active', 'trial', 'expired']).optional(),
    plan: z.enum(['basic', 'standard', 'enterprise']).optional()
  }),
  admin: z.object({
    firstName: z.string({ required_error: 'Admin first name is required.' })
      .trim()
      .min(2, 'First name must be at least 2 characters.')
      .max(50, 'First name cannot exceed 50 characters.')
      .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces.'),
    lastName: z.string({ required_error: 'Admin last name is required.' })
      .trim()
      .min(2, 'Last name must be at least 2 characters.')
      .max(50, 'Last name cannot exceed 50 characters.')
      .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces.'),
    email: z.string({ required_error: 'Admin email address is required.' })
      .trim()
      .email('Please enter a valid admin email address.'),
    password: z.string({ required_error: 'Admin initial password is required.' })
      .min(8, 'Password must be at least 8 characters long.')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.')
  })
});

// Secure Update Schema: Company Admin can only update contact/info, NOT status, subscriptionStatus, or plan
export const updateCompanySchema = z.object({
  companyName: z.string().trim().min(1, 'Company name cannot be empty.').optional(),
  email: z.string().trim().email('Please enter a valid email address.').optional(),
  phone: z.string().trim().optional()
});

// Super Admin Update Schema: Full control over company status, billing/subscriptionStatus, and plan tier
export const superAdminUpdateCompanySchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  subscriptionStatus: z.enum(['active', 'trial', 'expired']).optional(),
  plan: z.enum(['basic', 'standard', 'enterprise']).optional()
});
