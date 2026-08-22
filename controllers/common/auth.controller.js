const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const Vendor = require("../../models/vendor.model");
const Buyer = require("../../models/buyer.model");
const Founder = require("../../models/founder.model");
const Order = require("../../models/buyerOrder.model");
const LoginHistory = require("../../models/loginHistory.model");
const auditLogModel = require("../../models/auditLog.model");

const verificationTokenService = require("../../services/verificationToken.service");
const securityRecoveryService = require('../../services/securityRecovery.service')
const emailService = require("../../services/email.service");

const { sendSuccess, sendError } = require("../../utils/responseStruture");
const requestInfo = require('../../utils/getRequestHelper')

const logger = require("../../logger");

const findUserById = async (id, session) => {
    let user = await Vendor.findById(id).session(session);

    if (!user) {
        user = await Buyer.findById(id).session(session);
    }

    if (!user) {
        user = await Founder.findById(id).session(session);
    }

    return user;
};

const findUserByEmail = async (email) => {
    let user = await Vendor.findOne({ email });

    if (!user) {
        user = await Buyer.findOne({ email });
    }

    if (!user) {
        user = await Founder.findOne({ email });
    }

    return user;
};

const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8) errors.push('At least 8 characters required');
    if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter required');
    if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter required');
    if (!/[0-9]/.test(password)) errors.push('At least one number required');
    if (!/[!@#$%^&*]/.test(password)) errors.push('At least one special character required');

    return errors;
};

async function hasActiveOrders(user, session) {
    const activeStatuses = [
        "pending",
        "confirmed",
        "shipped",
    ];

    const query =
        user.role === "buyer"
            ? {
                buyer: user._id,
                status: { $in: activeStatuses },
            }
            : {
                vendor: user._id,
                status: { $in: activeStatuses },
            };

    return Order.exists(query).session(session);
}

const ALLOWED_PREFERENCES = ["email", "whatsapp", "both"];

exports.logoutUser = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const user = await findUserById(req.user._id, session);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "User not found.");
        }

        const sessionId = req.user.sessionId;

        const loginHistory = await LoginHistory.findOneAndUpdate(
            {
                user: user._id,
                userModel: user.role.charAt(0).toUpperCase() + user.role.slice(1),
                sessionId,
                sessionStatus: "active",
            },
            {
                $set: {
                    logoutAt: new Date(),
                    sessionStatus: "logged_out",
                    logoutReason: "manual",
                },
            },
            {
                returnDocument: "after",
                session,
            }
        );

        if (!loginHistory) {
            logger.warn("Active login session not found.", {
                userId: user._id,
                role: user.role,
                sessionId,
            });
        }

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "LOG_OUT",
                    entity: user.role.charAt(0).toUpperCase() + user.role.slice(1),
                    entityId: user._id,
                    metadata: {
                        email: user.email,
                        sessionId,
                    },
                },
            ],
            { session }
        );

        await session.commitTransaction();

        return sendSuccess(res, 200, "Logout successful.");
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Logout failed.");
    } finally {
        session.endSession();
    }
};

exports.verifyEmail = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { token } = req.query;

        if (!token) {
            await session.abortTransaction();
            return sendError(res, 400, "Verification token is required.");
        }
        const verification = await verificationTokenService.findValidToken(token, session);

        if (!verification) {
            await session.abortTransaction();
            return sendError(res, 400, "Invalid or expired verification link.");
        }

        const user = await findUserById(verification.user, session);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "Account not found.");
        }

        if (user.emailVerified) {
            await verificationTokenService.deleteToken(
                verification._id,
                session
            );
            await session.commitTransaction();
            return sendSuccess(res, 200, "Email has already been verified.");
        }

        user.emailVerified = true;
        user.emailVerifiedDate = new Date();

        await user.save({ session });

        await verificationTokenService.deleteToken(verification._id, session);

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "VERIFY_EMAIL",
                    entity: user.role,
                    entityId: user._id,
                    metadata: {
                        email: user.email,
                    },
                },
            ], { session }
        );

        await session.commitTransaction();

        try {
            switch (user.role) {
                case "vendor":
                    await emailService.sendVendorWelcome({
                        email: user.email,
                        name: user.fullName,
                    });
                    break;
                case "buyer":
                    await emailService.sendBuyerWelcome({
                        email: user.email,
                        name: user.fullName,
                    });
                    break;
                case "founder":
                    if (emailService.sendFounderWelcome) {
                        await emailService.sendFounderWelcome({
                            email: user.email,
                            name: user.fullName,
                        });
                    }
                    break;
            }

        } catch (emailError) {
            logger.error("Failed to send welcome email", {
                userId: user._id,
                role: user.role,
                error: emailError.message,
            });
        }

        const loginRoutes = {
            buyer: "/login",
            vendor: "/vendor/login",
            founder: "/founder/login",
        };

        return sendSuccess(res, 200, "Email verified successfully.",
            {
                role: user.role,
                redirectTo: loginRoutes[user.role],
            }
        );

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Internal Server Error.");

    } finally {
        session.endSession();
    }
};

