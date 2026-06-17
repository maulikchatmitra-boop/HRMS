/**
 * Super Admin Controller
 * Platform level APIs
 */

import * as superAdminService from '../services/superAdmin.service.js';
import { formatCleanMeta, formatCleanUser } from '../utils/user.utils.js';

/**
 * GET /super-admin/companies
 * List all companies on the platform.
 */
export const getAllCompanies = async (req, res, next) => {
  try {
    const companies = await superAdminService.getAllCompanies();
    return res.status(200).json({
      success: true,
      data:    companies.map(formatCleanMeta),
      total:   companies.length,
      message: 'All companies retrieved.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /super-admin/companies/:id
 * Get a single company's details.
 */
export const getCompanyById = async (req, res, next) => {
  try {
    const company = await superAdminService.getCompanyById(req.params.id);
    return res.status(200).json({
      success: true,
      data:    formatCleanMeta(company),
      message: 'Company details retrieved.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /super-admin/companies/:id/subscription
 * Update company billing/subscription status and plan tier.
 */
export const updateCompanySubscription = async (req, res, next) => {
  try {
    const company = await superAdminService.updateCompanySubscription(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      data:    formatCleanMeta(company),
      message: 'Company subscription and status details updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /super-admin/companies/:id/users
 * List all users of a specific company.
 */
export const getCompanyUsers = async (req, res, next) => {
  try {
    const users = await superAdminService.getCompanyUsers(req.params.id);
    return res.status(200).json({
      success: true,
      data:    users.map(formatCleanUser),
      total:   users.length,
      message: 'Company users retrieved.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /super-admin/stats
 * Get platform-wide statistics.
 */
export const getPlatformStats = async (req, res, next) => {
  try {
    const stats = await superAdminService.getPlatformStats();
    return res.status(200).json({
      success: true,
      data:    stats,
      message: 'Platform stats retrieved.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /super-admin/companies
 * Create a new company and provision its admin.
 */
export const createCompany = async (req, res, next) => {
  try {
    const { company, admin } = req.body;
    const result = await superAdminService.createCompany(
      company,
      admin,
      req.user.userId
    );
    return res.status(201).json({
      success: true,
      data:    result,
      message: 'Company created and provisioned successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /super-admin/companies/:id/roles
 * List all roles of a specific company.
 */
export const getCompanyRoles = async (req, res, next) => {
  try {
    const roles = await superAdminService.getCompanyRoles(req.params.id);
    return res.status(200).json({
      success: true,
      data:    roles.map(formatCleanMeta),
      total:   roles.length,
      message: 'Company roles retrieved.',
    });
  } catch (error) {
    next(error);
  }
};
