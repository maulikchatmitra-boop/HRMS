import * as branchService from '../services/branch.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const createBranch = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await branchService.createBranch(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Branch created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = await branchService.getBranchById(companyId, id);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Branch retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getBranches = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const data = await branchService.getBranches(companyId, req.query);
    return res.status(200).json({
      success: true,
      data: data.branches.map(formatCleanMeta),
      pagination: data.pagination,
      message: 'Branches list retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await branchService.updateBranch(companyId, id, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Branch updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await branchService.deleteBranch(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Branch deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
