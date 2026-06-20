import AttendanceRecord from '../models/attendance-record.model.js';
import AttendanceSetting from '../models/attendance-setting.model.js';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import Shift from '../models/shift.model.js';
import LeaveRequest from '../models/leave-request.model.js';
import HolidayCalendar from '../models/holiday-calendar.model.js';
import { logAction } from './auditLog.service.js';
import mongoose from 'mongoose';

/**
 * Helper to fetch company settings or fall back to system defaults.
 */
export const getSettings = async (companyId) => {
  const active = await AttendanceSetting.findOne({
    companyId,
    effectiveTo: null,
  }).lean();

  return active || {
    fullDayMinutes: 480,
    halfDayMinutes: 240,
    fixedBreakMinutes: 60,
    earlyCheckoutTolerance: 15,
    weekOffDays: [0, 6],
  };
};

export const getCompanySettings = async (companyId) => {
  return getSettings(companyId);
};

export const updateCompanySettings = async (companyId, data) => {
  const {
    fullDayMinutes = 480,
    halfDayMinutes = 240,
    fixedBreakMinutes = 60,
    earlyCheckoutTolerance = 15,
    weekOffDays = [0, 6],
  } = data;

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const yesterdayEnd = new Date(todayStart.getTime() - 1);

  const active = await AttendanceSetting.findOne({
    companyId,
    effectiveTo: null,
  });

  if (!active) {
    const created = new AttendanceSetting({
      companyId,
      fullDayMinutes,
      halfDayMinutes,
      fixedBreakMinutes,
      earlyCheckoutTolerance,
      weekOffDays,
      effectiveFrom: todayStart,
      effectiveTo: null,
    });
    return await created.save();
  }

  const oldWeekOff = active.weekOffDays || [];
  const changed =
    oldWeekOff.length !== weekOffDays.length ||
    !oldWeekOff.every((val) => weekOffDays.includes(val));

  if (changed) {
    active.effectiveTo = yesterdayEnd;
    await active.save();

    const created = new AttendanceSetting({
      companyId,
      fullDayMinutes,
      halfDayMinutes,
      fixedBreakMinutes,
      earlyCheckoutTolerance,
      weekOffDays,
      effectiveFrom: todayStart,
      effectiveTo: null,
    });
    return await created.save();
  } else {
    active.fullDayMinutes = fullDayMinutes;
    active.halfDayMinutes = halfDayMinutes;
    active.fixedBreakMinutes = fixedBreakMinutes;
    active.earlyCheckoutTolerance = earlyCheckoutTolerance;
    return await active.save();
  }
};

/**
 * Formats a Date object as YYYY-MM-DD in the local/server timezone.
 */
