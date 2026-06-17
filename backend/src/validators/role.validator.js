import { z } from 'zod';

export const createRoleSchema = z.object({
  roleName: z.string({ required_error: 'Role name is required.' })
    .trim()
    .min(1, 'Role name cannot be empty.'),
  description: z.string().trim().optional()
});

export const updateRoleSchema = z.object({
  roleName: z.string().trim().min(1, 'Role name cannot be empty.').optional(),
  description: z.string().trim().optional()
});

export const assignPermissionsSchema = z.object({
  permissionIds: z.array(
    z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid permission ObjectId format.')
  , { required_error: 'permissionIds array is required.' })
});
