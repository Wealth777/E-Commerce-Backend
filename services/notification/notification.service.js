const Notification = require('../../models/notification.model');
const Buyer = require('../../models/buyer.model');
const Vendor = require('../../models/vendor.model');
const logger = require('../../logger');
const { sendNotificationEmail } = require('../messaging/email.service');
const { sendNotificationWhatsApp } = require('../messaging/whatsapp.service');
const { emitNotification, emitUnreadCount } = require('../../sockets/notification.socket');

const roleModelMap = {
  buyer: { modelName: 'Buyer', model: Buyer },
  vendor: { modelName: 'Vendor', model: Vendor },
};

const normalizeId = (value) => value?.toString?.() || String(value);

const getRecipient = async ({ recipientId, recipientRole }) => {
  const config = roleModelMap[recipientRole];
  if (!config) throw new Error(`Unsupported notification recipient role: ${recipientRole}`);

  const user = await config.model.findById(recipientId).select('email phoneNo notificationPreference fullName');
  if (!user) throw new Error(`${config.modelName} recipient not found`);

  return { user, recipientModel: config.modelName };
};

const buildChannelConfig = (preference) => ({
  inApp: { enabled: true, sent: true, sentAt: new Date(), read: false, readAt: null, error: null },
  email: { enabled: preference === 'email' || preference === 'both', sent: false, sentAt: null, read: false, readAt: null, error: null },
  whatsapp: { enabled: preference === 'whatsapp' || preference === 'both', sent: false, sentAt: null, read: false, readAt: null, error: null },
});

const getUnreadCount = async ({ userId, role }) => Notification.countDocuments({
  recipient: userId,
  recipientRole: role,
  deletedInAppAt: null,
  'channels.inApp.enabled': true,
  'channels.inApp.read': false,
});

const notifyUnreadCount = async ({ userId, role }) => {
  const count = await getUnreadCount({ userId, role });
  emitUnreadCount({ userId, role, count });
  return count;
};

const dispatchExternalChannels = async ({ notification, user }) => {
  const updates = {};

  if (notification.channels.email.enabled) {
    try {
      const result = await sendNotificationEmail({
        to: user.email,
        subject: notification.title,
        message: notification.message,
      });
      updates['channels.email.sent'] = Boolean(result.sent);
      updates['channels.email.sentAt'] = result.sent ? new Date() : null;
      updates['channels.email.error'] = result.sent ? null : result.reason || null;
    } catch (error) {
      logger.error('Email notification failed', { notificationId: notification._id, error: error.message });
      updates['channels.email.error'] = error.message;
    }
  }

  if (notification.channels.whatsapp.enabled) {
    try {
      const result = await sendNotificationWhatsApp({
        to: user.phoneNo,
        message: `${notification.title}\n${notification.message}`,
      });
      updates['channels.whatsapp.sent'] = Boolean(result.sent);
      updates['channels.whatsapp.sentAt'] = result.sent ? new Date() : null;
      updates['channels.whatsapp.error'] = result.sent ? null : result.reason || null;
    } catch (error) {
      logger.error('WhatsApp notification failed', { notificationId: notification._id, error: error.message });
      updates['channels.whatsapp.error'] = error.message;
    }
  }

  if (Object.keys(updates).length > 0) {
    await Notification.findByIdAndUpdate(notification._id, { $set: updates });
  }
};

const createNotification = async ({ recipientId, recipientRole, type, title, message, metadata = {}, dedupeKey }) => {
  const { user, recipientModel } = await getRecipient({ recipientId, recipientRole });

  const normalizedRecipientId = normalizeId(recipientId);
  const finalDedupeKey = dedupeKey || `${recipientRole}:${normalizedRecipientId}:${type}:${metadata.orderId || metadata.productId || ''}`;

  const existing = await Notification.findOne({ dedupeKey: finalDedupeKey });
  if (existing) return existing;

  const notification = await Notification.create({
    recipient: recipientId,
    recipientModel,
    recipientRole,
    type,
    title,
    message,
    channels: buildChannelConfig(user.notificationPreference),
    metadata,
    dedupeKey: finalDedupeKey,
  });

  emitNotification(notification);
  await notifyUnreadCount({ userId: recipientId, role: recipientRole });
  await dispatchExternalChannels({ notification, user });

  return notification;
};

