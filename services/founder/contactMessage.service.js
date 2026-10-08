const mongoose = require("mongoose");

const Founder = require("../../models/founder.model");
const AuditLog = require("../../models/auditLog.model");
const ContactMessage = require("../../models/contactMessage.model");

const emailService = require("../../services/email.service");

const logger = require("../../logger");
const AppError = require("../common/AppError");


const getContactMessages = async ({ page = 1, limit = 20, status } = {}) => {
    try {
        page = Math.max(Number(page) || 1, 1);
        limit = Math.min(Number(limit) || 20, 100);

        const skip = (page - 1) * limit;

        const filter = {};

        if (status) {
            filter.status = status;
        }

        const [messages, total] = await Promise.all([
            ContactMessage.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            ContactMessage.countDocuments(filter),
        ]);

        return {
            messages,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error(error);
        throw new AppError("Failed to retrieve contact messages", 500);
    }
};

const getContactMessageById = async (messageId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            throw new AppError("Invalid contact message ID", 400);
        }

        const message = await ContactMessage.findById(messageId).lean();

        if (!message) {
            throw new AppError("Contact message not found", 404);
        }

        return message;
    } catch (error) {
        logger.error(error);

        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError("Failed to retrieve contact message", 500);
    }
};

const markContactMessageAsRead = async (messageId, founderId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            throw new AppError("Invalid contact message ID", 400);
        }

        const message = await ContactMessage.findById(messageId);

        if (!message) {
            throw new AppError("Contact message not found", 404);
        }

        if (message.status === "read") {
            return message;
        }

        message.status = "read";
        message.readAt = new Date();

        await message.save();

        await AuditLog.create({
            action: "CONTACT_MESSAGE_READ",
            actor: founderId,
            actorModel: "Founder",
            target: message._id,
            targetModel: "ContactMessage",
        });

        return message;
    } catch (error) {
        logger.error(error);

        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError("Failed to mark contact message as read", 500);
    }
};

const resolveContactMessage = async (messageId, founderId, replyMessage) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            throw new AppError("Invalid contact message ID", 400);
        }

        if (!replyMessage || !replyMessage.trim()) {
            throw new AppError("Reply message is required", 400);
        }

        const message = await ContactMessage.findById(messageId);

        if (!message) {
            throw new AppError("Contact message not found", 404);
        }

        if (message.status === "resolved") {
            return message;
        }

        await emailService.sendContactReplyEmail({
            email: message.email,
            name: message.name,
            originalSubject: message.subject,
            originalContent: message.message,
            replyMessage: replyMessage.trim(),
        });

        message.status = "resolved";
        message.resolvedAt = new Date();
        message.resolvedBy = founderId;

        await message.save();

        await AuditLog.create({
            user: founderId,
            userModel: "Founder",

            actor: founderId,
            actorModel: "Founder",
            actorRole: "founder",

            targetUser: founderId,
            role: "founder",

            action: "CONTACT_MESSAGE_RESOLVED",
            entity: "ContactMessage",
            entityId: message._id,

            metadata: {
                contactEmail: message.email,
                subject: message.subject,
                request: requestInfo(req),
            },
        });

        return message;

    } catch (error) {
        logger.error(error);

        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError("Failed to resolve contact message", 500);
    }
};

const deleteContactMessage = async (messageId, founderId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            throw new AppError("Invalid contact message ID", 400);
        }

        const message = await ContactMessage.findById(messageId);

        if (!message) {
            throw new AppError("Contact message not found", 404);
        }

        await ContactMessage.findByIdAndDelete(messageId);

        await AuditLog.create({
            user: founderId,
            userModel: "Founder",

            actor: founderId,
            actorModel: "Founder",
            actorRole: "founder",

            targetUser: founderId,
            role: "founder",

            action: "CONTACT_MESSAGE_DELETED",
            entity: "ContactMessage",
            entityId: message._id,

            metadata: {
                contactEmail: message.email,
                subject: message.subject,
                request: requestInfo(req),
            },
        });

        return { messageId: message._id, };
    } catch (error) {
        logger.error(error);

        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError("Failed to delete contact message", 500);
    }
};


module.exports = {
    getContactMessages,
    getContactMessageById,
    markContactMessageAsRead,
    resolveContactMessage,
    deleteContactMessage,
};