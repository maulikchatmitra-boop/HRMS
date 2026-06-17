/**
 * Super Admin Service
 * Platform level operations
 */

import Company from '../models/company.model.js';
import User    from '../models/user.model.js';
import Role    from '../models/role.model.js';
import { onboardCompany } from './company.service.js';

/**
 * Saari companies dekho
 */
export const getAllCompanies = async () => {
  return await Company.find({}).sort({ createdAt: -1 });
};

/**
 * Ek company ki detail
 */
export const getCompanyById = async (companyId) => {
  const company = await Company.findById(companyId);
  if (!company) throw new Error('Company not found.');
  return company;
};

/**
  * Company status, subscription status and plan tier updates (Super Admin only)
  */
export const updateCompanySubscription = async (companyId, updateData) => {
  const company = await Company.findById(companyId);
  if (!company) throw new Error('Company not found.');

  if (updateData.status !== undefined) {
    company.status = updateData.status;
  }
  if (updateData.subscriptionStatus !== undefined) {
    company.subscriptionStatus = updateData.subscriptionStatus;
  }
  if (updateData.plan !== undefined) {
    company.plan = updateData.plan;
  }

  return await company.save();
};

/**
 * Kisi bhi company ke sab users dekho
 */
export const getCompanyUsers = async (companyId) => {
  return await User.find({ companyId })
    .populate('roleId', 'roleName')
    .select('-password')
    .sort({ createdAt: -1 });
};

/**
 * Platform stats
 */
export const getPlatformStats = async () => {
  const totalCompanies  = await Company.countDocuments({});
  const activeCompanies = await Company.countDocuments({ status: 'active' });
  const totalUsers      = await User.countDocuments({ isSuperAdmin: false });

  const recentCompanies = await Company.find({})
    .sort({ createdAt: -1 })
    .limit(5)
    .select('companyName companyCode status createdAt');

  return {
    totalCompanies,
    activeCompanies,
    inactiveCompanies: totalCompanies - activeCompanies,
    totalUsers,
    recentCompanies,
  };
};

/**
 * Nai company banao (Super Admin karta hai)
 */
export const createCompany = async (companyData, adminData, superAdminId) => {
  return await onboardCompany(companyData, adminData, superAdminId);
};

/**
 * Kisi bhi company ke sab roles dekho
 */
export const getCompanyRoles = async (companyId) => {
  return await Role.find({ companyId }).sort({ createdAt: -1 });
};