export const formatDateString = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatTime12hBackend = (date) => {
  if (!date) return '';
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

/**
 * Handles Check In for an employee.
 */
export const checkIn = async (companyId, employeeId, actorId) => {
  // 1. Fetch employee and check shift assignment
  const employee = await User.findOne({ _id: employeeId, companyId }).populate('shiftId');
  if (!employee || !employee.shiftId) {
    throw new Error('Shift not assigned. Please contact HR/Admin.');
  }

  const shift = employee.shiftId;
  const now = new Date();
  const attendanceDate = formatDateString(now);

  // 2. Handle multiple check-ins today
  const existing = await AttendanceRecord.findOne({ companyId, employeeId, attendanceDate });
  if (existing) {
    if (existing.status === 'checked_in') {
      throw new Error('Already checked in.');
    }
    if (existing.regularizationStatus === 'approved' || existing.regularizationStatus === 'rejected') {
      throw new Error('This record is locked and cannot be modified.');
    }
    // They are checking in again!
    existing.status = 'checked_in';
    existing.approvalTimestamp = now; // Use approvalTimestamp as the start of the current session
    existing.regularizationStatus = null;
    // Note: Do not clear regularizationReason to preserve previous session reasons
    existing.previousStatus = null;
    existing.updatedBy = actorId;
    const saved = await existing.save();

    await logAction({
      companyId,
      userId: actorId,
      module: 'attendance',
      action: 'attendance.checkin',
      newData: saved.toObject(),
    });

    return saved;
  }

  // 3. Compute expected checkout time from shift end time
  const [endH, endM] = shift.endTime.split(':').map(Number);
  const expectedCheckoutTime = new Date(now);
  expectedCheckoutTime.setHours(endH, endM, 0, 0);

  const [startH, startM] = shift.startTime.split(':').map(Number);
  if ((endH * 60 + endM) < (startH * 60 + startM)) {
    expectedCheckoutTime.setDate(expectedCheckoutTime.getDate() + 1);
  }

  // 4. Calculate late arrival minutes based on shift.startTime
  const shiftStartTimeToday = new Date(now);
  shiftStartTimeToday.setHours(startH, startM, 0, 0);

  let lateMinutes = 0;
  if (now > shiftStartTimeToday) {
    lateMinutes = Math.floor((now.getTime() - shiftStartTimeToday.getTime()) / 60000);
  }

  // 5. Create AttendanceRecord with Shift Snapshot
  const record = new AttendanceRecord({
    companyId,
    employeeId,
    attendanceDate,
    checkInTime: now,
    expectedCheckoutTime,
    lateMinutes,
    status: 'checked_in',
    shiftId: shift._id,
    shiftName: shift.name,
    shiftStartTime: shift.startTime,
    shiftEndTime: shift.endTime,
    createdBy: actorId,
    updatedBy: actorId,
  });

  const saved = await record.save();

  // 6. Log Audit
  await logAction({
    companyId,
    userId: actorId,
    module: 'attendance',
    action: 'attendance.checkin',
    newData: saved.toObject(),
  });

  return saved;
};

/**
 * Handles Check Out for an employee.
 */
export const checkOut = async (companyId, employeeId, reason = '', actorId) => {
  const now = new Date();
  const attendanceDate = formatDateString(now);

  // 1. Find active check-in session for today
  const record = await AttendanceRecord.findOne({ companyId, employeeId, attendanceDate, status: 'checked_in' });
  if (!record) {
    throw new Error('No active Check In found for today.');
  }

  const settings = await getSettings(companyId);
  const checkInTime = record.checkInTime;
  const expectedCheckoutTime = record.expectedCheckoutTime;

  // 2. Enforce Check Out Tolerance Rule
  const diffToExpectedMs = expectedCheckoutTime.getTime() - now.getTime();
  const earlyCheckoutToleranceMs = settings.earlyCheckoutTolerance * 60 * 1000;

  let isEarlyCheckout = false;
  if (diffToExpectedMs > earlyCheckoutToleranceMs) {
    isEarlyCheckout = true;
    if (!reason || reason.trim().length === 0) {
      throw new Error('Early check-out detected. You must provide a justification reason to submit.');
    }
  }

  // 3. Compute working metrics (difference between First In and Last Out directly)
  const sessionStart = record.approvalTimestamp ? new Date(record.approvalTimestamp) : new Date(record.checkInTime);
  const sessionMinutes = Math.floor((now.getTime() - sessionStart.getTime()) / 60000);

  const remarksNum = Number(record.approvalRemarks);
  const prevActiveMinutes = !isNaN(remarksNum) ? remarksNum : 0;
  const totalActiveMinutes = prevActiveMinutes + sessionMinutes;

  record.approvalRemarks = String(totalActiveMinutes); // Keep accumulating active minutes during the day

  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - record.checkInTime.getTime()) / 60000));
  const totalOutsideTime = Math.max(0, elapsedMinutes - totalActiveMinutes);
  const workingMinutes = totalActiveMinutes;

  // 4. Calculate early exit minutes based on shiftEndTime snapshot
  const [endH, endM] = record.shiftEndTime.split(':').map(Number);
  const shiftEndTimeToday = new Date(now);
  shiftEndTimeToday.setHours(endH, endM, 0, 0);
  if (record.shiftStartTime > record.shiftEndTime) {
    // Overnight shift: end time is on the next day
    shiftEndTimeToday.setDate(shiftEndTimeToday.getDate() + 1);
  }

  let earlyExitMinutes = 0;
  if (now < shiftEndTimeToday) {
    earlyExitMinutes = Math.floor((shiftEndTimeToday.getTime() - now.getTime()) / 60000);
  }

  // Shortfall and overtime calculations
  let shortfallMinutes = 0;
  let overtimeMinutes = 0;
  if (workingMinutes < settings.fullDayMinutes) {
    shortfallMinutes = settings.fullDayMinutes - workingMinutes;
  } else if (workingMinutes > settings.fullDayMinutes) {
    overtimeMinutes = workingMinutes - settings.fullDayMinutes;
  }

  // 5. Calculate status
  let finalStatus = 'present';
  if (isEarlyCheckout) {
    finalStatus = 'pending_regularization';
    record.previousStatus = 'checked_in';
    
    // Format session timings and append to reason
    const sessionTimeStr = `[${formatTime12hBackend(sessionStart)} - ${formatTime12hBackend(now)}]`;
    const sessionReason = `${sessionTimeStr} ${reason}`;

    let baseReason = record.regularizationReason || '';
    // Strip any previous "(Total Out Time: ...)" suffix from the baseReason
    baseReason = baseReason.replace(/\s*\(Total Out Time:\s*\d+\s*mins\)/g, '');

    if (baseReason) {
      record.regularizationReason = `${baseReason} | ${sessionReason} (Total Out Time: ${totalOutsideTime} mins)`;
    } else {
      record.regularizationReason = `${sessionReason} (Total Out Time: ${totalOutsideTime} mins)`;
    }
    record.regularizationStatus = 'pending';
  } else {
    if (workingMinutes >= settings.fullDayMinutes) {
      finalStatus = 'present';
    } else if (workingMinutes >= settings.halfDayMinutes) {
      finalStatus = 'half_day';
    } else {
      finalStatus = 'absent';
    }
    // Clear regularization if checkout is now normal/completed
    record.regularizationReason = null;
    record.regularizationStatus = null;
    record.previousStatus = null;
  }

  const oldData = record.toObject();

  // 6. Update Record
  record.checkOutTime = now;
  record.workingMinutes = workingMinutes;
  record.earlyExitMinutes = earlyExitMinutes;
  record.shortfallMinutes = shortfallMinutes;
  record.overtimeMinutes = overtimeMinutes;
  record.status = finalStatus;
  record.approvalTimestamp = null; // Clear session start for next check-in
  record.updatedBy = actorId;

  const saved = await record.save();

  // 7. Log Audit
  await logAction({
    companyId,
    userId: actorId,
    module: 'attendance',
    action: 'attendance.checkout',
    oldData,
    newData: saved.toObject(),
  });

  return saved;
};

