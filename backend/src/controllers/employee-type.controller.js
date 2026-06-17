import * as employeeTypeService from '../services/employee-type.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const createEmployeeType = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await employeeTypeService.createEmployeeType(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Employee type created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeTypeById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = await employeeTypeService.getEmployeeTypeById(companyId, id);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Employee type retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeTypes = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const data = await employeeTypeService.getEmployeeTypes(companyId, req.query);
    return res.status(200).json({
      success: true,
      data: data.employeeTypes.map(formatCleanMeta),
      pagination: data.pagination,
      message: 'Employee types list retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployeeType = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await employeeTypeService.updateEmployeeType(companyId, id, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Employee type updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployeeType = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await employeeTypeService.deleteEmployeeType(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Employee type deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