exports.resendVerificationEmail = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { email } = req.body;

        if (!email) {
            await session.abortTransaction();
            return sendError(res, 400, "Email address is required.");
        }

        const user = await findUserByEmail(email);

        if (!user) {
            await session.abortTransaction();
            return sendSuccess(res, 200, "If an account exists, a verification email has been sent.");
        }

        if (user.emailVerified) {
            await session.abortTransaction();
            return sendSuccess(res, 200, "Your email address has already been verified.");
        }

        const modelMap = {
            vendor: "Vendor",
            buyer: "Buyer",
            founder: "Founder",
        };

        const { token } =
            await verificationTokenService.create(
                user._id,
                modelMap[user.role]
            );

        await session.commitTransaction();

        try {
            await emailService.sendVerificationEmail({
                email: user.email,
                name: user.fullName,
                verificationToken: token,
                expiresInMinutes: 60,
            });
        } catch (emailError) {
            logger.error("Failed to resend verification email", {
                userId: user._id,
                error: emailError.message,
            });
        }

        return sendSuccess(res, 200, "Verification email sent successfully.");
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Unable to send verification email.");
    } finally {
        session.endSession();
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await findUserByEmail(email);

        if (!user) {
            return sendSuccess(res, 200, "If an account exists with this email, a password reset link has been sent.");
        }

        if (!user.emailVerified) {
            return sendError(res, 403, "Please verify your email before resetting your password.");
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        user.passwordResetToken = resetToken;
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        try {
            await emailService.sendPasswordResetEmail({
                email: user.email,
                name: user.fullName,
                resetToken,
                expiresInMinutes: 15,
            });
        } catch (error) {
            logger.error("Password reset email failed", {
                email: user.email,
                error: error.message,
            });
            return sendError(res, 500, "Unable to send password reset email.");
        }

        return sendSuccess(res, 200, "Password reset link sent.");

    } catch (error) {
        logger.error(error);
        return sendError(res, 500, "Password reset request failed.");
    }

};

exports.resetPassword = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const { token, email, newPassword } = req.body;

        if (!email) {
            await session.abortTransaction();
            return sendError(res, 400, "Email is required.");
        }

        if (!token) {
            await session.abortTransaction();
            return sendError(res, 400, "Password reset token is required.");
        }

        if (!newPassword) {
            await session.abortTransaction();
            return sendError(res, 400, "New password is required.");
        }

        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            await session.abortTransaction();
            return sendError(res, 400, 'Password does not meet requirements', passwordErrors);
        }

        const user = await findUserByEmail(email);

        const deviceInfo = requestInfo(req);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 400, "Account not found.");
        }

        if (user.passwordResetToken !== token) {
            await session.abortTransaction();
            return sendError(res, 400, "Invalid password reset link.");
        }

        if (
            !user.passwordResetExpires ||
            user.passwordResetExpires < Date.now()
        ) {
            await session.abortTransaction();
            return sendError(res, 400, "Password reset link has expired.");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.updatePasswordDate = new Date();

        await user.save({ session });

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "RESET_PASSWORD",
                    entity: user.role,
                    entityId: user._id,
                    reason: 'Resent my password',
                    metadata: {
                        email: user.email,
                        browser: deviceInfo.browser,
                        os: deviceInfo.os,
                        device: deviceInfo.device,
                        location: deviceInfo.location,
                    },
                },
            ], { session }
        );

        await session.commitTransaction();

        return sendSuccess(res, 200, "Password reset successfully.");
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Internal Server Error.");
    } finally {
        session.endSession();
    }
};