/**
 * Submits a regularization request.
 */
export const submitRegularization = async (companyId, employeeId, attendanceDate, reason, actorId) => {
  // 1. Check if record exists for the date
  let record = await AttendanceRecord.findOne({ companyId, employeeId, attendanceDate });

  // 2. If it exists, check for Lock Rule and Duplicate requests
  if (record) {
    if (record.status === 'pending_regularization') {
      throw new Error('An active regularization request is already pending for this date.');
    }
    // Past dates cannot be self-modified if already submitted or approved
    if (record.regularizationStatus === 'approved') {
      throw new Error('This record is locked and cannot be regularized further.');
    }
    record.previousStatus = record.status;
    record.status = 'pending_regularization';
    record.regularizationReason = reason;
    record.regularizationStatus = 'pending';
    record.updatedBy = actorId;
  } else {
    // 3. If no record exists (e.g. forgot check-in AND out), create a new one
    // Look up the employee's current shift snapshot
    const employee = await User.findOne({ _id: employeeId, companyId }).populate('shiftId');
    if (!employee || !employee.shiftId) {
      throw new Error('Cannot regularize without an active shift assignment.');
    }

    record = new AttendanceRecord({
      companyId,
      employeeId,
      attendanceDate,
      status: 'pending_regularization',
      regularizationReason: reason,
      regularizationStatus: 'pending',
      shiftId: employee.shiftId._id,
      shiftName: employee.shiftId.name,
      shiftStartTime: employee.shiftId.startTime,
      shiftEndTime: employee.shiftId.endTime,
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  const saved = await record.save();

  // 4. Log Audit
  await logAction({
    companyId,
    userId: actorId,
    module: 'attendance',
    action: 'attendance.regularization_requested',
    newData: saved.toObject(),
  });

  return saved;
};

/**
 * Handles regularization approval or rejection by Manager/Admin.
 */
export const approveRegularization = async (companyId, recordId, action, regularizedStatus, remarks, actorId, actorRole) => {
  const record = await AttendanceRecord.findById(recordId);
  if (!record) {
    throw new Error('Attendance record not found.');
  }

  // 1. Tenant Security
  if (record.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Manager scope validation
  const employee = await User.findById(record.employeeId);
  const isManager = actorRole && (actorRole.toLowerCase().includes('manager') || actorRole.toLowerCase().includes('lead'));
  
  if (isManager && (!employee.reportingManagerId || employee.reportingManagerId.toString() !== actorId.toString())) {
    const err = new Error('Forbidden: You can only approve requests for employees reporting directly to you.');
    err.statusCode = 403;
    throw err;
  }

  if (record.status !== 'pending_regularization') {
    throw new Error('This record is not pending regularization.');
  }

  const oldData = record.toObject();
  const prevStatus = record.previousStatus || 'missed_punch';

  // 3. Update Audit fields & status
  record.approvedBy = actorId;
  record.approvalRemarks = remarks || '';
  record.approvalTimestamp = new Date();
  record.previousStatus = prevStatus;

  if (action === 'approve') {
    record.status = regularizedStatus || 'present';
    record.regularizationStatus = 'approved';
    await record.save();
    
    await logAction({
      companyId,
      userId: actorId,
      module: 'attendance',
      action: 'attendance.regularization_approved',
      oldData,
      newData: record.toObject(),
    });
  } else {
    record.status = 'absent';
    record.regularizationStatus = 'rejected';
    await record.save();

    await logAction({
      companyId,
      userId: actorId,
      module: 'attendance',
      action: 'attendance.regularization_rejected',
      oldData,
      newData: record.toObject(),
    });
  }

  return record;
};

/**
 * HR/Admin manual override.
 */
export const overrideAttendance = async (companyId, overrideData, actorId) => {
  const { employeeId, attendanceDate, status, checkInTime, checkOutTime, overrideReason } = overrideData;

  let record = await AttendanceRecord.findOne({ companyId, employeeId, attendanceDate });
  const oldData = record ? record.toObject() : null;

  if (record) {
    record.status = status;
    record.checkInTime = checkInTime ? new Date(checkInTime) : null;
    record.checkOutTime = checkOutTime ? new Date(checkOutTime) : null;
    record.regularizationReason = overrideReason;
    record.updatedBy = actorId;
  } else {
    const employee = await User.findOne({ _id: employeeId, companyId }).populate('shiftId');
    if (!employee || !employee.shiftId) {
      throw new Error('Employee must have an assigned shift for manual override.');
    }
    record = new AttendanceRecord({
      companyId,
      employeeId,
      attendanceDate,
      status,
      checkInTime: checkInTime ? new Date(checkInTime) : null,
      checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
      regularizationReason: overrideReason,
      shiftId: employee.shiftId._id,
      shiftName: employee.shiftId.name,
      shiftStartTime: employee.shiftId.startTime,
      shiftEndTime: employee.shiftId.endTime,
      createdBy: actorId,
      updatedBy: actorId,
    });
  }

  const saved = await record.save();

  // Log Audit
  await logAction({
    companyId,
    userId: actorId,
    module: 'attendance',
    action: 'attendance.override',
    oldData,
    newData: saved.toObject(),
  });

  return saved;
};

/**
 * Helper to dynamically check leaves, holidays, and Sundays to merge virtual statuses.
 */
const resolveVirtualStatus = async (companyId, employeeId, dateStr, joinDateStr = null) => {
  const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

  // 0. Employment Join Date Check (based on createdAt)
  let actualJoinDateStr = joinDateStr;
  if (!actualJoinDateStr) {
    const employee = await User.findById(employeeId).select('createdAt').lean();
    if (employee && employee.createdAt) {
      actualJoinDateStr = formatDateString(employee.createdAt);
    }
  }

  if (actualJoinDateStr && dateStr < actualJoinDateStr) {
    return 'not_joined';
  }

  // 1. Leave Check
  const leave = await LeaveRequest.findOne({
    companyId,
    employeeId,
    status: 'approved',
    fromDate: { $lte: dateObj },
    toDate: { $gte: dateObj },
  });
  if (leave) return 'leave';

  // 2. Holiday Check
  const holiday = await HolidayCalendar.findOne({
    companyId,
    date: dateObj,
    isDeleted: false,
  });
  if (holiday) return 'holiday';

  // 3. Dynamic Week-off Check
  const activeSettings = await AttendanceSetting.findOne({
    companyId,
    effectiveFrom: { $lte: dateObj },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: dateObj } }
    ]
  }).lean();
  const weekOffDays = activeSettings?.weekOffDays ?? [0, 6];
  if (weekOffDays.includes(dateObj.getUTCDay())) {
    return 'week_off';
  }

  return 'absent';
};


/**
 * Nightly Cron Job Logic (runs at 11:59 PM).
 */
export const runDailyCronJob = async () => {
  const todayStr = formatDateString(new Date());
  console.log(`[Cron Job] Starting daily attendance consolidation for date: ${todayStr}`);

  try {
    const activeUsers = await User.find({ isSuperAdmin: false, status: 'active' });

    for (const user of activeUsers) {
      const companyId = user.companyId;
      const employeeId = user._id;

      let record = await AttendanceRecord.findOne({ companyId, employeeId, attendanceDate: todayStr });

      if (record) {
        // Forgotten Check Out -> Missed Punch
        if (record.status === 'checked_in') {
          record.status = 'missed_punch';
          await record.save();
          console.log(`[Cron] Marked employee ${employeeId} as missed_punch for today.`);
        }
      } else {
        // No record -> check leaves, holidays, week-offs
        const joinDateStr = user.createdAt ? formatDateString(user.createdAt) : null;
        const virtualStatus = await resolveVirtualStatus(companyId, employeeId, todayStr, joinDateStr);
        // Clean Policy: leave, holiday, week_off are virtual only and must never be saved in DB
        if (virtualStatus === 'absent') {
          // Verify they have a shift
          if (user.shiftId) {
            const shift = await Shift.findById(user.shiftId);
            if (shift) {
              const newRecord = new AttendanceRecord({
                companyId,
                employeeId,
                attendanceDate: todayStr,
                status: 'absent',
                shiftId: shift._id,
                shiftName: shift.name,
                shiftStartTime: shift.startTime,
                shiftEndTime: shift.endTime,
                createdBy: user._id, // System/Self trigger
                updatedBy: user._id,
              });
              await newRecord.save();
              console.log(`[Cron] Marked employee ${employeeId} as absent.`);
            }
          }
        }
      }
    }
    console.log('[Cron Job] Daily attendance consolidation completed successfully.');
  } catch (err) {
    console.error('[Cron Job] Consolidation failed:', err);
  }
};

/**
 * Returns dynamic logs matching actual database events and virtual leaves/holidays/week-offs.
 */
export const getMergedLogs = async (companyId, employeeId, startDateStr, endDateStr) => {
  const employee = await User.findById(employeeId).select('createdAt').lean();
  const joinDateStr = employee && employee.createdAt ? formatDateString(employee.createdAt) : null;

  const logs = await AttendanceRecord.find({
    companyId,
    employeeId,
    attendanceDate: { $gte: startDateStr, $lte: endDateStr },
  }).populate('approvedBy', 'firstName lastName');

  const merged = [];
  const [startY, startM, startD] = startDateStr.split('-').map(Number);
  const [endY, endM, endD] = endDateStr.split('-').map(Number);
  const start = new Date(startY, startM - 1, startD);
  const end = new Date(endY, endM - 1, endD);
  const todayStr = formatDateString(new Date());

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDateString(d);
    
    // Don't auto-resolve virtual status for future dates
    if (dateStr > todayStr) continue;

    // Hard boundary: dates before the user was created/joined are skipped (do not show previous data)
    if (joinDateStr && dateStr < joinDateStr) {
      continue;
    }

    const dbRecord = logs.find(l => l.attendanceDate === dateStr);

    if (dbRecord) {
      merged.push(dbRecord.toObject());
    } else {
      const vStatus = await resolveVirtualStatus(companyId, employeeId, dateStr, joinDateStr);
      // Construct a virtual log record
      merged.push({
        attendanceDate: dateStr,
        employeeId,
        companyId,
        status: vStatus,
        isVirtual: true,
      });
    }
  }

  return merged;
};


