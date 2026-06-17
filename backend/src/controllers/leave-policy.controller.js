import * as leavePolicyService from '../services/leave-policy.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const createLeavePolicy = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await leavePolicyService.createLeavePolicy(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave policy created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getLeavePolicies = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const data = await leavePolicyService.getLeavePolicies(companyId);
    return res.status(200).json({
      success: true,
      data: data.map(formatCleanMeta),
      message: 'Leave policies retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getLeavePolicyById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = await leavePolicyService.getLeavePolicyById(companyId, id);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave policy details retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeavePolicy = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await leavePolicyService.updateLeavePolicy(companyId, id, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave policy updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const assignLeavePolicy = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await leavePolicyService.assignLeavePolicy(companyId, id, req.body.assignments, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave policy assigned and balances synced successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLeavePolicy = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await leavePolicyService.deleteLeavePolicy(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave policy deactivated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
