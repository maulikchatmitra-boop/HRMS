/**
 * Super Admin Middleware
 * 
 * Sirf Super Admin access kar sakta hai
 * Company Admin ya koi aur nahi
 */

export const superAdminOnly = (req, res, next) => {
  if (!req.user || !req.user.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      data:    null,
      message: 'Access denied. Super Admin only.',
    });
  }
  next();
};
