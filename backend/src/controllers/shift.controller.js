import * as shiftService from '../services/shift.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const createShift = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await shiftService.createShift(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Shift created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getShiftById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = await shiftService.getShiftById(companyId, id);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Shift retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getShifts = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const data = await shiftService.getShifts(companyId, req.query);
    return res.status(200).json({
      success: true,
      data: data.shifts.map(formatCleanMeta),
      pagination: data.pagination,
      message: 'Shifts list retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateShift = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await shiftService.updateShift(companyId, id, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Shift updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteShift = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await shiftService.deleteShift(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Shift deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
