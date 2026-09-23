const mongoose = require("mongoose");

const vendorModel = require("../../models/vendor.model");
const auditLogModel = require("../../models/auditLog.model");

const requestInfo = require("../../utils/getRequestHelper");
const AppError = require("../common/AppError");
const logger = require("../../logger");


const getPendingVendorApprovals = async () => {
    try {
        const vendors = await vendorModel
            .find({
                onboardingCompleted: true,
                isDeleted: false,
            })
            .populate("student.institution", "name")
            .populate("student.state", "name")
            .select(
                [
                    "serialNumber",
                    "fullName",
                    "email",
                    "emailVerified",
                    "phoneNo",

                    "onboardingSentAt",
                    "onboardingCompleted",

                    "student",
                    "business",
                    "verificationDocuments",
                    "terms",
                    "bankDetails",

                    "verificationStatus",
                    "accountStatus",

                    "createdAt",
                    "updatedAt",
                ].join(" ")
            )
            .sort({ onboardingSentAt: -1 });

        return vendors;
    } catch (error) {
        logger.error("Failed to get pending vendor approvals", {
            error: error.message,
            stack: error.stack,
        });

        throw new AppError(
            "Failed to retrieve pending vendor approvals",
            500
        );
    }
};


const getVendorOnboardingDetails = async (vendorId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            throw new AppError("Invalid vendor ID", 400);
        }

        const vendor = await vendorModel
            .findOne({
                _id: vendorId,
                isDeleted: false,
            })
            .populate("student.institution", "name")
            .populate("student.state", "name")
            .select([
                "serialNumber",
                "fullName",
                "email",
                "emailVerified",
                "emailVerifiedDate",
                "phoneNo",

                "student.profilePhoto",
                "student.gender",
                "student.institution",
                "student.state",
                "student.matricNumber",
                "student.faculty",
                "student.department",
                "student.level",
                "student.residence",
                "student.address",

                "business.storeName",
                "business.type",
                "business.description",
                "business.logo",
                "business.banner",
                "business.socials",

                "verificationDocuments.schoolIdCard",
                "verificationDocuments.nationalId",

                "terms.acceptedVendorTerms",
                "terms.acceptedMarketplacePolicy",
                "terms.acceptedFraudPolicy",
                "terms.acceptedAt",

                "bankDetails.bankName",
                "bankDetails.accountName",
                "bankDetails.accountNumber",

                "onboardingCompleted",
                "onboardingSentAt",
                "isLocked",
                "isSuspend",
                "isActive",

                "verificationStatus",
                "verificationApprovedAt",
                "verificationApprovedBy",
                "verificationRejectedAt",
                "verificationRejectedBy",
                "verificationRejectionReason",

                "accountStatus",

                "createdAt",
                "updatedAt",
            ].join(" "));

        if (!vendor) {
            throw new AppError("Vendor not found", 404);
        }

        return vendor;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        logger.error("Failed to get vendor onboarding details", {
            vendorId,
            error: error.message,
            stack: error.stack,
        });

        throw new AppError(
            "Failed to retrieve vendor onboarding details",
            500
        );
    }
};


const approveVendor = async (vendorId, founderId, req) => {
    const session = await mongoose.startSession();

    try {
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            throw new AppError("Invalid vendor ID", 400);
        }

        if (!mongoose.Types.ObjectId.isValid(founderId)) {
            throw new AppError("Invalid founder ID", 400);
        }

        session.startTransaction();

        const vendor = await vendorModel
            .findOne({
                _id: vendorId,
                isDeleted: false,
            })
            .session(session);

        if (!vendor) {
            throw new AppError("Vendor not found", 404);
        }

        if (vendor.verificationStatus === "approved") {
            throw new AppError(
                "Vendor has already been approved",
                400
            );
        }

        if (vendor.verificationStatus === "rejected") {
            throw new AppError(
                "Rejected vendor cannot be approved directly. Review the onboarding request again first.",
                400
            );
        }

        if (vendor.accountStatus !== "pending") {
            throw new AppError(
                `Vendor account is currently ${vendor.accountStatus}`,
                400
            );
        }

        if (!vendor.onboardingSentAt) {
            throw new AppError(
                "Vendor has not received an onboarding request",
                400
            );
        }

        if (!vendor.onboardingCompleted) {
            throw new AppError(
                "Vendor has not completed onboarding",
                400
            );
        }

        if (vendor.verificationStatus !== "pending") {
            throw new AppError(
                "Vendor is not currently awaiting verification",
                400
            );
        }

        const now = new Date();

        vendor.isVerified = true;

        vendor.verificationStatus = "approved";

        vendor.verificationApprovedAt = now;
        vendor.verificationApprovedBy = founderId;

        vendor.verificationRejectedAt = null;
        vendor.verificationRejectedBy = null;
        vendor.verificationRejectionReason = null;

        vendor.accountStatus = "active";
        vendor.isActive = true;

        await vendor.save({ session });

        await auditLogModel.create(
            [
                {
                    user: vendor._id,
                    userModel: "Vendor",

                    actor: founderId,
                    actorModel: "Founder",

                    action: "VENDOR_VERIFICATION_APPROVED",

                    metadata: {
                        vendorId: vendor._id,
                        verificationStatus: "approved",
                        accountStatus: "active",
                    },

                    // IMPORTANT: pass req here
                    request: requestInfo(req),
                },
            ],
            { session }
        );

        await session.commitTransaction();

        return vendor;
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        if (error instanceof AppError) {
            throw error;
        }

        logger.error("Failed to approve vendor", {
            vendorId,
            founderId,
            error: error.message,
            stack: error.stack,
        });

        throw new AppError(
            "Failed to approve vendor",
            500
        );
    } finally {
        await session.endSession();
    }
};


