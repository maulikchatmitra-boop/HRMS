import Company from '../models/company.model.js';
import User from '../models/user.model.js';
import RolePermission from '../models/role-permission.model.js';
import Permission from '../models/permission.model.js';
import { uploadBufferToCloudinary } from './cloudinary.service.js';
import { logAction } from './auditLog.service.js';
import { formatCleanUser, getRoleCategory } from '../utils/user.utils.js';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyToken,
} from '../utils/auth.utils.js';

/**
 * Logins a user context and returns signed access and refresh tokens.
 * @param {string} companyCode - Organization tenant code.
 * @param {string} email - User email address.
 * @param {string} password - Raw input password.
 * @returns {Promise<Object>} User details, company details, accessToken, and refreshToken.
 */
export const login = async (companyCode, email, password) => {

  // ─── Super Admin Login (companyCode nahi hota) ────────────────
  if (!companyCode || companyCode.trim() === '') {
    const superAdmin = await User.findOne({
      email: email.toLowerCase(),
      isSuperAdmin: true
    });

    if (!superAdmin) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 400;
      err.errors = [{ field: 'email', message: 'Super Admin email is not registered.' }];
      throw err;
    }

    if (superAdmin.status !== 'active') {
      throw new Error('Super Admin account is inactive.');
    }

    const isMatch = await comparePassword(password, superAdmin.password);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 400;
      err.errors = [{ field: 'password', message: 'Incorrect password.' }];
      throw err;
    }

    const payload = {
      userId:       superAdmin._id,
      companyId:    null,
      roleId:       null,
      isSuperAdmin: true,
    };

    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // save() se bachte hain — validation issue avoid karne ke liye
    await User.findByIdAndUpdate(superAdmin._id, { lastLogin: new Date() });

    await logAction({
      companyId: null,
      userId:    superAdmin._id,
      module:    'auth',
      action:    'login',
      newData:   { email: superAdmin.email, role: 'superadmin' }
    });

    const cleanUser = formatCleanUser(superAdmin);
    cleanUser.permissions = [];

    return {
      user:         cleanUser,
      company:      null,
      accessToken,
      refreshToken,
    };
  }

  // ─── Company Admin / HR / Manager / Employee Login ────────────
  const company = await Company.findOne({ companyCode: companyCode.toUpperCase() });
  if (!company) {
    const err = new Error('Invalid company code.');
    err.statusCode = 400;
    err.errors = [{ field: 'companyCode', message: 'Company code is not registered.' }];
    throw err;
  }

  const user = await User.findOne({
    email:     email.toLowerCase(),
    companyId: company._id
  })
  .populate('roleId')
  .populate('departmentId', 'name')
  .populate('designationId', 'title')
  .populate('reportingManagerId', 'firstName lastName email')
  .populate('branchId', 'name')
  .populate('shiftId', 'name startTime endTime')
  .populate('employeeTypeId', 'name')
  .populate('workLocationId', 'name');

  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 400;
    err.errors = [{ field: 'email', message: 'Email address is not registered.' }];
    throw err;
  }

  if (user.status !== 'active') {
    throw new Error('User account is deactivated.');
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 400;
    err.errors = [{ field: 'password', message: 'Incorrect password.' }];
    throw err;
  }

  const payload = {
    userId:       user._id,
    companyId:    company._id,
    roleId:       user.roleId._id,
    isSuperAdmin: false,
  };

  const accessToken  = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // save() se bachte hain — findByIdAndUpdate use karo
  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

  await logAction({
    companyId: company._id,
    userId:    user._id,
    module:    'auth',
    action:    'login',
    newData:   { email: user.email }
  });

  const cleanUser = formatCleanUser(user);
  cleanUser.companyStatus = company.status;
  cleanUser.companySubscriptionStatus = company.subscriptionStatus;
  cleanUser.companyPlan = company.plan;

  if (user.roleId) {
    const mappings = await RolePermission.find({ companyId: company._id, roleId: user.roleId._id }).populate('permissionId');
    cleanUser.permissions = mappings.map(m => m.permissionId?.permissionKey).filter(Boolean);
  } else {
    cleanUser.permissions = [];
  }


  cleanUser.companyCode = company.companyCode;
  cleanUser.companyName = company.companyName;
  cleanUser.companyStatus = company.status;
  cleanUser.companySubscriptionStatus = company.subscriptionStatus;
  cleanUser.companyPlan = company.plan;

  return {
    user: cleanUser,
    company,
    accessToken,
    refreshToken,
  };
};

