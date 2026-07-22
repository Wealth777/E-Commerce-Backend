const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const Vendor = require("../../models/vendor.model");
const Buyer = require("../../models/buyer.model");
const Founder = require("../../models/founder.model");
const Order = require("../../models/buyerOrder.model");

const verificationTokenService = require("../../services/verificationToken.service");
const securityRecoveryService = require('../../services/securityRecovery.service')
const emailService = require("../../services/email.service");
const auditLogModel = require("../../models/auditLog.model");
const { sendSuccess, sendError } = require("../../utils/responseStruture");
const logger = require("../../logger");
const requestInfo = require('../../utils/getRequestHelper')

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

const findUserByEmail = async (email, session) => {
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

        const user = await findUserByEmail(email, session);

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



























exports.suspendVendorAccount = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { reason } = req.body;
        const userId = req.user._id;

        const user = await findUserById.findById(userId).session(session);

        if (!user) {
            await session.abortTransaction();
            return sendError(res, 404, "Vendor not found");
        }

        if (user.accountStatus === "suspended") {
            await session.abortTransaction();
            return sendError(res, 409, "Account is already suspended.");
        }

        if (user.accountStatus === "deleted") {
            await session.abortTransaction();
            return sendError(res, 409, "Deleted accounts cannot be suspended.");
        }

        const pendingOrder = await Order.exists({
            user: userId,
            orderStatus: {
                $in: [
                    "pending",
                    "confirmed",
                    "shipped"
                ]
            }
        }).session(session);

        if (pendingOrder) {
            await session.abortTransaction();

            return sendError(
                res,
                400,
                "Finalize all pending orders before suspending account."
            );
        }

        vendor.accountStatus = "suspended";
        vendor.isActive = false;
        vendor.suspendReason = reason?.trim() || null;
        vendor.suspendDate = new Date();

        await vendor.save({ session });

        await AuditLog.create([
            {
                user: vendor._id,
                role: "vendor",
                action: "SUSPEND_ACCOUNT",
                entity: "Vendor",
                entityId: vendor._id,
                metadata: {
                    serialNumber: vendor.serialNumber,
                    email: vendor.email,
                    reason: vendor.suspendReason
                }
            }
        ], { session });

        await session.commitTransaction();
        return sendSuccess(
            res,
            200,
            "Account suspended successfully."
        );
    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(err);
        return sendError(
            res,
            500,
            "Internal Server Error"
        );
    } finally {
        session.endSession();
    }
};

exports.reactivateVendorAccount = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const vendorId = req.user._id;

        const vendor = await vendorModel
            .findById(vendorId)
            .session(session);

        if (!vendor) {
            await session.abortTransaction();
            return sendError(res, 404, "Vendor not found");
        }

        if (vendor.accountStatus !== "suspended") {
            await session.abortTransaction();
            return sendError(
                res,
                400,
                "Account is not suspended."
            );
        }

        vendor.accountStatus = "active";
        vendor.isActive = true;
        vendor.suspendReason = null;
        vendor.suspendDate = null;
        vendor.reactivatedAt = new Date();

        await vendor.save({ session });

        await AuditLog.create([
            {
                user: vendor._id,
                role: "vendor",
                action: "REACTIVATE_ACCOUNT",
                entity: "Vendor",
                entityId: vendor._id,
                metadata: {
                    serialNumber: vendor.serialNumber,
                    email: vendor.email
                }
            }
        ], { session });

        await session.commitTransaction();
        return sendSuccess(
            res,
            200,
            "Account reactivated successfully."
        );
    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(err);
        return sendError(
            res,
            500,
            "Internal Server Error"
        );
    } finally {
        session.endSession();
    }
};

exports.VendorDeleteAccount = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { reason } = req.body;
        const vendorId = req.user._id;

        const vendor = await vendorModel
            .findById(vendorId)
            .session(session);

        if (!vendor) {
            await session.abortTransaction();
            return sendError(res, 404, "Vendor not found");
        }

        if (vendor.deleted) {
            await session.abortTransaction();
            return sendError(res, 409, "Vendor account has already been deleted");
        }

        // Additional deletion metadata
        vendor.isDeleted = true;
        vendor.deleteReason = reason?.trim() || null;
        vendor.deleteDate = new Date();
        vendor.isActive = false
        vendor.accountStatus = 'deleted'

        // Soft delete plugin fields
        vendor.deleted = true;
        vendor.deletedAt = new Date();
        vendor.deletedBy = vendor._id;
        vendor.deletedByModel = "Vendor";

        await vendor.save({ session });

        await AuditLog.create(
            [
                {
                    user: vendor._id,
                    role: "vendor",
                    action: "DELETE_ACCOUNT",
                    entity: "Vendor",
                    entityId: vendor._id,
                    metadata: {
                        serialNumber: vendor.serialNumber,
                        email: vendor.email,
                        reason: reason?.trim() || null,
                    },
                },
            ],
            { session }
        );

        await session.commitTransaction();

        return sendSuccess(
            res,
            200,
            "Your account has been deleted successfully."
        );
    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        logger.error(err);

        return sendError(res, 500, "Internal Server Error");
    } finally {
        await session.endSession();
    }
};