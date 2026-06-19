import * as attendanceService from '../services/attendance.service.js';
import User from '../models/user.model.js';
import AttendanceRecord from '../models/attendance-record.model.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const checkIn = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await attendanceService.checkIn(companyId, userId, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Checked In successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { reason } = req.body;
    const data = await attendanceService.checkOut(companyId, userId, reason, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Checked Out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const regularize = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { attendanceDate, regularizationReason } = req.body;
    const data = await attendanceService.submitRegularization(
      companyId,
      userId,
      attendanceDate,
      regularizationReason,
      userId
    );
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Regularization request submitted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const approveRegularization = async (req, res, next) => {
  try {
    const { companyId, userId, roleName } = req.user;
    const { id } = req.params;
    const { action, regularizedStatus, remarks } = req.body;
    
    const data = await attendanceService.approveRegularization(
      companyId,
      id,
      action,
      regularizedStatus,
      remarks,
      userId,
      roleName
    );
    
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: `Regularization request ${action}ed successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

export const overrideAttendance = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await attendanceService.overrideAttendance(companyId, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Attendance record manually overridden successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMyLogs = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'startDate and endDate queries are required (YYYY-MM-DD).',
      });
    }

    const data = await attendanceService.getMergedLogs(companyId, userId, startDate, endDate);
    return res.status(200).json({
      success: true,
      data: data.map(formatCleanMeta),
      message: 'My attendance logs retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getTeamLogs = async (req, res, next) => {
  try {
    const { companyId, userId, roleName } = req.user;
    const { employeeId, startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'startDate and endDate queries are required (YYYY-MM-DD).',
      });
    }

    const isManager = roleName?.toLowerCase().includes('manager') || roleName?.toLowerCase().includes('lead');
    const isAdminOrHR = roleName?.toLowerCase().includes('admin') || roleName?.toLowerCase().includes('hr');

    if (isManager) {
      if (employeeId) {
        // Verify reporting structure
        const emp = await User.findOne({ _id: employeeId, companyId });
        if (!emp || emp.reportingManagerId?.toString() !== userId.toString()) {
          return res.status(403).json({
            success: false,
            data: null,
            message: 'Forbidden: You can only view attendance for direct report employees.',
          });
        }
        const data = await attendanceService.getMergedLogs(companyId, employeeId, startDate, endDate);
        return res.status(200).json({
          success: true,
          data: data.map(formatCleanMeta),
          message: 'Direct report employee logs retrieved successfully.',
        });
      } else {
        // Get all direct reports
        const subordinates = await User.find({ companyId, reportingManagerId: userId }).select('_id');
        const subIds = subordinates.map(s => s._id);
        const data = await AttendanceRecord.find({
          companyId,
          employeeId: { $in: subIds },
          attendanceDate: { $gte: startDate, $lte: endDate },
        }).populate('employeeId', 'firstName lastName email')
          .populate('approvedBy', 'firstName lastName');
        
        return res.status(200).json({
          success: true,
          data: data.map(formatCleanMeta),
          message: 'Team logs retrieved successfully.',
        });
      }
    } else if (isAdminOrHR) {
      let data = [];
      if (employeeId) {
        data = await attendanceService.getMergedLogs(companyId, employeeId, startDate, endDate);
      } else {
        data = await AttendanceRecord.find({
          companyId,
          attendanceDate: { $gte: startDate, $lte: endDate },
        }).populate('employeeId', 'firstName lastName email')
          .populate('approvedBy', 'firstName lastName');
      }
      return res.status(200).json({
        success: true,
        data: data.map(formatCleanMeta),
        message: 'Attendance logs retrieved successfully.',
      });
    }

    return res.status(403).json({
      success: false,
      data: null,
      message: 'Forbidden: Insufficient privileges to view team logs.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMonthlySummary = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { employeeId, year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'year and month queries are required.',
      });
    }

    const targetEmployeeId = employeeId || userId;
    // Security check: if employeeId is provided and different from current user, check authorization
    if (employeeId && employeeId.toString() !== userId.toString()) {
      const { roleName } = req.user;
      const isManager = roleName?.toLowerCase().includes('manager') || roleName?.toLowerCase().includes('lead');
      const isAdminOrHR = roleName?.toLowerCase().includes('admin') || roleName?.toLowerCase().includes('hr');

      if (isManager) {
        const emp = await User.findOne({ _id: employeeId, companyId });
        if (!emp || emp.reportingManagerId?.toString() !== userId.toString()) {
          return res.status(403).json({
            success: false,
            data: null,
            message: 'Forbidden: Insufficient permissions to view summary.',
          });
        }
      } else if (!isAdminOrHR) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Forbidden: Insufficient permissions.',
        });
      }
    }

    const summary = await attendanceService.getMonthlySummary(companyId, targetEmployeeId, parseInt(year), parseInt(month));
    return res.status(200).json({
      success: true,
      data: summary,
      message: 'Monthly summary calculated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const { companyId, userId, roleName } = req.user;
    const isManager = roleName?.toLowerCase().includes('manager') || roleName?.toLowerCase().includes('lead');
    
    const query = isManager ? { managerId: userId } : {};
    const metrics = await attendanceService.getDashboardMetrics(companyId, query);
    
    return res.status(200).json({
      success: true,
      data: metrics,
      message: 'Dashboard metrics retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyMonthlySummary = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { year, month, departmentId, search } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'year and month queries are required.',
      });
    }

    const report = await attendanceService.getCompanyMonthlySummary(companyId, {
      year,
      month,
      departmentId,
      search,
    });

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Company monthly attendance summary report calculated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

