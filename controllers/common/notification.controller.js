const notificationService = require('../../services/notification/notification.service');
const { sendSuccess, sendError } = require('../../utils/responseStruture');
const logger = require('../../logger');

const getNotifications = async (req, res) => {
  try {
    const result = await notificationService.getUserNotifications({
      userId: req.user._id,
      role: req.user.role,
      page: req.query.page,
      limit: req.query.limit,
    });

    return sendSuccess(res, 200, 'Notifications fetched successfully', result);
  } catch (error) {
    logger.error('Get notifications error', error);
    return sendError(res, 500, 'Internal Server Error');
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount({
      userId: req.user._id,
      role: req.user.role,
    });

    return sendSuccess(res, 200, 'Unread count fetched successfully', { count });
  } catch (error) {
    logger.error('Get unread notification count error', error);
    return sendError(res, 500, 'Internal Server Error');
  }
};

const markOneAsRead = async (req, res) => {
  try {
    const notification = await notificationService.markOneAsRead({
      userId: req.user._id,
      role: req.user.role,
      notificationId: req.params.notificationId,
      channel: req.body.channel || 'inApp',
    });

    if (!notification) {
      return sendError(res, 404, 'Notification not found');
    }

    return sendSuccess(res, 200, 'Notification marked as read', notification);
  } catch (error) {
    logger.error('Mark notification as read error', error);
    return sendError(res, error.message === 'Invalid notification channel' ? 400 : 500, error.message === 'Invalid notification channel' ? error.message : 'Internal Server Error');
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead({
      userId: req.user._id,
      role: req.user.role,
      channel: req.body.channel || 'inApp',
    });

    return sendSuccess(res, 200, 'Notifications marked as read', {
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    logger.error('Mark all notifications as read error', error);
    return sendError(res, error.message === 'Invalid notification channel' ? 400 : 500, error.message === 'Invalid notification channel' ? error.message : 'Internal Server Error');
  }
};

const deleteInAppNotification = async (req, res) => {
  try {
    const notification = await notificationService.deleteInAppNotification({
      userId: req.user._id,
      role: req.user.role,
      notificationId: req.params.notificationId,
    });

    if (!notification) {
      return sendError(res, 404, 'Notification not found');
    }

    return sendSuccess(res, 200, 'Notification deleted successfully');
  } catch (error) {
    logger.error('Delete notification error', error);
    return sendError(res, 500, 'Internal Server Error');
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markOneAsRead,
  markAllAsRead,
  deleteInAppNotification,
};
