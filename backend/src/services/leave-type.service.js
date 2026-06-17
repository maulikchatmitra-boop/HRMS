import LeaveType from '../models/leave-type.model.js';
import { logAction } from './auditLog.service.js';

/**
 * Create a new leave type for a company.
 */
export const createLeaveType = async (companyId, data, actorId) => {
  const codeUpper = data.code.trim().toUpperCase();

  // Check unique code per company
  const existing = await LeaveType.findOne({ companyId, code: codeUpper });
  if (existing) {
    throw new Error(`Leave type with code '${codeUpper}' already exists.`);
  }

  const leaveType = new LeaveType({
    companyId,
    name: data.name.trim(),
    code: codeUpper,
    description: data.description || '',
    status: data.status || 'active',
    createdBy: actorId,
    updatedBy: actorId,
  });

  const saved = await leaveType.save();

  await logAction({
    companyId,
    userId: actorId,
    module: 'leave_type',
    action: 'create',
    newData: saved.toObject(),
  });

  return saved;
};

/**
 * Retrieve all leave types for a company.
 */
export const getLeaveTypes = async (companyId, query = {}) => {
  const filter = { companyId };
  if (query.status) {
    filter.status = query.status;
  }

  return await LeaveType.find(filter).sort({ name: 1 });
};

/**
 * Retrieve a specific leave type by ID.
 */
export const getLeaveTypeById = async (companyId, id) => {
  const leaveType = await LeaveType.findOne({ _id: id, companyId });
  if (!leaveType) {
    const error = new Error('Leave type not found.');
    error.statusCode = 404;
    throw error;
  }
  return leaveType;
};

/**
 * Update a leave type.
 */
export const updateLeaveType = async (companyId, id, updateData, actorId) => {
  const leaveType = await LeaveType.findOne({ _id: id, companyId });
  if (!leaveType) {
    const error = new Error('Leave type not found.');
    error.statusCode = 404;
    throw error;
  }

  const oldData = leaveType.toObject();

  if (updateData.code) {
    const codeUpper = updateData.code.trim().toUpperCase();
    if (codeUpper !== leaveType.code) {
      const existing = await LeaveType.findOne({ companyId, code: codeUpper, _id: { $ne: id } });
      if (existing) {
        throw new Error(`Leave type with code '${codeUpper}' already exists.`);
      }
      leaveType.code = codeUpper;
    }
  }

  if (updateData.name !== undefined) leaveType.name = updateData.name.trim();
  if (updateData.description !== undefined) leaveType.description = updateData.description.trim();
  if (updateData.status !== undefined) leaveType.status = updateData.status;

  leaveType.updatedBy = actorId;
  const updated = await leaveType.save();

  await logAction({
    companyId,
    userId: actorId,
    module: 'leave_type',
    action: 'update',
    oldData,
    newData: updated.toObject(),
  });

  return updated;
};

/**
 * Soft-deactivates a leave type (instead of physical deletion).
 */
export const deleteLeaveType = async (companyId, id, actorId) => {
  return await updateLeaveType(companyId, id, { status: 'inactive' }, actorId);
};
