import Shift from '../models/shift.model.js';
import { logAction } from './auditLog.service.js';
import { safeExactMatch } from '../utils/regex.utils.js';

export const createShift = async (companyId, data, actorId) => {
  const existing = await Shift.findOne({ companyId, name: safeExactMatch(data.name), isDeleted: false });
  if (existing) throw new Error('A shift with this name already exists.');

  const shift = new Shift({
    companyId, name: data.name, startTime: data.startTime, endTime: data.endTime,
    description: data.description || '', createdBy: actorId, updatedBy: actorId
  });
  const saved = await shift.save();
  await logAction({ companyId, userId: actorId, module: 'shift', action: 'create', newData: saved.toObject() });
  return saved;
};

export const getShiftById = async (companyId, id) => {
  const shift = await Shift.findOne({ _id: id, isDeleted: false });
  if (!shift) throw new Error('Shift not found.');
  if (companyId && shift.companyId && shift.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  return shift;
};

export const getShifts = async (companyId, queryParams = {}) => {
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 50;
  const skip = (page - 1) * limit;
  const filter = { companyId, isDeleted: false };
  if (queryParams.search) filter.name = { $regex: queryParams.search, $options: 'i' };
  const total = await Shift.countDocuments(filter);
  const shifts = await Shift.find(filter).sort({ name: 1 }).skip(skip).limit(limit);
  return { shifts, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

export const updateShift = async (companyId, id, updateData, actorId) => {
  const shift = await Shift.findOne({ _id: id, isDeleted: false });
  if (!shift) throw new Error('Shift not found.');
  if (companyId && shift.companyId && shift.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = shift.toObject();

  if (updateData.name && updateData.name.trim().toLowerCase() !== shift.name.toLowerCase()) {
    const existing = await Shift.findOne({ companyId, name: safeExactMatch(updateData.name), isDeleted: false });
    if (existing) throw new Error('A shift with this name already exists.');
  }

  ['name', 'startTime', 'endTime', 'description'].forEach(key => { if (updateData[key] !== undefined) shift[key] = updateData[key]; });
  shift.updatedBy = actorId;
  const updated = await shift.save();
  await logAction({ companyId, userId: actorId, module: 'shift', action: 'update', oldData, newData: updated.toObject() });
  return updated;
};

export const deleteShift = async (companyId, id, actorId) => {
  const shift = await Shift.findOne({ _id: id, isDeleted: false });
  if (!shift) throw new Error('Shift not found.');
  if (companyId && shift.companyId && shift.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = shift.toObject();
  shift.isDeleted = true; shift.deletedAt = new Date(); shift.deletedBy = actorId; shift.updatedBy = actorId;
  const deleted = await shift.save();
  await logAction({ companyId, userId: actorId, module: 'shift', action: 'delete', oldData, newData: null });
  return deleted;
};
