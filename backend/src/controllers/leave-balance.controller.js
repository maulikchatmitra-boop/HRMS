import * as leaveBalanceService from '../services/leave-balance.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const getLeaveBalances = async (req, res, next) => {
  try {
    const { companyId, userId, roleName } = req.user;
    
    // Check if user has HR or Admin role
    const isHROrAdmin = roleName && (roleName.toLowerCase().includes('hr') || roleName.toLowerCase().includes('admin'));

    const query = { ...req.query };

    // Force regular employees to only see their own balances
    if (!isHROrAdmin) {
      query.employeeId = userId;
    }

    const data = await leaveBalanceService.getLeaveBalances(companyId, query);
    return res.status(200).json({
      success: true,
      data: data.map(formatCleanMeta),
      message: 'Leave balances retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const adjustLeaveBalance = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await leaveBalanceService.adjustLeaveBalance(companyId, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Leave balance adjusted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
