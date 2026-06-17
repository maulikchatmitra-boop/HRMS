import * as notificationService from '../services/leave-notification.service.js';
import { formatCleanMeta } from '../utils/user.utils.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const data = await notificationService.getNotifications(companyId, userId, req.query);
    return res.status(200).json({
      success: true,
      data: data.map(formatCleanMeta),
      message: 'Notifications retrieved successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;
    const data = await notificationService.markNotificationAsRead(companyId, id, userId);
    return res.status(200).json({
      success: true,
      data: formatCleanMeta(data),
      message: 'Notification marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

export const clearAll = async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    await notificationService.clearAllNotifications(companyId, userId);
    return res.status(200).json({
      success: true,
      message: 'All notifications cleared successfully.',
    });
  } catch (error) {
    next(error);
  }
};
