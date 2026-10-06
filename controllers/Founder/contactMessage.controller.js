const founderContactMessageService = require("../../services/founder/contactMessage.service");

const { sendSuccess, sendError } = require("../../utils/responseStruture");

const logger = require("../../logger");


exports.getContactMessages = async (req, res) => {
    try {
        const result = await founderContactMessageService.getContactMessages({
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status,
        });

        return sendSuccess(res, 200, "Contact messages retrieved successfully", result);
    } catch (error) {
        logger.error(error);

        return sendError(
            res,
            error.statusCode || 500,
            error.message || "Failed to retrieve contact messages"
        );
    }
};


exports.getContactMessageById = async (req, res) => {
    try {
        const result = await founderContactMessageService.getContactMessageById(req.params.messageId);

        return sendSuccess(res, 200, "Contact message retrieved successfully", result);
    } catch (error) {
        logger.error(error);

        return sendError(
            res,
            error.statusCode || 500,
            error.message || "Failed to retrieve contact message"
        );
    }
};


exports.markContactMessageAsRead = async (req, res) => {
    try {
        const result = await founderContactMessageService.markContactMessageAsRead(req.params.messageId, req.user._id);

        return sendSuccess(res, 200, "Contact message marked as read", result);
    } catch (error) {
        logger.error(error);

        return sendError(
            res,
            error.statusCode || 500,
            error.message || "Failed to mark contact message as read"
        );
    }
};


exports.resolveContactMessage = async (req, res) => {
    try {
        const result = await founderContactMessageService.resolveContactMessage(req.params.messageId, req.user._id);

        return sendSuccess(res, 200, "Contact message resolved successfully", result);
    } catch (error) {
        logger.error(error);

        return sendError(
            res,
            error.statusCode || 500,
            error.message || "Failed to resolve contact message"
        );
    }
};


exports.deleteContactMessage = async (req, res) => {
    try {
        const result = await founderContactMessageService.deleteContactMessage(req.params.messageId, req.user._id);

        return sendSuccess(res, 200, "Contact message deleted successfully", result);
    } catch (error) {
        logger.error(error);

        return sendError(
            res,
            error.statusCode || 500,
            error.message || "Failed to delete contact message"
        );
    }
};