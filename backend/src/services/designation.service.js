import Designation from '../models/designation.model.js';
import { logAction } from './auditLog.service.js';
import { safeExactMatch } from '../utils/regex.utils.js';

export const createDesignation = async (companyId, data, actorId) => {
  const existing = await Designation.findOne({
    companyId,
    title: safeExactMatch(data.title),
    isDeleted: false
  });
  if (existing) throw new Error('A designation with this title already exists.');

  const designation = new Designation({
    companyId, title: data.title, description: data.description || '',
    createdBy: actorId, updatedBy: actorId
  });
  const saved = await designation.save();
  await logAction({ companyId, userId: actorId, module: 'designation', action: 'create', newData: saved.toObject() });
  return saved;
};

export const getDesignationById = async (companyId, id) => {
  const designation = await Designation.findOne({ _id: id, isDeleted: false });
  if (!designation) throw new Error('Designation not found.');
  if (companyId && designation.companyId && designation.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  return designation;
};

export const getDesignations = async (companyId, queryParams = {}) => {
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 50;
  const skip = (page - 1) * limit;
  const filter = { companyId, isDeleted: false };
  if (queryParams.search) filter.title = { $regex: queryParams.search, $options: 'i' };
  const total = await Designation.countDocuments(filter);
  const designations = await Designation.find(filter).sort({ title: 1 }).skip(skip).limit(limit);
  return { designations, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

export const updateDesignation = async (companyId, id, updateData, actorId) => {
  const designation = await Designation.findOne({ _id: id, isDeleted: false });
  if (!designation) throw new Error('Designation not found.');
  if (companyId && designation.companyId && designation.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = designation.toObject();

  if (updateData.title && updateData.title.trim().toLowerCase() !== designation.title.toLowerCase()) {
    const existing = await Designation.findOne({ companyId, title: safeExactMatch(updateData.title), isDeleted: false });
    if (existing) throw new Error('A designation with this title already exists.');
  }

  ['title', 'description'].forEach(key => { if (updateData[key] !== undefined) designation[key] = updateData[key]; });
  designation.updatedBy = actorId;
  const updated = await designation.save();
  await logAction({ companyId, userId: actorId, module: 'designation', action: 'update', oldData, newData: updated.toObject() });
  return updated;
};

export const deleteDesignation = async (companyId, id, actorId) => {
  const designation = await Designation.findOne({ _id: id, isDeleted: false });
  if (!designation) throw new Error('Designation not found.');
  if (companyId && designation.companyId && designation.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = designation.toObject();
  designation.isDeleted = true; designation.deletedAt = new Date(); designation.deletedBy = actorId; designation.updatedBy = actorId;
  const deleted = await designation.save();
  await logAction({ companyId, userId: actorId, module: 'designation', action: 'delete', oldData, newData: null });
  return deleted;
};
