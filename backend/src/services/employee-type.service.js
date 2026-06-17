import EmployeeType from '../models/employee-type.model.js';
import { logAction } from './auditLog.service.js';
import { safeExactMatch } from '../utils/regex.utils.js';

export const createEmployeeType = async (companyId, data, actorId) => {
  const existing = await EmployeeType.findOne({ companyId, name: safeExactMatch(data.name), isDeleted: false });
  if (existing) throw new Error('An employee type with this name already exists.');

  const employeeType = new EmployeeType({
    companyId, name: data.name, description: data.description || '',
    createdBy: actorId, updatedBy: actorId
  });
  const saved = await employeeType.save();
  await logAction({ companyId, userId: actorId, module: 'employeeType', action: 'create', newData: saved.toObject() });
  return saved;
};

export const getEmployeeTypeById = async (companyId, id) => {
  const employeeType = await EmployeeType.findOne({ _id: id, isDeleted: false });
  if (!employeeType) throw new Error('Employee type not found.');
  if (companyId && employeeType.companyId && employeeType.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  return employeeType;
};

export const getEmployeeTypes = async (companyId, queryParams = {}) => {
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 50;
  const skip = (page - 1) * limit;
  const filter = { companyId, isDeleted: false };
  if (queryParams.search) filter.name = { $regex: queryParams.search, $options: 'i' };
  const total = await EmployeeType.countDocuments(filter);
  const employeeTypes = await EmployeeType.find(filter).sort({ name: 1 }).skip(skip).limit(limit);
  return { employeeTypes, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

export const updateEmployeeType = async (companyId, id, updateData, actorId) => {
  const employeeType = await EmployeeType.findOne({ _id: id, isDeleted: false });
  if (!employeeType) throw new Error('Employee type not found.');
  if (companyId && employeeType.companyId && employeeType.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = employeeType.toObject();

  if (updateData.name && updateData.name.trim().toLowerCase() !== employeeType.name.toLowerCase()) {
    const existing = await EmployeeType.findOne({ companyId, name: safeExactMatch(updateData.name), isDeleted: false });
    if (existing) throw new Error('An employee type with this name already exists.');
  }

  ['name', 'description'].forEach(key => { if (updateData[key] !== undefined) employeeType[key] = updateData[key]; });
  employeeType.updatedBy = actorId;
  const updated = await employeeType.save();
  await logAction({ companyId, userId: actorId, module: 'employeeType', action: 'update', oldData, newData: updated.toObject() });
  return updated;
};

export const deleteEmployeeType = async (companyId, id, actorId) => {
  const employeeType = await EmployeeType.findOne({ _id: id, isDeleted: false });
  if (!employeeType) throw new Error('Employee type not found.');
  if (companyId && employeeType.companyId && employeeType.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = employeeType.toObject();
  employeeType.isDeleted = true; employeeType.deletedAt = new Date(); employeeType.deletedBy = actorId; employeeType.updatedBy = actorId;
  const deleted = await employeeType.save();
  await logAction({ companyId, userId: actorId, module: 'employeeType', action: 'delete', oldData, newData: null });
  return deleted;
};
