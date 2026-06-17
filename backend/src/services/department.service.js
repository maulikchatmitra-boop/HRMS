import Department from '../models/department.model.js';
import { logAction } from './auditLog.service.js';
import { safeExactMatch } from '../utils/regex.utils.js';

export const createDepartment = async (companyId, data, actorId) => {
  const existing = await Department.findOne({
    companyId,
    name: safeExactMatch(data.name),
    isDeleted: false
  });
  
  if (existing) {
    throw new Error('A department with this name already exists.');
  }

  const department = new Department({
    companyId,
    name: data.name,
    code: data.code || '',
    description: data.description || '',
    createdBy: actorId,
    updatedBy: actorId
  });

  const saved = await department.save();

  await logAction({
    companyId,
    userId: actorId,
    module: 'department',
    action: 'create',
    newData: saved.toObject()
  });

  return saved;
};

export const getDepartmentById = async (companyId, id) => {
  const department = await Department.findOne({ _id: id, isDeleted: false });
  if (!department) {
    throw new Error('Department not found.');
  }
  if (companyId && department.companyId && department.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  return department;
};

export const getDepartments = async (companyId, queryParams = {}) => {
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const filter = { companyId, isDeleted: false };

  if (queryParams.search) {
    filter.name = { $regex: queryParams.search, $options: 'i' };
  }
  if (queryParams.code) {
    filter.code = queryParams.code;
  }

  const total = await Department.countDocuments(filter);
  const departments = await Department.find(filter)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);

  return {
    departments,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

export const updateDepartment = async (companyId, id, updateData, actorId) => {
  const department = await Department.findOne({ _id: id, isDeleted: false });
  if (!department) {
    throw new Error('Department not found.');
  }
  if (companyId && department.companyId && department.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }

  const oldData = department.toObject();

  if (updateData.name && updateData.name.trim().toLowerCase() !== department.name.toLowerCase()) {
    const existing = await Department.findOne({
      companyId,
      name: safeExactMatch(updateData.name),
      isDeleted: false
    });
    if (existing) {
      throw new Error('A department with this name already exists.');
    }
  }

  const allowedUpdates = ['name', 'code', 'description'];
  allowedUpdates.forEach(key => {
    if (updateData[key] !== undefined) {
      department[key] = updateData[key];
    }
  });

  department.updatedBy = actorId;
  const updated = await department.save();

  await logAction({
    companyId,
    userId: actorId,
    module: 'department',
    action: 'update',
    oldData,
    newData: updated.toObject()
  });

  return updated;
};

export const deleteDepartment = async (companyId, id, actorId) => {
  const department = await Department.findOne({ _id: id, isDeleted: false });
  if (!department) {
    throw new Error('Department not found.');
  }
  if (companyId && department.companyId && department.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }

  const oldData = department.toObject();

  department.isDeleted = true;
  department.deletedAt = new Date();
  department.deletedBy = actorId;
  department.updatedBy = actorId;
  
  const deleted = await department.save();

  await logAction({
    companyId,
    userId: actorId,
    module: 'department',
    action: 'delete',
    oldData,
    newData: null
  });

  return deleted;
};
