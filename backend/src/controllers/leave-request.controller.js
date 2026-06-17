import * as leaveRequestService from '../services/leave-request.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const createLeaveRequest = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await leaveRequestService.createLeaveRequest(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave application submitted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveRequests = async (req, res, next) => {
  try {
    const { companyId, userId, roleName } = req.user;
    const result = await leaveRequestService.getLeaveRequests(companyId, req.query, userId, roleName);
    return res.status(200).json({
      success: true,
      data: result.requests.map(formatCleanMeta),
      pagination: result.pagination,
      message: 'Leave requests retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaveRequestById = async (req, res, next) => {
  try {
    const { companyId, userId, roleName } = req.user;
    const { id } = req.params;
    const data = await leaveRequestService.getLeaveRequestById(companyId, id, userId, roleName);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave request details retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const handleLeaveAction = async (req, res, next) => {
  try {
    const { companyId, userId, roleName } = req.user;
    const { id } = req.params;
    const data = await leaveRequestService.handleLeaveAction(companyId, id, req.body, userId, roleName);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: `Leave request status updated successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
