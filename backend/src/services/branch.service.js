import Branch from '../models/branch.model.js';
import { logAction } from './auditLog.service.js';
import { safeExactMatch } from '../utils/regex.utils.js';

export const createBranch = async (companyId, data, actorId) => {
  const existing = await Branch.findOne({ companyId, name: safeExactMatch(data.name), isDeleted: false });
  if (existing) throw new Error('A branch with this name already exists.');

  const branch = new Branch({
    companyId, name: data.name, address: data.address || '', city: data.city || '',
    state: data.state || '', country: data.country || '', zipCode: data.zipCode || '',
    createdBy: actorId, updatedBy: actorId
  });
  const saved = await branch.save();
  await logAction({ companyId, userId: actorId, module: 'branch', action: 'create', newData: saved.toObject() });
  return saved;
};

export const getBranchById = async (companyId, id) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: false });
  if (!branch) throw new Error('Branch not found.');
  if (companyId && branch.companyId && branch.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  return branch;
};

export const getBranches = async (companyId, queryParams = {}) => {
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 50;
  const skip = (page - 1) * limit;
  const filter = { companyId, isDeleted: false };
  if (queryParams.search) filter.name = { $regex: queryParams.search, $options: 'i' };
  if (queryParams.city) filter.city = { $regex: queryParams.city, $options: 'i' };
  const total = await Branch.countDocuments(filter);
  const branches = await Branch.find(filter).sort({ name: 1 }).skip(skip).limit(limit);
  return { branches, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

export const updateBranch = async (companyId, id, updateData, actorId) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: false });
  if (!branch) throw new Error('Branch not found.');
  if (companyId && branch.companyId && branch.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = branch.toObject();

  if (updateData.name && updateData.name.trim().toLowerCase() !== branch.name.toLowerCase()) {
    const existing = await Branch.findOne({ companyId, name: safeExactMatch(updateData.name), isDeleted: false });
    if (existing) throw new Error('A branch with this name already exists.');
  }

  ['name', 'address', 'city', 'state', 'country', 'zipCode'].forEach(key => { if (updateData[key] !== undefined) branch[key] = updateData[key]; });
  branch.updatedBy = actorId;
  const updated = await branch.save();
  await logAction({ companyId, userId: actorId, module: 'branch', action: 'update', oldData, newData: updated.toObject() });
  return updated;
};

export const deleteBranch = async (companyId, id, actorId) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: false });
  if (!branch) throw new Error('Branch not found.');
  if (companyId && branch.companyId && branch.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = branch.toObject();
  branch.isDeleted = true; branch.deletedAt = new Date(); branch.deletedBy = actorId; branch.updatedBy = actorId;
  const deleted = await branch.save();
  await logAction({ companyId, userId: actorId, module: 'branch', action: 'delete', oldData, newData: null });
  return deleted;
};