/**
 * Computes monthly summary.
 */
export const getMonthlySummary = async (companyId, employeeId, year, month) => {
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  
  // Find last day of month
  const lastDay = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const logs = await getMergedLogs(companyId, employeeId, startDateStr, endDateStr);

  const summary = {
    present: 0,
    halfDay: 0,
    absent: 0,
    leave: 0,
    holiday: 0,
    weekOff: 0,
    missedPunch: 0,
    pendingRegularization: 0,
  };

  logs.forEach(log => {
    switch (log.status) {
      case 'checked_in':
      case 'present':
        summary.present++;
        break;
      case 'half_day':
        summary.halfDay++;
        break;
      case 'absent':
        summary.absent++;
        break;
      case 'leave':
        summary.leave++;
        break;
      case 'holiday':
        summary.holiday++;
        break;
      case 'week_off':
        summary.weekOff++;
        break;
      case 'missed_punch':
        summary.missedPunch++;
        break;
      case 'pending_regularization':
        summary.pendingRegularization++;
        break;
    }
  });

  return summary;
};

/**
 * Returns dashboard metrics for today.
 */
export const getDashboardMetrics = async (companyId, query = {}) => {
  const todayStr = formatDateString(new Date());

  const filter = { companyId, attendanceDate: todayStr };
  
  // Scoping if manager
  if (query.managerId) {
    const subordinates = await User.find({ companyId, reportingManagerId: query.managerId }).select('_id');
    const subIds = subordinates.map(s => s._id);
    filter.employeeId = { $in: subIds };
  }

  const records = await AttendanceRecord.find(filter);

  const checkedInCount = records.filter(r => r.checkInTime !== null).length;
  const checkedOutCount = records.filter(r => r.checkOutTime !== null).length;
  const presentCount = records.filter(r => r.status === 'present').length;
  const halfDayCount = records.filter(r => r.status === 'half_day').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const lateCount = records.filter(r => r.lateMinutes > 0).length;
  const pendingRegsCount = records.filter(r => r.status === 'pending_regularization').length;

  return {
    presentToday: presentCount,
    absentToday: absentCount,
    halfDayToday: halfDayCount,
    lateArrivalsToday: lateCount,
    pendingRegularizations: pendingRegsCount,
    employeesCheckedIn: checkedInCount,
    employeesCheckedOut: checkedOutCount,
  };
};

