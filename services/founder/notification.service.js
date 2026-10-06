const mongoose = require('mongoose');

const Notification = require('../../models/notification.model');
const Buyer = require('../../models/buyer.model');
const Vendor = require('../../models/vendor.model');
const Founder = require('../../models/founder.model');
const AuditLog = require('../../models/auditLog.model');

const logger = require('../../logger');
const { sendNotificationEmail } = require('../messaging/email.service');

const { emitNotification, emitUnreadCount, } = require('../../sockets/notification.socket');

const roleModelMap = {
    buyer: {
        modelName: 'Buyer',
        model: Buyer,
    },
    vendor: {
        modelName: 'Vendor',
        model: Vendor,
    },
    founder: {
        modelName: 'Founder',
        model: Founder,
    },
};

const normalizeId = (value) => value?.toString?.() || String(value);

const resolveRecipient = async ({ recipientId, recipientRole, }) => {
    const config = roleModelMap[recipientRole];

    if (!config) {
        throw new Error(`Unsupported notification recipient role: ${recipientRole}`);
    }

    if (!recipientId) {
        throw new Error('Recipient identifier is required');
    }

    const identifier = String(recipientId).trim();

    let user = null;

    if (mongoose.isValidObjectId(identifier)) {
        user = await config.model.findById(identifier);
    }

    if (!user && identifier.includes('@')) {
        user = await config.model.findOne({ email: identifier.toLowerCase(), });
    }

    if (!user) {
        user = await config.model.findOne({ serialNumber: identifier, });
    }

    if (!user) {
        throw new Error(
            `${config.modelName} with identifier "${identifier}" was not found`
        );
    }

    return {
        user,
        userId: user._id,
        recipientModel: config.modelName,
    };
};


const getRecipient = async ({ recipientId, recipientRole, }) => {
    const {
        user,
        recipientModel,
    } = await resolveRecipient({ recipientId, recipientRole, });

    const selectedUser = await roleModelMap[recipientRole].model
        .findById(user._id)
        .select(
            'email phoneNo preferences.notificationPreference notificationPreference fullName serialNumber'
        );

    if (!selectedUser) {
        throw new Error(`${recipientModel} recipient not found`);
    }

    return {
        user: selectedUser,
        userId: user._id,
        recipientModel,
    };
};

const buildChannelConfig = (preference) => ({
    inApp: {
        enabled: true,
        sent: true,
        sentAt: new Date(),
        read: false,
        readAt: null,
        error: null,
    },

    email: {
        enabled: preference === 'email' || preference === 'both',
        sent: false,
        sentAt: null,
        read: false,
        readAt: null,
        error: null,
    },
});


const getUnreadCount = async ({ userId, role }) => {
    return Notification.countDocuments({
        recipient: userId,
        recipientRole: role,
        deletedInAppAt: null,
        'channels.inApp.enabled': true,
        'channels.inApp.read': false,
    });
};

const notifyUnreadCount = async ({ userId, role }) => {
    const count = await getUnreadCount({ userId, role, });

    emitUnreadCount({ userId, role, count, });

    return count;
};


const dispatchExternalChannels = async ({ notification, user, }) => {
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
            logger.error('Email notification failed', {
                notificationId: notification._id,
                error: error.message,
            });

            updates['channels.email.error'] = error.message;
        }
    }

    if (Object.keys(updates).length > 0) {
        await Notification.findByIdAndUpdate(
            notification._id,
            { $set: updates, }
        );
    }
};


const createNotification = async ({
    recipientId,
    recipientRole,
    type,
    title,
    message,
    metadata = {},
    dedupeKey,
}) => {
    const {
        user,
        userId: resolvedRecipientId,
        recipientModel,
    } = await getRecipient({
        recipientId,
        recipientRole,
    });

    const normalizedRecipientId = normalizeId(resolvedRecipientId);

    const finalDedupeKey =
        dedupeKey ||
        `${recipientRole}:${normalizedRecipientId}:${type}:${metadata.orderId || metadata.productId || ''}`;

    const existing = await Notification.findOne({ dedupeKey: finalDedupeKey, });

    if (existing) { return existing; }

    const notificationPreference =
        user.notificationPreference ||
        user.preferences?.notificationPreference ||
        'inApp';

    const notification = await Notification.create({
        recipient: resolvedRecipientId,
        recipientModel,
        recipientRole,
        type,
        title,
        message,

        channels: buildChannelConfig(
            notificationPreference
        ),

        metadata,
        dedupeKey: finalDedupeKey,
    });

    emitNotification(notification);

    await notifyUnreadCount({ userId: resolvedRecipientId, role: recipientRole, });

    await dispatchExternalChannels({ notification, user, });

    return notification;
};


