import LeaveRequest from '../models/leave-request.model.js';
import LeaveBalance from '../models/leave-balance.model.js';
import LeaveType from '../models/leave-type.model.js';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import HolidayCalendar from '../models/holiday-calendar.model.js';
import { logAction } from './auditLog.service.js';
import { createNotification } from './leave-notification.service.js';

const startOfDay = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

const endOfDay = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
};

/**
 * Calculates working days between two dates, excluding weekends and holidays.
 */
export const calculateWorkingDays = async (companyId, fromDate, toDate, isHalfDay = false) => {
  if (isHalfDay) {
    return 0.5;
  }

  const start = startOfDay(fromDate);
  const end = startOfDay(toDate);

  if (start > end) {
    throw new Error('From date must be on or before To date.');
  }

  // Fetch holidays for the company in the range
  const holidays = await HolidayCalendar.find({
    companyId,
    date: { $gte: start, $lte: endOfDay(end) },
    isDeleted: false,
  }).lean();

  const holidayTimestamps = holidays.map((h) => startOfDay(h.date).getTime());

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayTimestamps.includes(current.getTime());

    if (!isWeekend && !isHoliday) {
      workingDays++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return workingDays;
};

/**
 * Apply for a leave request.
 */
export const createLeaveRequest = async (companyId, data, actorId) => {
  const { leaveTypeId, fromDate, toDate, isHalfDay, reason, attachment } = data;

  const start = startOfDay(fromDate);
  const end = startOfDay(toDate);

  if (isHalfDay && start.getTime() !== end.getTime()) {
    throw new Error('Half day leave must be applied for a single day (From and To date must match).');
  }

  // 1. Calculate working days (exclude holidays & weekends)
  const totalDays = await calculateWorkingDays(companyId, fromDate, toDate, isHalfDay);
  if (totalDays === 0) {
    throw new Error('Leave request cannot be submitted because the selected range contains only weekends and/or public holidays.');
  }

  // 2. Fetch employee with manager details and department
  const employee = await User.findOne({ _id: actorId, companyId })
    .populate('departmentId')
    .lean();

  if (!employee) {
    throw new Error('Employee profile not found.');
  }

  // 3. Prevent Overlaps
  const overlappingRequest = await LeaveRequest.findOne({
    companyId,
    employeeId: actorId,
    status: { $nin: ['rejected', 'cancelled'] },
    $or: [
      {
        fromDate: { $lte: end },
        toDate: { $gte: start },
      },
    ],
  });

  if (overlappingRequest) {
    throw new Error('You have already applied for or taken leave during this date range.');
  }

  // 4. Validate Balance
  const balance = await LeaveBalance.findOne({ companyId, employeeId: actorId, leaveTypeId });
  if (!balance) {
    throw new Error('No leave balance configured for this leave type. Please contact HR.');
  }

  if (balance.remaining < totalDays) {
    throw new Error(`Insufficient leave balance. Requested: ${totalDays} day(s), Available: ${balance.remaining} day(s).`);
  }

  // 5. Check reporting manager status and map workflow
  let status = 'pending_manager';
  if (!employee.reportingManagerId) {
    status = 'pending_hr'; // Skip manager stage automatically
  }

  const employeeName = `${employee.firstName} ${employee.lastName}`;
  const departmentName = employee.departmentId?.name || 'Unassigned';

  const leaveRequest = new LeaveRequest({
    companyId,
    employeeId: actorId,
    employeeName,
    employeeCode: employee.employeeCode || '',
    departmentName,
    leaveTypeId,
    fromDate: start,
    toDate: end,
    totalDays,
    isHalfDay: !!isHalfDay,
    reason,
    attachment: attachment || null,
    status,
    approvalHistory: [
      {
        actorId,
        action: 'apply',
        remarks: reason,
        createdAt: new Date(),
      },
    ],
  });

  const saved = await leaveRequest.save();

  // 6. Dispatch Notifications
  if (status === 'pending_manager') {
    await createNotification({
      companyId,
      userId: employee.reportingManagerId,
      type: 'leave_applied',
      referenceId: saved._id,
      title: 'New Leave Request',
      message: `${employeeName} has applied for ${totalDays} day(s) of leave starting ${new Date(fromDate).toLocaleDateString()}.`,
    });
  } else {
    // Notify HR
    const hrUsers = await getHRUsers(companyId);
    for (const hr of hrUsers) {
      await createNotification({
        companyId,
        userId: hr._id,
        type: 'leave_applied',
        referenceId: saved._id,
        title: 'New Leave Request (Pending HR)',
        message: `${employeeName} has applied for ${totalDays} day(s) of leave starting ${new Date(fromDate).toLocaleDateString()} (No Manager Assigned).`,
      });
    }
  }

  // 7. Audit log
  await logAction({
    companyId,
    userId: actorId,
    module: 'leave_request',
    action: 'apply',
    newData: saved.toObject(),
  });

  return saved;
};

/**
 * Handle Leave Actions: Approve, Reject, Send Back, Cancel.
 */
export const handleLeaveAction = async (companyId, id, actionData, actorId, actorRole) => {
  const { action, remarks } = actionData;

  const request = await LeaveRequest.findOne({ _id: id, companyId });
  if (!request) {
    const error = new Error('Leave request not found.');
    error.statusCode = 404;
    throw error;
  }

  const employee = await User.findOne({ _id: request.employeeId, companyId }).lean();
  const oldData = request.toObject();

  // 1. Process Cancel Action (Employee only)
  if (action === 'cancel') {
    if (request.employeeId.toString() !== actorId.toString()) {
      const error = new Error('Only the applying employee can cancel this request.');
      error.statusCode = 403;
      throw error;
    }

    if (!['pending_manager', 'pending_hr', 'sent_back'].includes(request.status)) {
      throw new Error(`Cannot cancel a leave request that is already ${request.status}.`);
    }

    request.status = 'cancelled';
    request.approvalHistory.push({ actorId, action: 'cancel', remarks: remarks || 'Cancelled by employee' });
    const saved = await request.save();

    // Notify manager and/or HR/Admins
    if (oldData.status === 'pending_manager' && employee && employee.reportingManagerId) {
      await createNotification({
        companyId,
        userId: employee.reportingManagerId,
        type: 'leave_cancelled',
        referenceId: saved._id,
        title: 'Leave Request Cancelled',
        message: `${request.employeeName} has cancelled their leave request.`,
      });
    } else if (oldData.status === 'pending_hr') {
      const hrUsers = await getHRUsers(companyId);
      for (const hr of hrUsers) {
        await createNotification({
          companyId,
          userId: hr._id,
          type: 'leave_cancelled',
          referenceId: saved._id,
          title: 'Leave Request Cancelled',
          message: `${request.employeeName} has cancelled their leave request.`,
        });
      }
      if (employee && employee.reportingManagerId) {
        await createNotification({
          companyId,
          userId: employee.reportingManagerId,
          type: 'leave_cancelled',
          referenceId: saved._id,
          title: 'Leave Request Cancelled',
          message: `${request.employeeName} has cancelled their leave request.`,
        });
      }
    } else {
      if (employee && employee.reportingManagerId) {
        await createNotification({
          companyId,
          userId: employee.reportingManagerId,
          type: 'leave_cancelled',
          referenceId: saved._id,
          title: 'Leave Request Cancelled',
          message: `${request.employeeName} has cancelled their leave request.`,
        });
      }
      const hrUsers = await getHRUsers(companyId);
      for (const hr of hrUsers) {
        await createNotification({
          companyId,
          userId: hr._id,
          type: 'leave_cancelled',
          referenceId: saved._id,
          title: 'Leave Request Cancelled',
          message: `${request.employeeName} has cancelled their leave request.`,
        });
      }
    }

    await logAction({ companyId, userId: actorId, module: 'leave_request', action: 'cancel', oldData, newData: saved.toObject() });
    return saved;
  }

  // 2. Process Manager / HR approvals
  // Validate manager check
  if (request.status === 'pending_manager') {
    const isReportingManager = employee.reportingManagerId && employee.reportingManagerId.toString() === actorId.toString();
    if (!isReportingManager) {
      const error = new Error('Only the assigned reporting manager can act on this request.');
      error.statusCode = 403;
      throw error;
    }

    if (action === 'approve') {
      request.status = 'pending_hr';
      request.approvalHistory.push({ actorId, action: 'approve', remarks: remarks || 'Approved by Manager' });
      const saved = await request.save();

      // Notify HR
      const hrUsers = await getHRUsers(companyId);
      for (const hr of hrUsers) {
        await createNotification({
          companyId,
          userId: hr._id,
          type: 'leave_applied',
          referenceId: saved._id,
          title: 'Leave Request Pending HR Approval',
          message: `${request.employeeName}'s leave request has been approved by manager and is pending HR approval.`,
        });
      }

      // Notify Employee
      await createNotification({
        companyId,
        userId: request.employeeId,
        type: 'leave_approved',
        referenceId: saved._id,
        title: 'Leave Request Approved by Manager',
        message: `Your leave request starting ${request.fromDate.toLocaleDateString()} has been approved by your manager and is pending final HR approval.`,
      });

      await logAction({ companyId, userId: actorId, module: 'leave_request', action: 'approve_manager', oldData, newData: saved.toObject() });
      return saved;
    }
  } else if (request.status === 'pending_hr') {
    // Only HR or Admin can act on pending_hr
    const isHR = actorRole && (actorRole.toLowerCase().includes('hr') || actorRole.toLowerCase().includes('admin'));
    if (!isHR) {
      const error = new Error('Only HR or Company Admin can perform final approval.');
      error.statusCode = 403;
      throw error;
    }

    if (action === 'approve') {
      // Final Approval: Need to deduct leave balances
      const balance = await LeaveBalance.findOne({ companyId, employeeId: request.employeeId, leaveTypeId: request.leaveTypeId });
      if (!balance) {
        throw new Error('No leave balance found for this employee.');
      }

      // Re-validate balance before final approval
      if (balance.remaining < request.totalDays) {
        throw new Error(`Cannot approve: Employee has insufficient leave balance. Remaining: ${balance.remaining}, Required: ${request.totalDays}.`);
      }

      // Update balance ledger
      balance.used += request.totalDays;
      balance.remaining = balance.allocated - balance.used;
      await balance.save();

      request.status = 'approved';
      request.approvalHistory.push({ actorId, action: 'approve', remarks: remarks || 'Approved by HR' });
      const saved = await request.save();

      // Notify Employee
      await createNotification({
        companyId,
        userId: request.employeeId,
        type: 'leave_approved',
        referenceId: saved._id,
        title: 'Leave Request Approved',
        message: `Your leave request for ${request.totalDays} day(s) starting ${request.fromDate.toLocaleDateString()} has been approved.`,
      });

      await logAction({ companyId, userId: actorId, module: 'leave_request', action: 'approve_final', oldData, newData: saved.toObject() });
      return saved;
    }
  } else {
    throw new Error(`Cannot perform '${action}' on a request with status '${request.status}'.`);
  }

  // 3. Process Reject & Send Back (Shared logic for Manager & HR)
  if (action === 'reject') {
    request.status = 'rejected';
    request.approvalHistory.push({ actorId, action: 'reject', remarks: remarks || '' });
    const saved = await request.save();

    // Notify Employee
    await createNotification({
      companyId,
      userId: request.employeeId,
      type: 'leave_rejected',
      referenceId: saved._id,
      title: 'Leave Request Rejected',
      message: `Your leave request starting ${request.fromDate.toLocaleDateString()} was rejected: "${remarks}".`,
    });

    await logAction({ companyId, userId: actorId, module: 'leave_request', action: 'reject', oldData, newData: saved.toObject() });
    return saved;
  }

  if (action === 'send_back') {
    request.status = 'sent_back';
    request.approvalHistory.push({ actorId, action: 'send_back', remarks: remarks || '' });
    const saved = await request.save();

    // Notify Employee
    await createNotification({
      companyId,
      userId: request.employeeId,
      type: 'leave_sent_back',
      referenceId: saved._id,
      title: 'Leave Request Sent Back',
      message: `Your leave request starting ${request.fromDate.toLocaleDateString()} was sent back for revision: "${remarks}".`,
    });

    await logAction({ companyId, userId: actorId, module: 'leave_request', action: 'send_back', oldData, newData: saved.toObject() });
    return saved;
  }

  throw new Error(`Unsupported action: ${action}`);
};

/**
 * Get leave requests with pagination and filters.
 */
export const getLeaveRequests = async (companyId, query, actorId, actorRole) => {
  const filter = { companyId };
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  // Filter based on "type"
  if (query.type === 'my-requests') {
    filter.employeeId = actorId;
  } else if (query.type === 'approvals') {
    // For managers: pending approvals where they are reporting manager
    // For HR: pending approvals in the HR stage
    const isHR = actorRole && (actorRole.toLowerCase().includes('hr') || actorRole.toLowerCase().includes('admin'));
    
    if (isHR) {
      // HR/Admin can also be a reporting manager. Fetch pending_hr requests OR pending_manager requests for their team.
      const reportingEmployees = await User.find({ companyId, reportingManagerId: actorId }).select('_id').lean();
      const employeeIds = reportingEmployees.map((e) => e._id);
      filter.$or = [
        { status: 'pending_hr' },
        { status: 'pending_manager', employeeId: { $in: employeeIds } },
      ];
    } else {
      // Find all employees reporting to this manager
      const reportingEmployees = await User.find({ companyId, reportingManagerId: actorId }).select('_id').lean();
      const employeeIds = reportingEmployees.map((e) => e._id);
      filter.employeeId = { $in: employeeIds };
      filter.status = 'pending_manager';
    }
  } else {
    // "all" or historical
    // If not HR/Admin, restrict to their own requests or team requests
    const isHR = actorRole && (actorRole.toLowerCase().includes('hr') || actorRole.toLowerCase().includes('admin'));
    if (!isHR) {
      const reportingEmployees = await User.find({ companyId, reportingManagerId: actorId }).select('_id').lean();
      const employeeIds = reportingEmployees.map((e) => e._id);
      employeeIds.push(actorId); // Include self
      filter.employeeId = { $in: employeeIds };
    }
  }

  if (query.status) {
    filter.status = query.status;
  }
  if (query.employeeId) {
    filter.employeeId = query.employeeId;
  }
  if (query.leaveTypeId) {
    filter.leaveTypeId = query.leaveTypeId;
  }

  const total = await LeaveRequest.countDocuments(filter);
  const requests = await LeaveRequest.find(filter)
    .populate('leaveTypeId', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    requests,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get leave request by ID.
 */
export const getLeaveRequestById = async (companyId, id, actorId, actorRole) => {
  const request = await LeaveRequest.findOne({ _id: id, companyId })
    .populate('leaveTypeId', 'name code')
    .populate('approvalHistory.actorId', 'firstName lastName email');

  if (!request) {
    const error = new Error('Leave request not found.');
    error.statusCode = 404;
    throw error;
  }

  // Security checks (IDOR)
  const isOwn = request.employeeId.toString() === actorId.toString();
  const isHR = actorRole && (actorRole.toLowerCase().includes('hr') || actorRole.toLowerCase().includes('admin'));
  
  let isManager = false;
  const employee = await User.findById(request.employeeId).lean();
  if (employee && employee.reportingManagerId && employee.reportingManagerId.toString() === actorId.toString()) {
    isManager = true;
  }

  if (!isOwn && !isHR && !isManager) {
    const error = new Error('Access forbidden. You do not own this resource.');
    error.statusCode = 403;
    throw error;
  }

  return request;
};

/**
 * Private helper to fetch all active HR and Admin users in the company.
 */
const getHRUsers = async (companyId) => {
  const roles = await Role.find({
    companyId,
    roleName: { $regex: /hr|admin/i },
  }).select('_id').lean();

  const roleIds = roles.map((r) => r._id);
  if (roleIds.length === 0) return [];

  return await User.find({
    companyId,
    roleId: { $in: roleIds },
    status: 'active',
  }).select('_id').lean();
};