exports.changePassword = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            await session.abortTransaction();
            return sendError(res, 400, "Current password and new password are required.");
        }

        const user = await findUserById(req.user._id, session);

        const deviceInfo = requestInfo(req);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "User not found.");
        }

        const passwordMatch = await bcrypt.compare(
            oldPassword,
            user.password
        );

        if (!passwordMatch) {
            await session.abortTransaction();
            return sendError(res, 400, "Current password is incorrect.");
        }

        const samePassword = await bcrypt.compare(
            newPassword,
            user.password
        );

        if (samePassword) {
            await session.abortTransaction();
            return sendError(res, 400, "New password must be different from your current password.");
        }

        const passwordErrors = validatePassword(newPassword);

        if (passwordErrors.length > 0) {
            await session.abortTransaction();
            return sendError(res, 400, "Password does not meet security requirements.", passwordErrors);
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.updatePasswordDate = new Date();

        await user.save({ session });

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "CHANGE_PASSWORD",
                    entity: user.role,
                    entityId: user._id,
                    reason: 'I want to update my pasword',
                    metadata: {
                        email: user.email,
                        device: deviceInfo.device,
                        browser: deviceInfo.browser,
                        os: deviceInfo.os,
                        location: deviceInfo.location,
                    },
                },
            ],
            { session }
        );

        await session.commitTransaction();

        return sendSuccess(res, 200, "Password changed successfully.");
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Internal Server Error.");
    } finally {
        session.endSession();
    }
};

exports.changeEmail = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { newEmail } = req.body;

        if (!newEmail) {
            await session.abortTransaction();
            return sendError(res, 400, "New email address is required.");
        }

        const user = await findUserById(req.user._id, session);

        const deviceInfo = requestInfo(req);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "User not found.");
        }

        if (user.email === newEmail.trim().toLowerCase()) {
            await session.abortTransaction();
            return sendError(res, 400, "New email must be different from your current email.");
        }

        const existingUser = await findUserByEmail(newEmail.trim().toLowerCase(), session);

        if (existingUser) {
            await session.abortTransaction();
            return sendError(res, 400, "Email address is already in use.");
        }

        const modelMap = {
            vendor: "Vendor",
            buyer: "Buyer",
            founder: "Founder",
        };

        const verification = await verificationTokenService.create(user._id, modelMap[user.role]);

        user.pendingEmail = newEmail.trim().toLowerCase();

        await user.save({ session });

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "REQUEST_EMAIL_CHANGE",
                    entity: user.role,
                    entityId: user._id,
                    reason: 'I want to change my email address',
                    metadata: {
                        oldEmail: user.email,
                        newEmail: user.pendingEmail,
                        device: deviceInfo.device,
                        browser: deviceInfo.browser,
                        os: deviceInfo.os,
                        location: deviceInfo.location,
                    },
                },
            ], { session }
        );

        await session.commitTransaction();

        try {
            await emailService.sendChangeEmailVerification({
                email: user.pendingEmail,
                newEmail: user.pendingEmail,
                name: user.fullName,
                verificationToken: verification.token,
                expiresInMinutes: 60,
            });
        } catch (emailError) {
            logger.error("Failed to send email change verification.", {
                userId: user._id,
                error: emailError.message,
            });
        }

        return sendSuccess(res, 200, "A verification link has been sent to your new email address.");
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Internal Server Error.");
    } finally {
        session.endSession();
    }
};

