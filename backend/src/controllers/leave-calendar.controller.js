import * as leaveCalendarService from '../services/leave-calendar.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const getLeaveCalendar = async (req, res, next) => {
  try {
    const { companyId, userId, roleName } = req.user;
    const data = await leaveCalendarService.getLeaveCalendar(companyId, req.query, userId, roleName);
    
    return res.status(200).json({
      success: true,
      data: {
        leaves: data.leaves.map(formatCleanMeta),
        holidays: data.holidays.map(formatCleanMeta),
      },
      message: 'Leave calendar data retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};
