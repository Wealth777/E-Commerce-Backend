const mongoose = require("mongoose");

const vendorModel = require("../../models/vendor.model");
const auditLogModel = require("../../models/auditLog.model");

const requestInfo = require("../../utils/getRequestHelper");

const AppError = require('../common/AppError');

const logger = require("../../logger");


const getAllVendors = async () => {
    try {
        const vendors = await vendorModel
            .find({})
            .populate("student.institution", "name")
            .populate("student.state", "name")
            .select(
                "serialNumber fullName email emailVerified phoneNo student.institution student.state student.profilePhoto business.storeName totalOrder accountStatus isActive isSuspend isLocked isDeleted createdAt updatedAt"
            )
            .sort({ createdAt: -1 })
            .lean();

        return vendors;
    } catch (error) {
        logger.error("Failed to fetch vendors", {
            error: error.message,
            stack: error.stack,
        });

        throw new AppError(error.message, 500);
    }
};

const getVendorById = async (vendorId) => {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        throw new AppError("Invalid vendor ID", 400);
    }

    try {
        const vendor = await vendorModel
            .findById(vendorId)
            .populate("institution")
            .populate("state")
            .lean();

        if (!vendor) {
            throw new AppError("vendor not found", 400);
        }

        return vendor;
    } catch (error) {
        logger.error("Failed to fetch vendor", {
            vendorId,
            error: error.message,
            stack: error.stack,
        });

        throw new AppError(error.message, 500);
    }
};


/* Lock vendor account */
const lockVendor = async (vendorId, founderId, reason, req) => {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        throw new AppError("Invalid vendor ID", 400);
    }

    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
        throw new AppError("vendor not found", 404);
    }

    if (vendor.isDeleted || vendor.accountStatus === "deleted") {
        throw new AppError("Deleted vendor accounts cannot be locked", 400);
    }

    if (vendor.isLocked || vendor.accountStatus === "locked") {
        throw new AppError("vendor account is already locked", 400);
    }

    vendor.isLocked = true;
    vendor.isActive = false;
    vendor.isSuspend = false;
    vendor.lockReason = reason || "Locked by Founder";
    vendor.accountStatus = "locked";
    vendor.tokenVersion += 1;

    await vendor.save();

    await auditLogModel.create({
        user: vendor._id,
        userModel: "Vendor",

        actor: founderId,
        actorModel: "Founder",
        actorRole: "founder",

        targetUser: vendor._id,
        role: "vendor",

        action: "vendor_LOCKED",
        entity: "vendor",
        entityId: vendor._id,

        reason: vendor.lockReason,

        metadata: {
            request: requestInfo(req),
        },
    });

    return vendor;
};


/* Unlock vendor account */
const unlockVendor = async (vendorId, founderId, req) => {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        throw new AppError("Invalid vendor ID", 400);
    }

    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
        throw new AppError("vendor not found", 404);
    }

    if (vendor.isDeleted || vendor.accountStatus === "deleted") {
        throw new AppError("Deleted vendor accounts cannot be unlocked", 400);
    }

    if (!vendor.isLocked && vendor.accountStatus !== "locked") {
        throw new AppError("vendor account is not locked", 400);
    }

    vendor.isLocked = false;
    vendor.lockReason = null;
    vendor.accountStatus = "active";
    vendor.isActive = true;
    vendor.isSuspend = false;

    await vendor.save();

    await auditLogModel.create({
        user: vendor._id,
        userModel: "Vendor",

        actor: founderId,
        actorModel: "Founder",
        actorRole: "founder",

        targetUser: vendor._id,
        role: "vendor",

        action: "vendor_UNLOCKED",
        entity: "vendor",
        entityId: vendor._id,

        metadata: {
            request: requestInfo(req),
        },
    });

    return vendor;
};


/* Ban vendor account */
const banVendor = async (vendorId, founderId, reason, req) => {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        throw new AppError("Invalid vendor ID", 400);
    }

    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
        throw new AppError("vendor not found", 404);
    }

    if (vendor.isDeleted || vendor.accountStatus === "deleted") {
        throw new AppError("Deleted vendor accounts cannot be banned", 400);
    }

    if (vendor.accountStatus === "banned") {
        throw new AppError("vendor account is already banned", 400);
    }

    vendor.accountStatus = "banned";
    vendor.isActive = false;
    vendor.isLocked = false;
    vendor.isSuspend = false;
    vendor.tokenVersion += 1;

    await vendor.save();

    await auditLogModel.create({
        user: vendor._id,
        userModel: "Vendor",

        actor: founderId,
        actorModel: "Founder",
        actorRole: "founder",

        targetUser: vendor._id,
        role: "vendor",

        action: "vendor_BANNED",
        entity: "vendor",
        entityId: vendor._id,

        reason: reason || "Banned by Founder",

        metadata: {
            request: requestInfo(req),
        },
    });

    return vendor;
};


/* Delete vendor account */
const deleteVendor = async (vendorId, founderId, reason, req) => {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
        throw new AppError("Invalid vendor ID", 400);
    }

    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
        throw new AppError("vendor not found", 404);
    }

    if (vendor.isDeleted || vendor.accountStatus === "deleted") {
        throw new AppError("vendor account is already deleted", 400);
    }

    vendor.isDeleted = true;
    vendor.deletedBy = founderId;
    vendor.deletedByModel = "Founder";
    vendor.isActive = false;
    vendor.accountStatus = "deleted";
    vendor.deleteReason = reason || "Deleted by Founder";
    vendor.deleteDate = new Date();
    vendor.tokenVersion += 1;

    await vendor.save();

    await auditLogModel.create({
        user: vendor._id,
        userModel: "Vendor",

        actor: founderId,
        actorModel: "Founder",
        actorRole: "founder",

        targetUser: vendor._id,
        role: "vendor",

        action: "vendor_DELETED",
        entity: "vendor",
        entityId: vendor._id,

        reason: vendor.deleteReason,

        metadata: {
            request: requestInfo(req),
        },
    });

    return vendor;
};


module.exports = {
    getAllVendors,
    getVendorById,
    lockVendor,
    unlockVendor,
    banVendor,
    deleteVendor,
};