exports.verifyChangedEmail = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { token } = req.query;

        if (!token) {
            await session.abortTransaction();
            return sendError(res, 400, "Verification token is required.");
        }

        const verification = await verificationTokenService.findValidToken(token, session);

        if (!verification) {
            await session.abortTransaction();
            return sendError(res, 400, "Invalid or expired verification link.");
        }

        const user = await findUserById(verification.user, session);

        const deviceInfo = requestInfo(req);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "Account not found.");
        }

        if (!user.pendingEmail) {
            await session.abortTransaction();
            return sendError(res, 400, "No pending email change request found.");
        }

        const existingUser = await findUserByEmail(user.pendingEmail);

        if (existingUser && existingUser._id.toString() !== user._id.toString()) {
            await session.abortTransaction();
            return sendError(res, 400, "This email address is already in use.");
        }

        const oldEmail = user.email;
        const oldEmailVerifyDate = user.emailVerifiedDate;
        const newEmail = user.pendingEmail;

        user.email = user.pendingEmail;
        user.emailHistory.push({
            oldEmail: oldEmail,
            newEmail,
            changedAt: new Date(),
            verifiedAt: oldEmailVerifyDate
        });
        user.pendingEmail = null;
        user.changeEmailDate = new Date();
        user.emailVerified = true;
        user.emailVerifiedDate = new Date();

        await user.save({ session });

        await verificationTokenService.deleteToken(verification._id, session);

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "CHANGE_EMAIL",
                    entity: user.role,
                    entityId: user._id,
                    reason: "I've Changes email address",
                    metadata: {
                        oldEmail,
                        newEmail: user.email,
                        changedAt: new Date(),
                        browser: deviceInfo.browser,
                        os: deviceInfo.os,
                        device: deviceInfo.device,
                        location: deviceInfo.location,
                    },
                },
            ], { session }
        );

        await session.commitTransaction();

        try {
            const modelMap = {
                vendor: "Vendor",
                buyer: "Buyer",
                founder: "Founder",
            };
            const recoveryToken = await securityRecoveryService.create({
                userId: user._id,
                userModel: modelMap[user.role],
                metadata: {
                    oldEmail,
                    newEmail: user.email,
                    browser: deviceInfo.device.browser,
                    os: deviceInfo.device.os,
                    device: deviceInfo.deviceName,
                    location: [
                        deviceInfo.location.city,
                        deviceInfo.location.region,
                        deviceInfo.location.country,
                    ]
                        .filter(Boolean)
                        .join(", "),
                    ipAddress: deviceInfo.ip,
                },
            });

            await emailService.sendChangeEmailNotification({
                email: oldEmail,
                oldEmail,
                newEmail: user.email,
                name: user.fullName,
                verificationToken: recoveryToken.token,
                browser: deviceInfo.device.browser,
                os: deviceInfo.device.os,
                device: deviceInfo.deviceName,
                location: [
                    deviceInfo.location.city,
                    deviceInfo.location.region,
                    deviceInfo.location.country,
                ]
                    .filter(Boolean)
                    .join(", "),
                changedAt: new Date(),
            });
        } catch (emailError) {
            logger.error("Failed to send email change verification.", {
                userId: user._id,
                error: emailError.message,
            });
        }

        const loginRoutes = {
            buyer: "/login",
            vendor: "/vendor/login",
            founder: "/founder/login",
        };

        return sendSuccess(res, 200, "Email address changed successfully.",
            {
                email: user.email,
                role: user.role,
                redirectTo: loginRoutes[user.role],
            }
        );

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Internal Server Error.");
    } finally {
        session.endSession();
    }
};

