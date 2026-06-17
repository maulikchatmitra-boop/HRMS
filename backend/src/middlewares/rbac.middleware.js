import { hasPermission } from '../services/auth.service.js';

/**
 * Middleware to authorize requests based on a specific RBAC permission key or keys.
 * Enforces checking that the authenticated user possesses the permission.
 * @param {string|string[]} permissionKeyOrKeys - Key or array of keys to authorize.
 */
export const authorize = (permissionKeyOrKeys) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          data: null,
          message: 'Access denied. User session is unauthenticated.',
        });
      }

      const keys = Array.isArray(permissionKeyOrKeys) ? permissionKeyOrKeys : [permissionKeyOrKeys];
      
      let isAllowed = false;
      for (const key of keys) {
        if (await hasPermission(req.user.userId, key)) {
          isAllowed = true;
          break;
        }
      }

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Access forbidden. You do not have permission to perform this action.',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
