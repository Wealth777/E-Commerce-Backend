const AuditLog = require("../../models/auditLog.model");
const AppError = require("../common/AppError");
const logger = require("../../logger");

exports.getActivities = async (page = 1, limit = 10) => {
    try {
        page = Math.max(Number(page) || 1, 1);
        limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

        const skip = (page - 1) * limit;

        const [activities, totalActivities] = await Promise.all([
            AuditLog.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("user", "fullName email serialNumber")
                .populate("actor", "fullName email serialNumber")
                .lean(),

            AuditLog.countDocuments(),
        ]);

        const totalPages = Math.ceil(totalActivities / limit);

        return {
            activities,
            pagination: {
                page,
                totalPages,
                total: totalActivities,
                limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    } catch (error) {
        logger.error("Failed to fetch activities", {
            error: error.message,
            stack: error.stack,
        });

        throw new AppError(
            "Failed to fetch activities",
            500
        );
    }
};