/**
 * Handles auditing for a logout action.
 * @param {string} companyId - Tenant ID.
 * @param {string} userId - User ID.
 */
export const logout = async (companyId, userId) => {
  await logAction({
    companyId,
    userId,
    module: 'auth',
    action: 'logout'
  });
  return { success: true };
};

/**
 * Generates a stateless, short-lived password reset token.
 * Prevents schema alteration while guaranteeing secure verification.
 * @param {string} companyCode - Tenant code.
 * @param {string} email - Registered user email.
 * @returns {Promise<string>} The generated JWT reset token.
 */
/**
 * Generates a stateless, short-lived password reset token.
 * Works for company users only.
 * Super Admin password reset → change-password API use karo.
 */
export const forgotPassword = async (email, companyCode) => {
  // Super Admin ke liye forgot password support nahi — use change-password
  if (!companyCode || companyCode.trim() === '') {
    throw new Error('Company code is required for password reset.');
  }

  const company = await Company.findOne({ companyCode: companyCode.toUpperCase() });
  if (!company) {
    // Security: don't reveal if company exists
    return { message: 'If the email is registered, a password reset link will be sent.' };
  }

  const user = await User.findOne({ email: email.toLowerCase(), companyId: company._id });
  if (!user) {
    // Security: prevent user enumeration
    return { message: 'If the email is registered, a password reset link will be sent.' };
  }

  const resetToken = generateResetToken({
    userId:    user._id,
    companyId: company._id,
    email:     user.email,
    action:    'reset_password'
  });

  await logAction({
    companyId: company._id,
    userId:    user._id,
    module:    'auth',
    action:    'forgot_password_request'
  });

  return { resetToken };
};

/**
 * Validates reset token and sets the new password.
 * @param {string} token - The stateless reset token.
 * @param {string} newPassword - The new user password.
 * @returns {Promise<Object>} Success indicator.
 */
export const resetPassword = async (token, newPassword) => {
  try {
    const decoded = verifyToken(token, 'reset');
    
    if (decoded.action !== 'reset_password') {
      throw new Error('Invalid token action scope.');
    }

    const user = await User.findOne({ _id: decoded.userId, companyId: decoded.companyId });
    if (!user) {
      throw new Error('User not found.');
    }

    const passwordHash = await hashPassword(newPassword);

    // save() se bachte hain — findByIdAndUpdate use karo
    await User.findByIdAndUpdate(decoded.userId, {
      password:  passwordHash,
      updatedBy: decoded.userId,
    });

    await logAction({
      companyId: decoded.companyId,
      userId: user._id,
      module: 'auth',
      action: 'reset_password_success'
    });

    return { success: true };
  } catch (error) {
    throw new Error('Password reset token is invalid or has expired.');
  }
};

/**
 * Changes user password from within active authenticated session.
 * @param {string} userId - Target user ID.
 * @param {string} companyId - Tenant ID.
 * @param {string} oldPassword - Current password.
 * @param {string} newPassword - New replacement password.
 * @param {string} actorId - Acting user performing the update.
 * @returns {Promise<Object>} Success indicator.
 */
export const changePassword = async (userId, companyId, oldPassword, newPassword, actorId) => {
  const user = await User.findOne({ _id: userId, companyId });
  if (!user) {
    throw new Error('User not found.');
  }

  const isMatch = await comparePassword(oldPassword, user.password);
  if (!isMatch) {
    throw new Error('Incorrect current password.');
  }

  const newHash = await hashPassword(newPassword);

  // save() se bachte hain — findByIdAndUpdate use karo
  await User.findByIdAndUpdate(userId, {
    password:  newHash,
    updatedBy: actorId,
  });

  await logAction({
    companyId: companyId,
    userId: actorId,
    module: 'auth',
    action: 'change_password_success'
  });

  return { success: true };
};

