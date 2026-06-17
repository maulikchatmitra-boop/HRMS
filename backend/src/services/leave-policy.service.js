import LeavePolicy from '../models/leave-policy.model.js';
import LeaveBalance from '../models/leave-balance.model.js';
import User from '../models/user.model.js';
import { logAction } from './auditLog.service.js';

/**
 * Create a new leave policy.
 */
export const createLeavePolicy = async (companyId, data, actorId) => {
  const policy = new LeavePolicy({
    companyId,
    policyName: data.policyName.trim(),
    description: data.description || '',
    leaveAllocations: data.leaveAllocations,
    status: data.status || 'active',
    createdBy: actorId,
    updatedBy: actorId,
  });

  const saved = await policy.save();

  await logAction({
    companyId,
    userId: actorId,
    module: 'leave_policy',
    action: 'create',
    newData: saved.toObject(),
  });

  return saved;
};

/**
 * Get all leave policies for a company.
 */
export const getLeavePolicies = async (companyId) => {
  return await LeavePolicy.find({ companyId })
    .populate('leaveAllocations.leaveTypeId', 'name code')
    .sort({ policyName: 1 });
};

/**
 * Get specific policy by ID.
 */
export const getLeavePolicyById = async (companyId, id) => {
  const policy = await LeavePolicy.findOne({ _id: id, companyId })
    .populate('leaveAllocations.leaveTypeId', 'name code');
  if (!policy) {
    const error = new Error('Leave policy not found.');
    error.statusCode = 404;
    throw error;
  }
  return policy;
};

/**
 * Update a leave policy.
 */
export const updateLeavePolicy = async (companyId, id, updateData, actorId) => {
  const policy = await LeavePolicy.findOne({ _id: id, companyId });
  if (!policy) {
    const error = new Error('Leave policy not found.');
    error.statusCode = 404;
    throw error;
  }

  const oldData = policy.toObject();

  if (updateData.policyName !== undefined) policy.policyName = updateData.policyName.trim();
  if (updateData.description !== undefined) policy.description = updateData.description.trim();
  if (updateData.leaveAllocations !== undefined) policy.leaveAllocations = updateData.leaveAllocations;
  if (updateData.status !== undefined) policy.status = updateData.status;

  policy.updatedBy = actorId;
  const updated = await policy.save();

  await logAction({
    companyId,
    userId: actorId,
    module: 'leave_policy',
    action: 'update',
    oldData,
    newData: updated.toObject(),
  });

  return updated;
};

/**
 * Soft-deactivate a policy on delete.
 */
export const deleteLeavePolicy = async (companyId, id, actorId) => {
  return await updateLeavePolicy(companyId, id, { status: 'inactive' }, actorId);
};

/**
 * Assign policy and initialize/sync balances for matched employees.
 */
export const assignLeavePolicy = async (companyId, id, assignments, actorId) => {
  const policy = await LeavePolicy.findOne({ _id: id, companyId });
  if (!policy) {
    const error = new Error('Leave policy not found.');
    error.statusCode = 404;
    throw error;
  }
  if (policy.status !== 'active') {
    throw new Error('Cannot assign an inactive policy.');
  }

  const oldData = policy.toObject();
  policy.assignments = assignments;
  policy.updatedBy = actorId;
  const updated = await policy.save();

  // Log assignment update
  await logAction({
    companyId,
    userId: actorId,
    module: 'leave_policy',
    action: 'assign',
    oldData,
    newData: updated.toObject(),
  });

  // Trigger balance sync
  // Done synchronously here, but in production this can be delegated to a worker queue
  await syncBalancesForPolicy(companyId, updated);

  return updated;
};

/**
 * Syncs leave balances for all employees matching the policy assignments.
 */
const syncBalancesForPolicy = async (companyId, policy) => {
  const { assignments, leaveAllocations } = policy;
  if (!assignments || assignments.length === 0) return;

  // Build user query based on assignments
  const userQueries = [];
  for (const assign of assignments) {
    if (assign.type === 'company') {
      userQueries.push({ companyId, status: 'active' });
    } else if (assign.type === 'department') {
      userQueries.push({ companyId, departmentId: assign.targetId, status: 'active' });
    } else if (assign.type === 'role') {
      userQueries.push({ companyId, roleId: assign.targetId, status: 'active' });
    }
  }

  if (userQueries.length === 0) return;

  // Find all active employees matching assignments
  const employees = await User.find({ $or: userQueries }).select('_id').lean();
  if (employees.length === 0) return;

  // Sync balances for each employee
  for (const employee of employees) {
    for (const alloc of leaveAllocations) {
      const existingBalance = await LeaveBalance.findOne({
        companyId,
        employeeId: employee._id,
        leaveTypeId: alloc.leaveTypeId,
      });

      if (!existingBalance) {
        // Create new balance ledger
        const newBalance = new LeaveBalance({
          companyId,
          employeeId: employee._id,
          leaveTypeId: alloc.leaveTypeId,
          allocated: alloc.yearlyAllocation,
          used: 0,
          remaining: alloc.yearlyAllocation,
        });
        await newBalance.save();
      } else {
        // Update allocation and recalculate remaining
        existingBalance.allocated = alloc.yearlyAllocation;
        existingBalance.remaining = alloc.yearlyAllocation - existingBalance.used;
        // If remaining would drop below 0 due to overallocation adjustment, cap at 0
        if (existingBalance.remaining < 0) {
          existingBalance.remaining = 0;
        }
        await existingBalance.save();
      }
    }
  }
};