/**
 * Computes company-wide monthly summary for all matching employees.
 */
export const getCompanyMonthlySummary = async (companyId, query) => {
  const { year, month, departmentId, search } = query;

  const targetYear = parseInt(year, 10) || new Date().getUTCFullYear();
  const targetMonth = parseInt(month, 10) || (new Date().getUTCMonth() + 1);

  // Exclude all admin roles
  const adminRoles = await Role.find({
    companyId,
    roleName: { $regex: /admin/i }
  }).select('_id').lean();
  const adminRoleIds = adminRoles.map(r => r._id);

  // 1. Fetch matching employees in the company
  const userFilter = {
    companyId,
    status: 'active',
    isSuperAdmin: false,
    roleId: { $nin: adminRoleIds },
  };

  if (departmentId) {
    userFilter.departmentId = departmentId;
  }

  if (search) {
    const cleanSearch = search.trim();
    const parts = cleanSearch.split(/\s+/);
    if (parts.length > 1) {
      userFilter.$and = [
        { firstName: new RegExp(parts[0], 'i') },
        { lastName: new RegExp(parts[1], 'i') }
      ];
    } else {
      const searchRegex = new RegExp(cleanSearch, 'i');
      userFilter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex }
      ];
    }
  }

  const employees = await User.find(userFilter)
    .populate('departmentId', 'name')
    .select('firstName lastName departmentId createdAt')
    .lean();

  const startDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(targetYear, targetMonth, 0).getDate();
  const endDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const results = [];

  const [startY, startM, startD] = startDateStr.split('-').map(Number);
  const [endY, endM, endD] = endDateStr.split('-').map(Number);
  const start = new Date(startY, startM - 1, startD);
  const end = new Date(endY, endM - 1, endD);

  const settingsList = await AttendanceSetting.find({ companyId })
    .sort({ effectiveFrom: 1 })
    .lean();

  const getSettingsForDateInMemory = (date) => {
    const checkDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const checkMs = checkDate.getTime();

    const match = settingsList.find((s) => {
      const fromMs = new Date(s.effectiveFrom).getTime();
      const toMs = s.effectiveTo ? new Date(s.effectiveTo).getTime() : Infinity;
      return checkMs >= fromMs && checkMs <= toMs;
    });

    return match || { weekOffDays: [0, 6] };
  };

  for (const emp of employees) {
    const joinDateStr = emp.createdAt ? formatDateString(emp.createdAt) : null;

    // Skip if employee joined after the end of the target month
    if (joinDateStr && joinDateStr > endDateStr) {
      continue;
    }

    // Calculate working days in the month on or after their join date
    let empWorkingDays = 0;
    const startCopy = new Date(start);
    for (let d = new Date(startCopy); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateString(d);
      if (joinDateStr && dateStr < joinDateStr) {
        continue;
      }
      const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday (local day)
      const currentSettings = getSettingsForDateInMemory(d);
      const weekOffDays = currentSettings.weekOffDays || [0, 6];
      if (!weekOffDays.includes(dayOfWeek)) {
        empWorkingDays++;
      }
    }

    // Fetch merged logs for this employee
    const logs = await getMergedLogs(companyId, emp._id, startDateStr, endDateStr);

    const summary = {
      present: 0,
      halfDay: 0,
      absent: 0,
      leave: 0,
      holiday: 0,
      weekOff: 0,
      missedPunch: 0,
      pendingRegularization: 0,
      lateDays: 0,
      overtimeMinutes: 0,
    };

    logs.forEach(log => {
      // Count statuses
      switch (log.status) {
        case 'checked_in':
        case 'present':
          summary.present++;
          break;
        case 'half_day':
          summary.halfDay++;
          break;
        case 'absent':
          summary.absent++;
          break;
        case 'leave':
          summary.leave++;
          break;
        case 'holiday':
          summary.holiday++;
          break;
        case 'week_off':
          summary.weekOff++;
          break;
        case 'missed_punch':
          summary.missedPunch++;
          break;
        case 'pending_regularization':
          summary.pendingRegularization++;
          break;
      }

      // Check for late and overtime
      if (log.lateMinutes > 0) {
        summary.lateDays++;
      }
      if (log.overtimeMinutes > 0) {
        summary.overtimeMinutes += log.overtimeMinutes;
      }
    });

    // Compute attendance percentage
    const attendancePercentage = empWorkingDays > 0
      ? Math.round(((summary.present + (summary.halfDay * 0.5)) / empWorkingDays) * 100)
      : 0;
    // Cap at 100% just in case of any overflow
    const cappedPercentage = Math.min(100, attendancePercentage);

    results.push({
      employee: {
        _id: emp._id,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.departmentId ? emp.departmentId.name : 'Unassigned',
      },
      workingDays: empWorkingDays,
      present: summary.present,
      halfDays: summary.halfDay,
      absent: summary.absent,
      leaveDays: summary.leave,
      lateDays: summary.lateDays,
      overtime: summary.overtimeMinutes > 0 ? `${Math.floor(summary.overtimeMinutes / 60)}h ${summary.overtimeMinutes % 60}m` : '-',
      attendancePercentage: cappedPercentage,
    });
  }

  return results;
};