const rejectVendor = async (
    vendorId,
    founderId,
    rejectionReason,
    req
) => {
    const session = await mongoose.startSession();

    try {
        if (!mongoose.Types.ObjectId.isValid(vendorId)) {
            throw new AppError(
                "Invalid vendor ID",
                400
            );
        }

        if (!mongoose.Types.ObjectId.isValid(founderId)) {
            throw new AppError(
                "Invalid founder ID",
                400
            );
        }

        if (
            !rejectionReason ||
            typeof rejectionReason !== "string" ||
            !rejectionReason.trim()
        ) {
            throw new AppError(
                "A rejection reason is required",
                400
            );
        }

        if (!req) {
            throw new AppError(
                "Request information is required",
                500
            );
        }

        const trimmedReason =
            rejectionReason.trim();

        if (trimmedReason.length < 10) {
            throw new AppError(
                "Rejection reason must be at least 10 characters",
                400
            );
        }

        session.startTransaction();

        const vendor = await vendorModel
            .findOne({
                _id: vendorId,
                isDeleted: false,
            })
            .session(session);

        if (!vendor) {
            throw new AppError(
                "Vendor not found",
                404
            );
        }

        if (
            vendor.verificationStatus ===
            "approved"
        ) {
            throw new AppError(
                "An approved vendor cannot be rejected through onboarding review",
                400
            );
        }

        if (
            vendor.verificationStatus ===
            "rejected"
        ) {
            throw new AppError(
                "Vendor has already been rejected",
                400
            );
        }

        if (
            vendor.accountStatus !==
            "pending"
        ) {
            throw new AppError(
                `Vendor account is currently ${vendor.accountStatus}`,
                400
            );
        }

        if (!vendor.onboardingSentAt) {
            throw new AppError(
                "Vendor has not received an onboarding request",
                400
            );
        }

        if (!vendor.onboardingCompleted) {
            throw new AppError(
                "Vendor has not completed onboarding",
                400
            );
        }

        if (
            vendor.verificationStatus !==
            "pending"
        ) {
            throw new AppError(
                "Vendor is not currently awaiting verification",
                400
            );
        }

        const now = new Date();

        vendor.isVerified = false;

        vendor.verificationStatus =
            "rejected";

        vendor.verificationRejectedAt = now;
        vendor.verificationRejectedBy =
            founderId;
        vendor.verificationRejectionReason =
            trimmedReason;

        vendor.verificationApprovedAt = null;
        vendor.verificationApprovedBy = null;

        vendor.accountStatus = "pending";
        vendor.isActive = true;

        await vendor.save({ session });

        await auditLogModel.create(
            [
                {
                    user: vendor._id,
                    userModel: "Vendor",

                    actor: founderId,
                    actorModel: "Founder",

                    action:
                        "VENDOR_VERIFICATION_REJECTED",

                    metadata: {
                        vendorId: vendor._id,
                        verificationStatus:
                            "rejected",
                        accountStatus:
                            "pending",
                        rejectionReason:
                            trimmedReason,
                    },

                    request: requestInfo(req),
                },
            ],
            { session }
        );

        await session.commitTransaction();

        return vendor;
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        if (error instanceof AppError) {
            throw error;
        }

        logger.error(
            "Failed to reject vendor",
            {
                vendorId,
                founderId,
                error: error.message,
                stack: error.stack,
            }
        );

        throw new AppError(
            "Failed to reject vendor",
            500
        );
    } finally {
        await session.endSession();
    }
};

module.exports = {
    getPendingVendorApprovals,
    getVendorOnboardingDetails,
    approveVendor,
    rejectVendor,
};