const sendFounderNotification = async ({
    founderId,
    recipients = [],
    recipientGroup = 'specific',
    type,
    title,
    message,
    metadata = {},
}) => {
    if (!type?.trim()) {
        throw new Error('Notification type is required');
    }

    if (!title?.trim()) {
        throw new Error('Notification title is required');
    }

    if (!message?.trim()) {
        throw new Error('Notification message is required');
    }

    const allowedGroups = [
        'all',
        'buyers',
        'vendors',
        'specific',
    ];

    if (!allowedGroups.includes(recipientGroup)) {
        throw new Error('Invalid recipient group');
    }

    let resolvedRecipients = [];

    if (recipientGroup === 'all') {
        const [buyers, vendors] = await Promise.all([
            Buyer.find({ isDeleted: false, }).select('_id'),

            Vendor.find({ isDeleted: false, }).select('_id'),
        ]);

        resolvedRecipients = [
            ...buyers.map((buyer) => ({ userId: buyer._id, role: 'buyer', })),

            ...vendors.map((vendor) => ({ userId: vendor._id, role: 'vendor', })),
        ];
    }

    if (recipientGroup === 'buyers') {
        const buyers = await Buyer.find({ isDeleted: false, }).select('_id');

        resolvedRecipients = buyers.map((buyer) => ({ userId: buyer._id, role: 'buyer', }));
    }

    if (recipientGroup === 'vendors') {
        const vendors = await Vendor.find({ isDeleted: false, }).select('_id');

        resolvedRecipients = vendors.map((vendor) => ({ userId: vendor._id, role: 'vendor', }));
    }

    if (recipientGroup === 'specific') {
        if (!Array.isArray(recipients) || recipients.length === 0
        ) {
            throw new Error('At least one notification recipient is required');
        }

        for (const recipient of recipients) {
            if (!recipient?.identifier || !recipient?.role
            ) { continue; }

            const role = recipient.role.toLowerCase();

            if (!roleModelMap[role]) {
                throw new Error(`Unsupported recipient role: ${role}`);
            }

            try {
                const { userId, } = await resolveRecipient({
                    recipientId: recipient.identifier,
                    recipientRole: role,
                });

                resolvedRecipients.push({ userId, role, });
            } catch (error) {
                throw new Error(`Recipient "${recipient.identifier}" could not be found: ${error.message}`);
            }
        }
    }

    const uniqueRecipients = [
        ...new Map(
            resolvedRecipients.map(
                (recipient) => [
                    `${recipient.role}:${normalizeId(
                        recipient.userId
                    )}`,
                    recipient,
                ]
            )
        ).values(),
    ];

    if (uniqueRecipients.length === 0) {
        throw new Error('No valid notification recipients were found');
    }

    const broadcastId = metadata.broadcastId || new mongoose.Types.ObjectId().toString();

    const notificationMetadata = {
        ...metadata,
        broadcastId,
        recipientGroup,
    };

    const results = [];
    const failed = [];

    for (const recipient of uniqueRecipients) {
        try {
            const notification =
                await createNotification({
                    recipientId: recipient.userId,
                    recipientRole: recipient.role,
                    type,
                    title,
                    message,
                    metadata:
                        notificationMetadata,

                    dedupeKey:
                        `FOUNDER:${recipient.role}:${normalizeId(
                            recipient.userId
                        )}:${type}:${broadcastId}`,
                });

            results.push({
                userId: recipient.userId,
                role: recipient.role,
                notificationId: notification._id,
            });

        } catch (error) {
            logger.error(
                'Founder notification failed',
                {
                    userId: recipient.userId,
                    role: recipient.role,
                    error: error.message,
                }
            );

            failed.push({
                userId: recipient.userId,
                role: recipient.role,
                error: error.message,
            });
        }
    }

    try {
        await AuditLog.create({
            user: founderId,
            userModel: 'Founder',

            actor: founderId,
            actorModel: 'Founder',
            actorRole: 'founder',

            role: 'founder',

            action: 'FOUNDER_NOTIFICATION_SENT',

            entity: 'Notification',

            reason: `Founder sent a notification to ${recipientGroup}`,

            metadata: {
                broadcastId,
                recipientGroup,
                notificationType: type,
                title,
                totalRecipients: uniqueRecipients.length,
                sentCount: results.length,
                failedCount: failed.length,
                targetPage: metadata.targetPage || null,
            },
        });
    } catch (error) {
        logger.error('Founder notification audit log failed', {
            founderId,
            broadcastId,
            error: error.message,
        });
    }

    return {
        recipientGroup,
        totalRecipients: uniqueRecipients.length,
        sentCount: results.length,
        failedCount: failed.length,
        notifications: results,
        failed,
    };
};

