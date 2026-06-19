import { verifyToken } from '../utils/auth.utils.js';
import User    from '../models/user.model.js';
import Company from '../models/company.model.js';

/**
 * Authenticate middleware
 * 1. Verify JWT signature
 * 2. Check user still exists + is active in DB
 * 3. Check company is active (for non-Super Admin)
 * 4. Attach roleName for role-based filtering
 */
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false, data: null,
      message: 'Access denied. No authentication token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token, 'access');

    // ─── Super Admin ───────────────────────────────────────────
    if (decoded.isSuperAdmin) {
      const superAdmin = await User.findOne({
        _id: decoded.userId, isSuperAdmin: true, status: 'active'
      }).lean();

      if (!superAdmin) {
        return res.status(401).json({
          success: false, data: null,
          message: 'Super Admin account not found or inactive.',
        });
      }

      req.user = { ...decoded, roleName: 'Super Admin' };
      return next();
    }

    // ─── Company User ──────────────────────────────────────────
    const [user, company] = await Promise.all([
      User.findOne({ _id: decoded.userId, companyId: decoded.companyId }).populate('roleId').lean(),
      Company.findById(decoded.companyId).lean(),
    ]);

    // User status check
    if (!user) {
      return res.status(401).json({
        success: false, data: null,
        message: 'User account not found.',
      });
    }
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false, data: null,
        message: 'Your account has been deactivated. Please contact your administrator.',
      });
    }

    // Company status check
    if (!company) {
      return res.status(401).json({
        success: false, data: null,
        message: 'Company not found.',
      });
    }

    const isCompanyInactive = company.status !== 'active';
    const isCompanyExpired = company.subscriptionStatus === 'expired';

    if (isCompanyInactive || isCompanyExpired) {
      // Allow auth routes (like /auth/refresh-token, /auth/me, /auth/logout) to pass
      const isAuthRoute = req.baseUrl && req.baseUrl.endsWith('/auth');
      if (!isAuthRoute) {
        return res.status(403).json({
          success: false,
          data: null,
          message: isCompanyInactive
            ? 'Your company account is inactive. Please contact support.'
            : 'Your company subscription has expired. Please contact support.',
        });
      }
    }

    // Attach roleName for role-based filtering
    const roleName = user.roleId?.roleName || null;

    req.user = { ...decoded, roleName };
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false, data: null,
        message: 'Authentication token has expired. Please refresh your session.',
      });
    }
    return res.status(401).json({
      success: false, data: null,
      message: 'Invalid authentication token.',
    });
  }
};
