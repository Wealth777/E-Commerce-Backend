const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const Vendor = require("../../models/vendor.model");
const Buyer = require("../../models/buyer.model");
const Founder = require("../../models/founder.model");

const verificationTokenService = require("../../services/verificationToken.service");
const emailService = require("../../services/email.service");

const auditLogModel = require("../../models/auditLog.model");

const { sendSuccess, sendError } = require("../../utils/responseStruture");
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

        return sendSuccess(res, 200, "Email verified successfully.");

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

        let user = await Vendor.findOne({ email }).session(session);

        if (!user) {
            user = await Buyer.findOne({ email }).session(session);
        }

        if (!user) {
            user = await Founder.findOne({ email }).session(session);
        }

        if (!user) {
            await session.abortTransaction();
            return sendSuccess(res, 200, "If an account exists, a verification email has been sent.");
        }

        if (user.emailVerified) {
            await session.abortTransaction();
            return sendSuccess(res, 200, "Your email address has already been verified.");
        }

        await verificationTokenService.deleteUserTokens(user._id, session);


        const verificationToken = crypto.randomBytes(32).toString("hex");

        await verificationTokenService.createToken(
            {
                user: user._id,
                token: verificationToken,
            }, session
        );

        await session.commitTransaction();

        try {
            await emailService.sendVerificationEmail({
                email: user.email,
                name: user.fullName,
                verificationToken,
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
        return sendError(res, 500, "Failed to resend verification email.");
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