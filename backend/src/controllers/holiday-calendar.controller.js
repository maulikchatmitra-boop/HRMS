import * as holidayCalendarService from '../services/holiday-calendar.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const createHoliday = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await holidayCalendarService.createHoliday(companyId, req.body, userId);
    return res.status(201).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Holiday created successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getHolidayById = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const data = await holidayCalendarService.getHolidayById(companyId, id);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Holiday retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const getHolidays = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    const data = await holidayCalendarService.getHolidays(companyId, req.query);
    return res.status(200).json({
      success: true,
      data: data.holidays.map(formatCleanMeta),
      pagination: data.pagination,
      message: 'Holidays list retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const updateHoliday = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await holidayCalendarService.updateHoliday(companyId, id, req.body, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Holiday updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHoliday = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await holidayCalendarService.deleteHoliday(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Holiday deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
