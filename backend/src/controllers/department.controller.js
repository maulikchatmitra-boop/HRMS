import * as departmentService from '../services/department.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const createDepartment = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await departmentService.createDepartment(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Department created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = await departmentService.getDepartmentById(companyId, id);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Department retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartments = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const data = await departmentService.getDepartments(companyId, req.query);
    return res.status(200).json({
      success: true,
      data: data.departments.map(formatCleanMeta),
      pagination: data.pagination,
      message: 'Departments list retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await departmentService.updateDepartment(companyId, id, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Department updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await departmentService.deleteDepartment(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Department deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
