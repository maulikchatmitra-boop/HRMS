import LeaveBalance from '../models/leave-balance.model.js';
import LeaveType from '../models/leave-type.model.js';
import User from '../models/user.model.js';
import { logAction } from './auditLog.service.js';

/**
 * Get leave balances with filters.
 */
export const getLeaveBalances = async (companyId, query = {}) => {
  const filter = { companyId };
  if (query.employeeId) {
    filter.employeeId = query.employeeId;
  }
  if (query.leaveTypeId) {
    filter.leaveTypeId = query.leaveTypeId;
  }

  return await LeaveBalance.find(filter)
    .populate('leaveTypeId', 'name code status')
    .populate('employeeId', 'firstName lastName email departmentId employeeCode')
    .sort({ employeeId: 1 });
};

/**
 * Manual Balance Adjustment by HR/Admin.
 */
export const adjustLeaveBalance = async (companyId, data, actorId) => {
  const { employeeId, leaveTypeId, adjustmentAmount, type, remarks } = data;

  // 1. Verify employee belongs to company
  const employee = await User.findOne({ _id: employeeId, companyId });
  if (!employee) {
    throw new Error('Employee not found in this company.');
  }

  // 2. Verify leave type exists
  const leaveType = await LeaveType.findOne({ _id: leaveTypeId, companyId });
  if (!leaveType) {
    throw new Error('Leave type not found.');
  }

  // 3. Find or create balance record
  let balance = await LeaveBalance.findOne({ companyId, employeeId, leaveTypeId });
  if (!balance) {
    balance = new LeaveBalance({
      companyId,
      employeeId,
      leaveTypeId,
      allocated: 0,
      used: 0,
      remaining: 0,
    });
  }

  const oldData = balance.toObject();

  // 4. Apply adjustment
  let newAllocated = balance.allocated;
  if (type === 'add') {
    newAllocated += adjustmentAmount;
  } else if (type === 'deduct') {
    newAllocated -= adjustmentAmount;
  } else if (type === 'set') {
    newAllocated = adjustmentAmount;
  }

  if (newAllocated < 0) {
    throw new Error('Allocated balance cannot be negative.');
  }

  // Calculate new remaining and check if negative
  const newRemaining = newAllocated - balance.used;
  if (newRemaining < 0) {
    throw new Error(`Adjustment failed: Remaining balance cannot become negative. Allocated (${newAllocated}) would be less than Used (${balance.used}).`);
  }

  balance.allocated = newAllocated;
  balance.remaining = newRemaining;
  const saved = await balance.save();

  // 5. Log audit action
  await logAction({
    companyId,
    userId: actorId,
    module: 'leave_balance',
    action: `adjust_${type}`,
    oldData,
    newData: {
      balance: saved.toObject(),
      adjustmentAmount,
      type,
      remarks,
    },
  });

  return saved;
};
