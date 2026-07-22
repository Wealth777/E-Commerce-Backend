const mongoose = require("mongoose");

const Vendor = require("../../models/vendor.model");
const Buyer = require("../../models/buyer.model");
const Founder = require("../../models/founder.model");

const SecurityRecoveryToken = require("../../models/securityRecoveryToken.model");
const AuditLog = require("../../models/auditLog.model");

const securityRecoveryService = require("../../services/securityRecovery.service");
const emailService = require("../../services/email.service");

const VendorDTO = require('../../dtos/vendor.dto');

const { sendSuccess, sendError } = require("../../utils/responseStruture");
const logger = require("../../logger");

const MODELS = {
    Vendor,
    Buyer,
    Founder,
};

exports.reportSecurityRecovery = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const { token } = req.body;

        if (!token) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            return sendError(res, 400, "Recovery token is required.");
        }

        const recoveryToken = await securityRecoveryService.findValidToken(token);

        if (!recoveryToken) {
            await session.abortTransaction();
            return sendError(res, 400, "Recovery link is invalid or has expired.");
        }

        const UserModel = MODELS[recoveryToken.userModel];

        if (!UserModel) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            return sendError(res, 400, "Invalid user model.");
        }

        const user = await UserModel.findById(recoveryToken.user).session(session);

        if (!user) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            return sendError(res, 404, "User not found.");
        }

        if (user.isSuspend) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            return sendError(res, 409, "This account has already been secured. Please contact support.");
        }

        user.accountStatus = "locked";
        user.isLocked = true;
        user.lockReason = "Security recovery initiated due to an unauthorized email change.";

        await user.save({ session });

        recoveryToken.used = true;
        recoveryToken.usedAt = new Date();

        await recoveryToken.save({ session });

        await SecurityRecoveryToken.updateMany(
            {
                user: recoveryToken.user,
                used: false,
            },
            {
                $set: {
                    used: true,
                    usedAt: new Date(),
                },
            },
            { session }
        );

        await AuditLog.create(
            [
                {
                    user: user._id,
                    role: user.role,
                    action: "SECURITY_RECOVERY_REPORTED",
                    entity: user.role,
                    entityId: user._id,
                    metadata: {
                        reason: "Unauthorized email change reported",
                        ip: req.ip,
                        userAgent: req.headers["user-agent"],
                    },
                },
            ],
            { session }
        );

        await session.commitTransaction();

        await emailService.sendSecurityRecoveryStarted({
            email: recoveryToken.metadata.oldEmail,
            name: user.fullName,
            incidentNumber: incident.incidentNumber,
            recoveryUrl: `${process.env.frontedURL}/recover-account?token=${token}`,
            ipAddress: req.ip,
            deviceInfo: req.headers["user-agent"]

        });

        return sendSuccess(res,
            200, "Your account has been secured successfully. Our recovery process has started.");
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        logger.error(error);
        return sendError(res, 500, "An error occurred while processing your recovery request.");
    } finally {
        session.endSession();
    }
};

exports.recoverAccount = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            await session.abortTransaction();
            return sendError(res, 400, "Validation failed", errors.array());
        }

        const { token } = req.body;

        const recoveryToken =
            await securityRecoveryService.findValidToken(token);

        if (!recoveryToken) {
            return sendError(res, 400, "Invalid or expired recovery link.");
        }

        const vendor = await Vendor.findById(
            recoveryToken.user
        ).session(session);

        if (!vendor) {
            return sendError(res, 404, "Vendor not found.");
        }

        const student =
            typeof req.body.student === "string"
                ? JSON.parse(req.body.student)
                : req.body.student;

        const business =
            typeof req.body.business === "string"
                ? JSON.parse(req.body.business)
                : req.body.business;

        const verificationDocuments =
            typeof req.body.verificationDocuments === "string"
                ? JSON.parse(req.body.verificationDocuments)
                : req.body.verificationDocuments;


        if (!vendor.isLocked) {
            await session.abortTransaction();
            return sendError(
                res,
                400,
                "This account does not require recovery."
            );
        }

        const existingRecovery = await RecoveryRequest.findOne({
            vendor: vendor._id,
            recoveryStatus: {
                $in: [
                    "submitted",
                    "under_review"
                ]
            }
        }).session(session);

        if (existingRecovery) {
            await session.abortTransaction();

            return sendError(
                res,
                409,
                "A recovery request is already under review."
            );
        }

        const profilePhoto =
            req.files?.profilePhoto?.[0]?.path;

        const businessLogo =
            req.files?.businessLogo?.[0]?.path;

        const schoolIdCard =
            req.files?.schoolIdCard?.[0]?.path;

        const nationalId =
            req.files?.nationalId?.[0]?.path;

        if (!profilePhoto) {
            await session.abortTransaction();
            return sendError(res, 400, "Profile photo is required.");
        }

        if (!schoolIdCard) {
            await session.abortTransaction();
            return sendError(res, 400, "School ID Card is required.");
        }

        if (!nationalId) {
            await session.abortTransaction();
            return sendError(res, 400, "National ID is required.");
        }

        const caseNumber = await generateRecoveryCaseNumber();

        const recoveryRequest = await RecoveryRequest.create(
            [
                {
                    vendor: vendor._id,

                    caseNumber,

                    recoveryStatus: "submitted",

                    originalAccount: {
                        fullName: vendor.fullName,
                        email: vendor.email,
                        student: vendor.student,
                        business: vendor.business,
                        verificationDocuments:
                            vendor.verificationDocuments,
                    },

                    submittedData: {
                        fullName: req.body.fullName,
                        email: req.body.email,

                        student: {
                            profilePhoto,
                            gender: student.gender,
                            institution: student.institution,
                            state: student.state,
                            matricNumber: student.matricNumber,
                            faculty: student.faculty,
                            department: student.department,
                            level: student.level,
                            residence: student.residence,
                            address: student.address,
                        },

                        business: {
                            storeName: business.storeName,
                            type: business.type,
                            description: business.description,
                            logo: businessLogo,
                            banner: req.files?.businessBanner?.[0]?.path || null,
                            socials: {
                                facebook:
                                    business.socials?.facebook || "",
                                instagram:
                                    business.socials?.instagram || "",
                                whatsapp:
                                    business.socials?.whatsapp || "",
                                tiktok:
                                    business.socials?.tiktok || "",
                            },
                        },

                        verificationDocuments: {
                            schoolIdCard,
                            nationalId,
                        },
                    },

                    requestMetadata: {
                        ipAddress: req.ip,
                        userAgent: req.headers["user-agent"],
                    },

                    founderActions: [
                        {
                            action: "Recovery request submitted",
                            note: "Awaiting founder review.",
                        },
                    ],
                },
            ],
            {
                session,
            }
        );

        await AuditLog.create(
            [
                {
                    user: vendor._id,
                    role: "vendor",
                    action: "ACCOUNT_RECOVERY_REQUEST_CREATED",
                    entity: "RecoveryRequest",
                    entityId: recoveryRequest[0]._id,

                    metadata: {
                        caseNumber,
                        serialNumber: vendor.serialNumber,
                        ip: req.ip,
                        userAgent: req.headers["user-agent"],
                    },
                },
            ],
            {
                session,
            }
        );

        await session.commitTransaction();

        return sendSuccess(
            res,
            201,
            "Recovery request submitted successfully. Your account is awaiting review.",
            recoveryRequest[0]
        );
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        logger.error(error);

        return sendError(
            res,
            500,
            "Unable to submit recovery request."
        );
    } finally {
        session.endSession();
    }
};