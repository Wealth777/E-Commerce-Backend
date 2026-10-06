const { sendFounderNotification, } = require('../../services/founder/notification.service');

const logger = require('../../logger');

const { sendSuccess, sendError, } = require('../../utils/responseStruture');

const sendNotification = async (req, res) => {
    try {
        const {
            recipients = [],
            recipientGroup = 'specific',
            type,
            title,
            message,
            metadata = {},
        } = req.body;

        const allowedGroups = [
            'all',
            'buyers',
            'vendors',
            'specific',
        ];

        if (!allowedGroups.includes(recipientGroup)) {
            return sendError(res, 400, 'Invalid recipient group');
        }

        if (!type || typeof type !== 'string' || !type.trim()) {
            return sendError(res, 400, 'Notification type is required');
        }

        if (!title || typeof title !== 'string' || !title.trim()) {
            return sendError(res, 400, 'Notification title is required');
        }

        if (!message || typeof message !== 'string' || !message.trim()) {
            return sendError(res, 400, 'Notification message is required');
        }

        if (recipientGroup === 'specific') {
            if (!Array.isArray(recipients) || recipients.length === 0) {
                return sendError(res, 400, 'At least one specific recipient is required');
            }

            for (const recipient of recipients) {
                if (!recipient?.identifier || typeof recipient.identifier !== 'string' || !recipient.identifier.trim()
                ) {
                    return sendError(res, 400, 'Every recipient must have a MongoDB ID, email, or serial number');
                }

                if (!recipient?.role) {
                    return sendError(res, 400, 'Every recipient must have a role');
                }

                const role = recipient.role.toLowerCase();

                if (!['buyer', 'vendor'].includes(role)) {
                    return sendError(res, 400, 'Recipient role must be either buyer or vendor');
                }
            }
        }

        const result =
            await sendFounderNotification({
                founderId: req.user._id,
                recipients,
                recipientGroup,
                type: type.trim(),
                title: title.trim(),
                message: message.trim(),
                metadata,
            });

        return sendSuccess(res, 200, 'Notification sent successfully', result);

    } catch (error) {
        logger.error('Founder send notification failed',
            {
                error: error.message,
                founderId: req.user?._id,
            }
        );

        return sendError(res, 500, error.message || 'Failed to send notification'
        );
    }
};

module.exports = { sendNotification, };