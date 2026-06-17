import LeaveRequest from '../models/leave-request.model.js';
import HolidayCalendar from '../models/holiday-calendar.model.js';
import User from '../models/user.model.js';

const startOfDay = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

const endOfDay = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
};

/**
 * Fetch calendar data: approved leaves, team leaves, and holidays.
 */
export const getLeaveCalendar = async (companyId, query, actorId, actorRole) => {
  const year = parseInt(query.year, 10) || new Date().getUTCFullYear();
  const month = parseInt(query.month, 10) || (new Date().getUTCMonth() + 1); // 1-indexed (Jan = 1, Dec = 12)

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));

  const leaveFilter = {
    companyId,
    status: 'approved',
    fromDate: { $lte: endDate },
    toDate: { $gte: startDate },
  };

  // Determine if we should restrict to Team Leaves (department level)
  const isHR = actorRole && (actorRole.toLowerCase().includes('hr') || actorRole.toLowerCase().includes('admin'));
  const isTeamScope = query.scope === 'team' || !isHR;

  if (isTeamScope) {
    const userDoc = await User.findById(actorId).select('departmentId').lean();
    if (userDoc && userDoc.departmentId) {
      const deptEmployees = await User.find({
        companyId,
        departmentId: userDoc.departmentId,
        status: 'active',
      }).select('_id').lean();
      const employeeIds = deptEmployees.map((e) => e._id);
      leaveFilter.employeeId = { $in: employeeIds };
    } else {
      // If employee has no department assigned, show only their own leaves
      leaveFilter.employeeId = actorId;
    }
  }

  // Fetch approved leaves and public holidays in parallel
  const [leaves, holidays] = await Promise.all([
    LeaveRequest.find(leaveFilter)
      .populate('leaveTypeId', 'name code')
      .select('employeeId employeeName departmentName leaveTypeId fromDate toDate totalDays isHalfDay reason')
      .lean(),
    HolidayCalendar.find({
      companyId,
      date: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    })
      .select('name date description isOptional')
      .lean(),
  ]);

  return {
    leaves,
    holidays,
  };
};