exports.suspendUserAccount = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { reason } = req.body;
        const userId = req.user._id;

        const user = await findUserById(userId, session);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "User not found.");
        }

        if (user.accountStatus === "deleted") {
            await session.abortTransaction();
            return sendError(res, 400, "Deleted accounts cannot be suspended.");
        }

        if (user.accountStatus === "suspended") {
            await session.abortTransaction();
            return sendError(res, 409, "Account is already suspended.");
        }

        const hasOrders = await hasActiveOrders(user, session);

        if (hasOrders) {
            await session.abortTransaction();
            return sendError(res, 400, "Please complete all active orders before performing this action.");
        }

        user.accountStatus = "suspended";
        user.isActive = false;
        user.suspendReason = reason?.trim() || null;
        user.suspendDate = new Date();

        await user.save({ session });

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "SUSPEND_ACCOUNT",
                    entity: user.role,
                    entityId: user._id,
                    reason: user.suspendReason,
                    metadata: {
                        serialNumber: user.serialNumber,
                        email: user.email,
                        reason: user.suspendReason,
                        suspendedAt: user.suspendDate,
                    },
                },
            ], { session }
        );

        await session.commitTransaction();

        return sendSuccess(res, 200, "Account suspended successfully.");
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Internal Server Error.");
    } finally {
        session.endSession();
    }
};

exports.reactivateUserAccount = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const userId = req.user._id;

        const user = await findUserById(userId, session);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "User not found.");
        }

        if (user.accountStatus === "deleted") {
            await session.abortTransaction();
            return sendError(res, 400, "Deleted accounts cannot be reactivated.");
        }

        if (user.accountStatus !== "suspended") {
            await session.abortTransaction();
            return sendError(res, 400, "Account is not suspended.");
        }

        user.accountStatus = "active";
        user.isActive = true;
        user.suspendReason = null;
        user.suspendDate = null;
        user.reactivatedAt = new Date();

        await user.save({ session });

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "REACTIVATE_ACCOUNT",
                    entity: user.role,
                    entityId: user._id,
                    reason: 'I want to reactivivate my account',
                    metadata: {
                        serialNumber: user.serialNumber,
                        email: user.email,
                        reactivatedAt: user.reactivatedAt,
                    },
                },
            ], { session }
        );

        await session.commitTransaction();

        return sendSuccess(res, 200, "Account reactivated successfully.");
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Internal Server Error.");
    } finally {
        session.endSession();
    }
};

exports.UserDeleteAccount = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { reason } = req.body;
        const userId = req.user._id;

        const user = await findUserById(userId, session);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "User not found.");
        }

        if (user.accountStatus === "deleted" || user.isDeleted || user.deleted) {
            await session.abortTransaction();
            return sendError(res, 409, "Account has already been deleted.");
        }

        const hasOrders = await hasActiveOrders(user, session);

        if (hasOrders) {
            await session.abortTransaction();
            return sendError(res, 400, "Please complete all active orders before performing this action.");
        }

        // Soft delete fields
        user.isDeleted = true;
        user.deleteReason = reason?.trim() || null;
        user.deleteDate = new Date();

        user.isActive = false;
        user.accountStatus = "deleted";

        // mongoose-delete plugin fields
        user.deleted = true;
        user.deletedAt = new Date();
        user.deletedBy = user._id;
        user.deletedByModel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

        await user.save({ session });

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "DELETE_ACCOUNT",
                    entity: user.role,
                    entityId: user._id,
                    reason: user.deleteReason,
                    metadata: {
                        serialNumber: user.serialNumber,
                        email: user.email,
                        reason: user.deleteReason,
                    },
                },
            ], { session }
        );

        await session.commitTransaction();

        return sendSuccess(res, 200, "Your account has been deleted successfully.");
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Internal Server Error.");
    } finally {
        session.endSession();
    }
};

exports.getLoginHistory = async (req, res) => {
    try {
        const user = await findUserById(req.user._id);

        if (!user) {
            return sendError(res, 404, "User not found.");
        }

        const loginHistory = await LoginHistory.find({
            user: user._id,
            userModel: user.role.charAt(0).toUpperCase() + user.role.slice(1),
        })
            .sort({ loginAt: -1 })
            .limit(10)
            .select(
                "sessionId loginMethod deviceInfo location ipAddress loginAt logoutAt sessionStatus logoutReason success"
            )
            .lean();

        const history = loginHistory.map((item) => ({
            id: item._id,
            sessionId: item.sessionId,
            browser: item.deviceInfo?.browser,
            os: item.deviceInfo?.os,
            device: item.deviceInfo?.device,
            location: [
                item.location?.city,
                item.location?.region,
                item.location?.country,
            ]
                .filter(Boolean)
                .join(", "),
            ipAddress: item.ipAddress,
            loginMethod: item.loginMethod,
            loginAt: item.loginAt,
            logoutAt: item.logoutAt,
            status: item.sessionStatus,
            logoutReason: item.logoutReason,
            success: item.success,
        }));

        return sendSuccess(
            res,
            200,
            "Login history retrieved successfully.",
            { loginHistory: history }
        );
    } catch (error) {
        logger.error(error);
        return sendError(res, 500, "Unable to retrieve login history.");
    }
};

