import { z } from 'zod';

export const loginSchema = z.object({
  // Super Admin ke liye companyCode optional hai
  companyCode: z.string().trim().optional().default(''),
  email: z.string({ required_error: 'Email address is required.' })
    .trim()
    .email('Please enter a valid email address.'),
  password: z.string({ required_error: 'Password is required.' })
    .min(1, 'Password cannot be empty.')
});

export const forgotPasswordSchema = z.object({
  // Super Admin ke liye companyCode optional hai
  companyCode: z.string().trim().optional().default(''),
  email: z.string({ required_error: 'Email address is required.' })
    .trim()
    .email('Please enter a valid email address.')
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Token is required.' })
    .trim()
    .min(1, 'Token cannot be empty.'),
  newPassword: z.string({ required_error: 'New password is required.' })
    .min(8, 'New password must be at least 8 characters long.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.')
});

export const changePasswordSchema = z.object({
  oldPassword: z.string({ required_error: 'Current password is required.' })
    .min(1, 'Current password cannot be empty.'),
  newPassword: z.string({ required_error: 'New password is required.' })
    .min(8, 'New password must be at least 8 characters long.')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.')
});

// Self profile update — sirf basic info update hogi
// Password, role, department — yeh nahi badal sakta khud
export const updateProfileSchema = z.object({
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
  phone: z.string({ required_error: 'Phone number is required.' })
    .trim()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits.')
    .refine(val => !/^(.)\1{9}$/.test(val), {
      message: 'Phone number cannot consist of the same repeating digit.'
    }),
  city: z.string({ required_error: 'City is required.' })
    .trim()
    .min(2, 'City must be at least 2 characters.')
    .max(50, 'City cannot exceed 50 characters.')
    .regex(/^[a-zA-Z\s]+$/, 'City can only contain letters and spaces.'),
  address: z.string({ required_error: 'Address is required.' })
    .trim()
    .min(5, 'Address must be at least 5 characters.')
    .max(250, 'Address cannot exceed 250 characters.'),
  avatar: z.string().trim().nullable().optional().refine(val => {
    if (!val) return true;
    return /^https?:\/\/\S+\.\S+/.test(val);
  }, { message: 'Please enter a valid image URL starting with http:// or https://.' }),
  dateOfBirth: z.string().optional().nullable(),
});

