import { z } from 'zod';

export const createHolidaySchema = z.object({
  name: z.string({ required_error: 'Holiday name is required.' })
    .trim()
    .min(3, 'Holiday name must be at least 3 characters.')
    .max(100, 'Holiday name cannot exceed 100 characters.')
    .regex(/^[a-zA-Z\s'-]+$/, 'Holiday name can only contain letters, spaces, hyphens, and apostrophes.'),
  date: z.string({ required_error: 'Holiday date is required.' })
    .trim()
    .datetime({ message: 'Holiday date must be a valid ISO-8601 datetime string.' })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Holiday date must be in YYYY-MM-DD format.'))
    .transform(val => new Date(val)),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters.').optional(),
  isOptional: z.boolean().optional(),
});

export const updateHolidaySchema = z.object({
  name: z.string().trim()
    .min(3, 'Holiday name must be at least 3 characters.')
    .max(100, 'Holiday name cannot exceed 100 characters.')
    .regex(/^[a-zA-Z\s'-]+$/, 'Holiday name can only contain letters, spaces, hyphens, and apostrophes.')
    .optional(),
  date: z.string()
    .trim()
    .datetime()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .transform(val => new Date(val))
    .optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters.').optional(),
  isOptional: z.boolean().optional(),
});