const createProfileUpdateNotification = async ({ userId, role, }) => {
    return createNotification({
        recipientId: userId,
        recipientRole: role,
        type: 'PROFILE_UPDATE_REQUIRED',
        title: 'Complete your profile',
        message: 'Please update your profile on the profile page to improve your CampusTrade experience.',
        metadata: {
            targetPage: 'profile',
        },
        dedupeKey: `${role}:${normalizeId(userId)}:PROFILE_UPDATE_REQUIRED`,
    });
};


const safeCreateNotification = async (payload) => {
    try {
        return await createNotification(payload);
    } catch (error) {
        logger.error('Notification creation skipped', {
            error: error.message,
            type: payload.type,
            recipientRole: payload.recipientRole,
        });

        return null;
    }
};

const safeCreateProfileUpdateNotification = async ({ userId, role, }) => {
    return safeCreateNotification({
        recipientId: userId,
        recipientRole: role,
        type: 'PROFILE_UPDATE_REQUIRED',
        title: 'Complete your profile',
        message: 'Please update your profile on the profile page to improve your CampusTrade experience.',
        metadata: {
            targetPage: 'profile',
        },
        dedupeKey: `${role}:${normalizeId(userId)}:PROFILE_UPDATE_REQUIRED`,
    });
};


const getUserNotifications = async ({
    userId,
    role,
    page = 1,
    limit = 20,
}) => {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(
        Math.max(1, Number(limit) || 20),
        100
    );

    const skip = (safePage - 1) * safeLimit;

    const query = {
        recipient: userId,
        recipientRole: role,
        deletedInAppAt: null,
    };

    const [
        notifications,
        totalItems,
    ] = await Promise.all([
        Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit),

        Notification.countDocuments(query),
    ]);

    return {
        pagination: {
            currentPage: safePage,
            pageSize: safeLimit,
            totalItems,
            totalPages: Math.ceil(
                totalItems / safeLimit
            ),
        },

        count: notifications.length,
        notifications,
    };
};


const markOneAsRead = async ({
    userId,
    role,
    notificationId,
    channel = 'inApp',
}) => {
    const allowedChannels = [
        'inApp',
        'email',
    ];

    if (!allowedChannels.includes(channel)) {
        throw new Error('Invalid notification channel');
    }

    const notification =
        await Notification.findOneAndUpdate(
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

            { new: true, }
        );

    if (!notification) { return null; }

    await notifyUnreadCount({ userId, role, });

    return notification;
};


const markAllAsRead = async ({
    userId,
    role,
    channel = 'inApp',
}) => {
    const allowedChannels = [
        'inApp',
        'email',
    ];

    if (!allowedChannels.includes(channel)) {
        throw new Error('Invalid notification channel');
    }

    const filter = {
        recipient: userId,
        recipientRole: role,
        [`channels.${channel}.enabled`]: true,
        [`channels.${channel}.read`]: false,

        ...(channel === 'inApp' ? { deletedInAppAt: null } : {}),
    };

    const result = await Notification.updateMany(
        filter,
        {
            $set: {
                [`channels.${channel}.read`]: true,
                [`channels.${channel}.readAt`]: new Date(),
            },
        }
    );

    await notifyUnreadCount({ userId, role, });

    return result;
};

const deleteInAppNotification = async ({
    userId,
    role,
    notificationId,
}) => {
    return Notification.findOneAndUpdate(
        {
            _id: notificationId,
            recipient: userId,
            recipientRole: role,
            deletedInAppAt: null,
            'channels.inApp.enabled': true,
        },

        { $set: { deletedInAppAt: new Date(), }, },

        { new: true, }
    );
};

module.exports = {
    createNotification,
    sendFounderNotification,

    createProfileUpdateNotification,

    safeCreateNotification,
    safeCreateProfileUpdateNotification,

    getUserNotifications,
    getUnreadCount,

    markOneAsRead,
    markAllAsRead,

    deleteInAppNotification,
};