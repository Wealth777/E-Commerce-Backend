const { getActivities } = require("../../services/founder/activities.service");

const { sendSuccess, sendError } = require("../../utils/responseStruture");

const logger = require("../../logger");

const handleError = (res, error, fallbackMessage) => {
    logger.error(fallbackMessage, {
        error: error.message,
        stack: error.stack,
    });

    return sendError(
        res,
        error.statusCode || 500,
        error.statusCode ? error.message : fallbackMessage,
        error.errors || null
    );
};

exports.getActivities = async (req, res) => {
    try {
        const page = req.query.page || 1;
        const limit = req.query.limit || 10;

        const result = await getActivities(page, limit);

        return sendSuccess(
            res,
            200,
            "Activities retrieved successfully",
            result
        );
    } catch (error) {
        return handleError(
            res,
            error,
            "Failed to retrieve users activites"
        );
    }
}