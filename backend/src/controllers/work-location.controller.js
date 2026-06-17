import * as workLocationService from '../services/work-location.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const createWorkLocation = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await workLocationService.createWorkLocation(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Work location created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkLocationById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = await workLocationService.getWorkLocationById(companyId, id);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Work location retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkLocations = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const data = await workLocationService.getWorkLocations(companyId, req.query);
    return res.status(200).json({
      success: true,
      data: data.workLocations.map(formatCleanMeta),
      pagination: data.pagination,
      message: 'Work locations list retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkLocation = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await workLocationService.updateWorkLocation(companyId, id, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Work location updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkLocation = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await workLocationService.deleteWorkLocation(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Work location deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
