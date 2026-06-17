import * as designationService from '../services/designation.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const createDesignation = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await designationService.createDesignation(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Designation created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getDesignationById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = await designationService.getDesignationById(companyId, id);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Designation retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getDesignations = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const data = await designationService.getDesignations(companyId, req.query);
    return res.status(200).json({
      success: true,
      data: data.designations.map(formatCleanMeta),
      pagination: data.pagination,
      message: 'Designations list retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateDesignation = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await designationService.updateDesignation(companyId, id, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Designation updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDesignation = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await designationService.deleteDesignation(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Designation deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