exports.logoutAllDevices = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const user = await findUserById(req.user._id, session);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "User not found.");
        }

        await LoginHistory.updateMany(
            {
                user: req.user._id,
                userModel: user.role.charAt(0).toUpperCase() + user.role.slice(1),
                success: true,
                sessionStatus: "active",
                sessionId: {
                    $ne: req.user.sessionId,
                },
            },
            {
                $set: {
                    sessionStatus: "logged_out",
                    logoutReason: "Logged out from all devices",
                    logoutAt: new Date(),
                },
            },
            { session }
        );

        user.tokenVersion = (user.tokenVersion || 0) + 1;

        await user.save({ session });

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "LOGOUT_ALL_DEVICES",
                    entity: user.role,
                    entityId: user._id,
                    metadata: {
                        email: user.email,
                        performedAt: new Date(),
                    },
                },
            ], { session }
        );

        await session.commitTransaction();

        return sendSuccess(res, 200, "Logged out from all devices successfully.");
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Unable to log out from all devices.");
    } finally {
        session.endSession();
    }
};

exports.getActiveSessions = async (req, res) => {
    try {
        const user = await findUserById(req.user._id);

        if (!user) {
            return sendError(res, 404, "User not found.");
        }

        const sessions = await LoginHistory.find({
            user: user._id,
            success: true,
            sessionStatus: "active",
        })
            .sort({ loginAt: -1 })
            .lean();

        return sendSuccess(res, 200, "Active sessions retrieved successfully.",
            {
                sessions,
                currentSessionId: req.user.sessionId,
            }
        );
    } catch (error) {
        logger.error(error);
        return sendError(res, 500, "Unable to retrieve active sessions.");
    }
};

exports.updateNotificationPreference = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { notificationPreference } = req.body;

        if (!notificationPreference) {
            await session.abortTransaction();
            return sendError(res, 400, "Notification preference is required.");
        }

        if (!ALLOWED_PREFERENCES.includes(notificationPreference)) {
            await session.abortTransaction();
            return sendError(res, 400, "Invalid notification preference.");
        }

        const user = await findUserById(req.user._id, session);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "User not found.");
        }

        user.notificationPreference = notificationPreference;

        await user.save({ session });

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "UPDATE_NOTIFICATION_PREFERENCE",
                    entity: user.role,
                    entityId: user._id,
                    metadata: {
                        notificationPreference,
                    },
                },
            ], { session }
        );

        await session.commitTransaction();

        return sendSuccess(res, 200, "Notification preference updated successfully.",
            {
                notificationPreference: user.notificationPreference,
            }
        );
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Failed to update notification preference.");
    } finally {
        session.endSession();
    }
};

exports.updatePromotionalMessages = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { promotionalMessages } = req.body;

        if (typeof promotionalMessages !== "boolean") {
            await session.abortTransaction();
            return sendError(res, 400, "Promotional messages must be true or false.");
        }

        const user = await findUserById(req.user._id, session);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "User not found.");
        }

        user.promotionalMessages = promotionalMessages;

        await user.save({ session });

        await auditLogModel.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "UPDATE_PROMOTIONAL_MESSAGES",
                    entity: user.role,
                    entityId: user._id,
                    metadata: {
                        promotionalMessages,
                    },
                },
            ], { session }
        );

        await session.commitTransaction();

        return sendSuccess(res, 200, "Promotional message preference updated successfully.",
            {
                promotionalMessages: user.promotionalMessages,
            }
        );
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "Failed to update promotional message preference.");
    } finally {
        session.endSession();
    }
};