/**
 * Gets currently logged in user context.
 * @param {string} userId - User ID.
 * @param {string} companyId - Tenant ID.
 * @returns {Promise<Object>} Populated user document.
 */
export const getCurrentUser = async (userId, companyId) => {
  // Super Admin ke liye companyId null hota hai
  const query = companyId ? { _id: userId, companyId } : { _id: userId };

  const user = await User.findOne(query)
    .populate('roleId')
    .populate('departmentId', 'name')
    .populate('designationId', 'title')
    .populate('reportingManagerId', 'firstName lastName email')
    .populate('branchId', 'name')
    .populate('shiftId', 'name startTime endTime')
    .populate('employeeTypeId', 'name')
    .populate('workLocationId', 'name')
    .select('-password');

  if (!user) throw new Error('User session not found.');
  
  const cleanUser = formatCleanUser(user);

  const company = companyId ? await Company.findById(companyId).lean() : null;
  cleanUser.companyCode = company ? company.companyCode : null;
  cleanUser.companyName = company ? company.companyName : null;
  cleanUser.companyStatus = company ? company.status : 'active';
  cleanUser.companySubscriptionStatus = company ? company.subscriptionStatus : 'active';
  cleanUser.companyPlan = company ? company.plan : 'basic';

  if (user.roleId) {
    const mappings = await RolePermission.find({ companyId: user.companyId, roleId: user.roleId._id }).populate('permissionId');
    cleanUser.permissions = mappings.map(m => m.permissionId?.permissionKey).filter(Boolean);
  } else if (user.isSuperAdmin) {
    cleanUser.permissions = [];
  } else {
    cleanUser.permissions = [];
  }


  return cleanUser;
};

/**
 * Self Profile Update
 * Har user apni basic info update kar sakta hai
 * Role, department, password — nahi badal sakta
 * @param {string} userId
 * @param {string} companyId
 * @param {Object} updateData
 */
export const updateSelfProfile = async (userId, companyId, updateData) => {
  // Sirf yeh fields allow hain — sensitive fields blocked
  const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'city', 'avatar'];

  const actualUpdates = {};
  Object.keys(updateData).forEach(key => {
    if (allowedFields.includes(key)) {
      actualUpdates[key] = updateData[key];
    }
  });

  if (Object.keys(actualUpdates).length === 0) {
    throw new Error('No valid fields provided to update.');
  }

  // Super Admin ke liye companyId null hota hai
  const query = companyId ? { _id: userId, companyId } : { _id: userId };

  const updated = await User.findOneAndUpdate(
    query,
    { $set: { ...actualUpdates, updatedBy: userId } },
    { new: true, runValidators: true }
  )
    .populate('roleId', 'roleName')
    .populate('departmentId', 'name')
    .populate('designationId', 'title')
    .populate('branchId', 'name')
    .populate('shiftId', 'name startTime endTime')
    .select('-password');

  if (!updated) throw new Error('User not found.');

  // Audit log
  await logAction({
    companyId: companyId || null,
    userId,
    module:    'user',
    action:    'update',
    newData:   { updatedFields: Object.keys(actualUpdates) }
  });

  const cleanUser = formatCleanUser(updated);

  const company = companyId ? await Company.findById(companyId).lean() : null;
  cleanUser.companyCode = company ? company.companyCode : null;
  cleanUser.companyName = company ? company.companyName : null;
  cleanUser.companyStatus = company ? company.status : 'active';
  cleanUser.companySubscriptionStatus = company ? company.subscriptionStatus : 'active';
  cleanUser.companyPlan = company ? company.plan : 'basic';

  if (updated.roleId) {
    const mappings = await RolePermission.find({ companyId: companyId || null, roleId: updated.roleId._id }).populate('permissionId');
    cleanUser.permissions = mappings.map(m => m.permissionId?.permissionKey).filter(Boolean);
  } else {
    cleanUser.permissions = [];
  }


  return cleanUser;
};

/**
 * Checks if a user has a specific permission key.
 * Resolves permissions from role_permissions + permissions collections.
 * @param {string} userId - Target user ID.
 * @param {string} permissionKey - Key to authorize (e.g. 'employee.create').
 * @returns {Promise<boolean>} Resolves to true if authorized.
 */
