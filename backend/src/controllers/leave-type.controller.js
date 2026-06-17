import * as leaveTypeService from '../services/leave-type.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const createLeaveType = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await leaveTypeService.createLeaveType(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave type created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveTypes = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const data = await leaveTypeService.getLeaveTypes(companyId, req.query);
    return res.status(200).json({
      success: true,
      data: data.map(formatCleanMeta),
      message: 'Leave types list retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveTypeById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = await leaveTypeService.getLeaveTypeById(companyId, id);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave type details retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeaveType = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await leaveTypeService.updateLeaveType(companyId, id, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave type updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLeaveType = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    // Performs soft-deactivation (setting status to inactive) instead of physical delete
    const data = await leaveTypeService.deleteLeaveType(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave type deactivated successfully.',
    });
  } catch (error) {
    next(error);
  }
};
