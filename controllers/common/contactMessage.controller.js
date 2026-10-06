const contactMessageModel = require("../../models/contactMessage.model");

const logger = require("../../logger");
const { sendSuccess, sendError, } = require("../../utils/responseStruture");

exports.createMessage = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return sendError(res, 400, "All inputs are required");
        }

        const imageUrl = req.file ? req.file.path : null;

        const contactMessage = await contactMessageModel.create({
            name,
            email,
            subject,
            message,
            image: imageUrl,
        });

        return sendSuccess(res, 201, "Contact message sent successfully", contactMessage);
    } catch (error) {
        logger.error(error);
        return sendError(res, 500, "Failed to send contact message");
    }
};