export const hasPermission = async (userId, permissionKey) => {
  // 1. Fetch user to resolve companyId and roleId
  const user = await User.findById(userId).populate('roleId');
  if (!user || user.status !== 'active') {
    return false;
  }

  // Super Admins automatically have all permissions
  if (user.isSuperAdmin) {
    return true;
  }

  // Company Admins automatically have all permissions
  if (user.roleId && getRoleCategory(user.roleId.roleName) === 'Company Admin') {
    return true;
  }



  // 2. Fetch the permission ID from global database
  const permission = await Permission.findOne({ permissionKey });
  if (!permission) {
    return false;
  }

  // 3. Find if role_permission maps this permission to the user's role
  const mapping = await RolePermission.findOne({
    companyId: user.companyId,
    roleId: user.roleId._id || user.roleId,
    permissionId: permission._id
  });

  return !!mapping;
};

/**
 * Validates a refresh token and generates a new access/refresh token pair.
 * Supports token rotation.
 * @param {string} refreshToken - Decoded refresh token.
 * @returns {Promise<Object>} New tokens and user details.
 */
export const refreshSession = async (refreshToken) => {
  try {
    const decoded = verifyToken(refreshToken, 'refresh');
    
    const query = decoded.isSuperAdmin
      ? { _id: decoded.userId, isSuperAdmin: true }
      : { _id: decoded.userId, companyId: decoded.companyId };

    const user = await User.findOne(query)
      .populate('roleId')
      .populate('departmentId', 'name')
      .populate('designationId', 'title')
      .populate('reportingManagerId', 'firstName lastName email')
      .populate('branchId', 'name')
      .populate('shiftId', 'name startTime endTime')
      .populate('employeeTypeId', 'name')
      .populate('workLocationId', 'name');
    if (!user || user.status !== 'active') {
      throw new Error('User session is invalid or user has been deactivated.');
    }

    const payload = {
      userId:       user._id,
      companyId:    user.companyId || null,
      roleId:       user.roleId ? user.roleId._id : null,
      isSuperAdmin: !!user.isSuperAdmin,
    };

    const newAccessToken  = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    const cleanUser = formatCleanUser(user);

    const company = user.companyId ? await Company.findById(user.companyId).lean() : null;
    cleanUser.companyCode = company ? company.companyCode : null;
    cleanUser.companyName = company ? company.companyName : null;
    cleanUser.companyStatus = company ? company.status : 'active';
    cleanUser.companySubscriptionStatus = company ? company.subscriptionStatus : 'active';
    cleanUser.companyPlan = company ? company.plan : 'basic';

    if (user.roleId) {
      const mappings = await RolePermission.find({ companyId: user.companyId, roleId: user.roleId._id }).populate('permissionId');
      cleanUser.permissions = mappings.map(m => m.permissionId?.permissionKey).filter(Boolean);
    } else {
      cleanUser.permissions = [];
    }



    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: cleanUser
    };
  } catch (error) {
    throw new Error('Invalid or expired refresh token.');
  }
};

/**
 * Upload User Avatar/Profile Picture to Cloudinary
 * @param {string} userId
 * @param {string} companyId
 * @param {Buffer} fileBuffer
 * @param {string} originalName
 * @returns {Promise<string>} Cloudinary secure URL
 */
export const uploadAvatar = async (userId, companyId, fileBuffer, originalName) => {
  if (!fileBuffer) {
    throw new Error('No file buffer provided.');
  }
  
  // 1. Upload to Cloudinary under 'avatars' folder
  const cloudRes = await uploadBufferToCloudinary(fileBuffer, 'avatars', originalName);
  const avatarUrl = cloudRes.secure_url;

  // 2. Update user's avatar field in DB
  const query = companyId ? { _id: userId, companyId } : { _id: userId };
  const updatedUser = await User.findOneAndUpdate(
    query,
    { $set: { avatar: avatarUrl, updatedBy: userId } },
    { new: true }
  ).select('-password');

  if (!updatedUser) {
    throw new Error('User not found.');
  }

  // 3. Log Audit Action
  await logAction({
    companyId: companyId || null,
    userId,
    module: 'user',
    action: 'update',
    newData: { updatedFields: ['avatar'], avatarUrl }
  });

  return avatarUrl;
};