const createProfileUpdateNotification = async ({ userId, role }) => createNotification({
  recipientId: userId,
  recipientRole: role,
  type: 'PROFILE_UPDATE_REQUIRED',
  title: 'Complete your profile',
  message: 'Please update your profile on the profile page to improve your CampusTrade experience.',
  metadata: { targetPage: 'profile' },
  dedupeKey: `${role}:${normalizeId(userId)}:PROFILE_UPDATE_REQUIRED`,
});


const safeCreateNotification = async (payload) => {
  try {
    return await createNotification(payload);
  } catch (error) {
    logger.error('Notification creation skipped', { error: error.message, type: payload.type, recipientRole: payload.recipientRole });
    return null;
  }
};

const safeCreateProfileUpdateNotification = async ({ userId, role }) => safeCreateNotification({
  recipientId: userId,
  recipientRole: role,
  type: 'PROFILE_UPDATE_REQUIRED',
  title: 'Complete your profile',
  message: 'Please update your profile on the profile page to improve your CampusTrade experience.',
  metadata: { targetPage: 'profile' },
  dedupeKey: `${role}:${normalizeId(userId)}:PROFILE_UPDATE_REQUIRED`,
});

const getUserNotifications = async ({ userId, role, page = 1, limit = 20 }) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(Math.max(1, Number(limit) || 20), 100);
  const skip = (safePage - 1) * safeLimit;

  const query = {
    recipient: userId,
    recipientRole: role,
    deletedInAppAt: null,
  };

  const [notifications, totalItems] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Notification.countDocuments(query),
  ]);

  return {
    pagination: {
      currentPage: safePage,
      pageSize: safeLimit,
      totalItems,
      totalPages: Math.ceil(totalItems / safeLimit),
    },
    count: notifications.length,
    notifications,
  };
};

const markOneAsRead = async ({ userId, role, notificationId, channel = 'inApp' }) => {
  const allowedChannels = ['inApp', 'email', 'whatsapp'];
  if (!allowedChannels.includes(channel)) throw new Error('Invalid notification channel');

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
      recipientRole: role,
      [`channels.${channel}.enabled`]: true,
      ...(channel === 'inApp' ? { deletedInAppAt: null } : {}),
    },
    {
      $set: {
        [`channels.${channel}.read`]: true,
        [`channels.${channel}.readAt`]: new Date(),
      },
    },
    { new: true }
  );

  if (!notification) return null;
  await notifyUnreadCount({ userId, role });
  return notification;
};

const markAllAsRead = async ({ userId, role, channel = 'inApp' }) => {
  const allowedChannels = ['inApp', 'email', 'whatsapp'];
  if (!allowedChannels.includes(channel)) throw new Error('Invalid notification channel');

  const filter = {
    recipient: userId,
    recipientRole: role,
    [`channels.${channel}.enabled`]: true,
    [`channels.${channel}.read`]: false,
    ...(channel === 'inApp' ? { deletedInAppAt: null } : {}),
  };

  const result = await Notification.updateMany(filter, {
    $set: {
      [`channels.${channel}.read`]: true,
      [`channels.${channel}.readAt`]: new Date(),
    },
  });

  await notifyUnreadCount({ userId, role });
  return result;
};

const deleteInAppNotification = async ({ userId, role, notificationId }) => Notification.findOneAndUpdate(
  {
    _id: notificationId,
    recipient: userId,
    recipientRole: role,
    deletedInAppAt: null,
    'channels.inApp.enabled': true,
  },
  { $set: { deletedInAppAt: new Date() } },
  { new: true }
);

module.exports = {
  createNotification,
  createProfileUpdateNotification,
  safeCreateNotification,
  safeCreateProfileUpdateNotification,
  getUserNotifications,
  getUnreadCount,
  markOneAsRead,
  markAllAsRead,
  deleteInAppNotification,
};
