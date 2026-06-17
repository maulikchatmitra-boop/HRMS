import InAppNotification from '../models/in-app-notification.model.js';

/**
 * Dispatch an in-app notification to a user.
 */
export const createNotification = async ({
  companyId,
  userId,
  type,
  referenceId,
  title,
  message,
}) => {
  const notification = new InAppNotification({
    companyId,
    userId,
    type,
    referenceId,
    title,
    message,
    isRead: false,
  });

  return await notification.save();
};

/**
 * Fetch all notifications for the active user.
 */
export const getNotifications = async (companyId, userId, query = {}) => {
  const filter = { companyId, userId };
  if (query.isRead !== undefined) {
    filter.isRead = query.isRead === 'true';
  }

  return await InAppNotification.find(filter)
    .sort({ createdAt: -1 })
    .limit(50);
};

/**
 * Mark a notification as read.
 */
export const markNotificationAsRead = async (companyId, notificationId, userId) => {
  const notification = await InAppNotification.findOne({
    _id: notificationId,
    companyId,
    userId,
  });

  if (!notification) {
    const error = new Error('Notification not found.');
    error.statusCode = 404;
    throw error;
  }

  notification.isRead = true;
  return await notification.save();
};

/**
 * Clear all notifications for the active user.
 */
export const clearAllNotifications = async (companyId, userId) => {
  return await InAppNotification.deleteMany({ companyId, userId });
};
