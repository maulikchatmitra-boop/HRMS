import * as permissionService from '../services/permission.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

/**
 * Gets all global system permissions.
 */
export const getPermissions = async (req, res, next) => {
  try {
    const permissions = await permissionService.getPermissions();
    return res.status(200).json({
      success: true,
      data: permissions.map(formatCleanMeta),
      message: 'Global permissions retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};
