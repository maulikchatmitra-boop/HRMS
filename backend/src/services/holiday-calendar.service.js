import HolidayCalendar from '../models/holiday-calendar.model.js';
import { logAction } from './auditLog.service.js';
import { safeExactMatch } from '../utils/regex.utils.js';

export const createHoliday = async (companyId, data, actorId) => {
  const dateObj   = new Date(data.date);
  const startOfDay = new Date(new Date(dateObj).setHours(0,0,0,0));
  const endOfDay   = new Date(new Date(dateObj).setHours(23,59,59,999));

  const existing = await HolidayCalendar.findOne({
    companyId,
    date: { $gte: startOfDay, $lte: endOfDay },
    isDeleted: false
  });
  if (existing) throw new Error('A holiday is already registered on this date.');

  const holiday = new HolidayCalendar({
    companyId, name: data.name, date: data.date,
    description: data.description || '',
    isOptional: data.isOptional !== undefined ? data.isOptional : false,
    createdBy: actorId, updatedBy: actorId
  });
  const saved = await holiday.save();
  await logAction({ companyId, userId: actorId, module: 'holiday', action: 'create', newData: saved.toObject() });
  return saved;
};

export const getHolidayById = async (companyId, id) => {
  const holiday = await HolidayCalendar.findOne({ _id: id, isDeleted: false });
  if (!holiday) throw new Error('Holiday not found.');
  if (companyId && holiday.companyId && holiday.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  return holiday;
};

export const getHolidays = async (companyId, queryParams = {}) => {
  const page = parseInt(queryParams.page, 10) || 1;
  const limit = parseInt(queryParams.limit, 10) || 50;
  const skip = (page - 1) * limit;
  const filter = { companyId, isDeleted: false };
  if (queryParams.search) filter.name = { $regex: queryParams.search, $options: 'i' };
  if (queryParams.year) {
    const year = parseInt(queryParams.year, 10);
    filter.date = { $gte: new Date(`${year}-01-01T00:00:00.000Z`), $lte: new Date(`${year}-12-31T23:59:59.999Z`) };
  }
  const total = await HolidayCalendar.countDocuments(filter);
  const holidays = await HolidayCalendar.find(filter).sort({ date: 1 }).skip(skip).limit(limit);
  return { holidays, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

export const updateHoliday = async (companyId, id, updateData, actorId) => {
  const holiday = await HolidayCalendar.findOne({ _id: id, isDeleted: false });
  if (!holiday) throw new Error('Holiday not found.');
  if (companyId && holiday.companyId && holiday.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = holiday.toObject();

  if (updateData.date) {
    const checkDate = new Date(updateData.date);
    const startOfDay = new Date(new Date(checkDate).setHours(0,0,0,0));
    const endOfDay   = new Date(new Date(checkDate).setHours(23,59,59,999));

    const existing = await HolidayCalendar.findOne({
      companyId,
      date: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false, _id: { $ne: id }
    });
    if (existing) throw new Error('A holiday is already registered on this date.');
  }

  ['name', 'date', 'description', 'isOptional'].forEach(key => { if (updateData[key] !== undefined) holiday[key] = updateData[key]; });
  holiday.updatedBy = actorId;
  const updated = await holiday.save();
  await logAction({ companyId, userId: actorId, module: 'holiday', action: 'update', oldData, newData: updated.toObject() });
  return updated;
};

export const deleteHoliday = async (companyId, id, actorId) => {
  const holiday = await HolidayCalendar.findOne({ _id: id, isDeleted: false });
  if (!holiday) throw new Error('Holiday not found.');
  if (companyId && holiday.companyId && holiday.companyId.toString() !== companyId.toString()) {
    const err = new Error('Forbidden: You do not own this resource.');
    err.statusCode = 403;
    throw err;
  }
  const oldData = holiday.toObject();
  holiday.isDeleted = true; holiday.deletedAt = new Date(); holiday.deletedBy = actorId; holiday.updatedBy = actorId;
  const deleted = await holiday.save();
  await logAction({ companyId, userId: actorId, module: 'holiday', action: 'delete', oldData, newData: null });
  return deleted;
};
