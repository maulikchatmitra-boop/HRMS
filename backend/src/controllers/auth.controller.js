import * as authService from '../services/auth.service.js';

/**
 * Handles user login.
 */
export const login = async (req, res, next) => {
  try {
    const { companyCode, email, password } = req.body;

    const result = await authService.login(companyCode, email, password);

    // Set refresh token in httpOnly, secure, sameSite cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Build clean company object (only what the frontend needs)
    let cleanCompany = null;
    if (result.company) {
      cleanCompany = {
        _id: result.company._id,
        companyName: result.company.companyName,
        companyCode: result.company.companyCode,
        email: result.company.email,
        phone: result.company.phone,
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
        company: cleanCompany,
        accessToken: result.accessToken,
      },
      message: 'Login successful.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles user logout.
 */
export const logout = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;

    await authService.logout(companyId, userId);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles request for password reset token.
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email, companyCode } = req.body;
    const result = await authService.forgotPassword(email, companyCode);
    return res.status(200).json({
      success: true,
      data: result.resetToken ? { resetToken: result.resetToken } : null,
      message: result.message || 'Password reset link generated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles password reset.
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    await authService.resetPassword(token, newPassword);

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles password change for authenticated users.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { userId, companyId } = req.user;
    const { oldPassword, newPassword } = req.body;

    await authService.changePassword(userId, companyId, oldPassword, newPassword, userId);

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves the currently logged in user.
 */
export const me = async (req, res, next) => {
  try {
    const { userId, companyId } = req.user;
    const user = await authService.getCurrentUser(userId, companyId);
    return res.status(200).json({
      success: true,
      data: user,
      message: 'Current user session retrieved.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Self Profile Update
 * Har user apni basic info update kar sakta hai
 * Password, role, department — nahi badal sakta
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { userId, companyId } = req.user;

    const updated = await authService.updateSelfProfile(userId, companyId, req.body);

    return res.status(200).json({
      success: true,
      data:    updated,
      message: 'Profile updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles JWT refresh token rotation.
 */
export const refreshToken = async (req, res, next) => {
  try {
    let token = req.body?.refreshToken || req.cookies?.refreshToken;
    
    if (!token && req.headers.cookie) {
      const cookies = req.headers.cookie.split(';').reduce((acc, c) => {
        const [name, val] = c.trim().split('=');
        if (name && val) acc[name] = decodeURIComponent(val);
        return acc;
      }, {});
      token = cookies['refreshToken'];
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Refresh token is required.',
      });
    }

    const result = await authService.refreshSession(token);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const cleanUser = result.user.toObject ? result.user.toObject() : result.user;

    return res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: cleanUser
      },
      message: 'Token refreshed successfully.',
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      data: null,
      message: error.message || 'Invalid or expired refresh token.',
    });
  }
};
