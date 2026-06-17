import WorkLocation from '../models/work-location.model.js';
import { logAction } from './auditLog.service.js';
import { safeExactMatch } from '../utils/regex.utils.js';

export const createWorkLocation = async (companyId, data, actorId) => {
  const existing = await WorkLocation.findOne({ companyId, name: safeExactMatch(data.name), isDeleted: false });
  if (existing) throw new Error('A work location with this name already exists.');

  const workLocation = new WorkLocation({
    companyId, name: data.name, description: data.description || '',
    createdBy: actorId, updatedBy: actorId
  });
  const saved = await workLocation.save();
  await logAction({ companyId, userId: actorId, module: 'workLocation', action: 'create', newData: saved.toObject() });
  return saved;
};

export const getWorkLocationById = async (companyId, id) => {
  const workLocation = await WorkLocation.findOne({ _id: id, isDeleted: false });
  if (!workLocation) throw new Error('Work location not found.');
  if (companyId && workLocation.companyId && workLocation.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  return workLocation;
};

export const getWorkLocations = async (companyId, queryParams = {}) => {
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 50;
  const skip = (page - 1) * limit;
  const filter = { companyId, isDeleted: false };
  if (queryParams.search) filter.name = { $regex: queryParams.search, $options: 'i' };
  const total = await WorkLocation.countDocuments(filter);
  const workLocations = await WorkLocation.find(filter).sort({ name: 1 }).skip(skip).limit(limit);
  return { workLocations, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

export const updateWorkLocation = async (companyId, id, updateData, actorId) => {
  const workLocation = await WorkLocation.findOne({ _id: id, isDeleted: false });
  if (!workLocation) throw new Error('Work location not found.');
  if (companyId && workLocation.companyId && workLocation.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = workLocation.toObject();

  if (updateData.name && updateData.name.trim().toLowerCase() !== workLocation.name.toLowerCase()) {
    const existing = await WorkLocation.findOne({ companyId, name: safeExactMatch(updateData.name), isDeleted: false });
    if (existing) throw new Error('A work location with this name already exists.');
  }

  ['name', 'description'].forEach(key => { if (updateData[key] !== undefined) workLocation[key] = updateData[key]; });
  workLocation.updatedBy = actorId;
  const updated = await workLocation.save();
  await logAction({ companyId, userId: actorId, module: 'workLocation', action: 'update', oldData, newData: updated.toObject() });
  return updated;
};

export const deleteWorkLocation = async (companyId, id, actorId) => {
  const workLocation = await WorkLocation.findOne({ _id: id, isDeleted: false });
  if (!workLocation) throw new Error('Work location not found.');
  if (companyId && workLocation.companyId && workLocation.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = workLocation.toObject();
  workLocation.isDeleted = true; workLocation.deletedAt = new Date(); workLocation.deletedBy = actorId; workLocation.updatedBy = actorId;
  const deleted = await workLocation.save();
  await logAction({ companyId, userId: actorId, module: 'workLocation', action: 'delete', oldData, newData: null });
  return deleted;
};
