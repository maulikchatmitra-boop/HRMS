import * as companyService from '../services/company.service.js';
import { formatCleanMeta, getRoleCategory } from '../utils/user.utils.js';

// ─── Role based company response filter ──────────────────────────────────────
const filterCompanyByRole = (company, roleName) => {
  const base = {
    _id:         company._id,
    companyName: company.companyName,
    companyCode: company.companyCode,
    status:      company.status,
  };

  const category = getRoleCategory(roleName);

  // Company Admin (Owner) → Sab kuch
  if (category === 'Company Admin') {
    return {
      ...base,
      email:              company.email,
      phone:              company.phone,
      subscriptionStatus: company.subscriptionStatus,
      plan:               company.plan,
      createdAt:          company.createdAt,
      updatedAt:          company.updatedAt,
    };
  }

  // HR, Manager & Employee → Basic + contact info
  if (category === 'HR' || category === 'Manager' || category === 'Employee') {
    return {
      ...base,
      email: company.email,
      phone: company.phone,
    };
  }

  // Custom roles → Manager jaisa (basic only)
  return { ...base };
};

/**
 * Gets details of the authenticated user's company.
 * Role ke hisaab se filtered response milega
 */
export const getCompany = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const roleName      = req.user.roleName || null;

    const company = await companyService.getCompanyById(companyId);

    // Role ke hisaab se filter karo
    const filteredCompany = filterCompanyByRole(company, roleName);

    return res.status(200).json({
      success: true,
      data:    filteredCompany,
      message: 'Company details retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates details of the authenticated user's company.
 * Sirf Company Admin kar sakta hai
 */
export const updateCompany = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const updatedCompany = await companyService.updateCompany(companyId, req.body, userId);

    // Update ke baad bhi full response sirf Admin ko
    const filteredCompany = filterCompanyByRole(updatedCompany, 'Company Admin');

    return res.status(200).json({
      success: true,
      data:    filteredCompany,
      message: 'Company settings updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
