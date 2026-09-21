const mongoose = require("mongoose");

const buyerModel = require("../../models/buyer.model");
const auditLogModel = require("../../models/auditLog.model");

const requestInfo = require("../../utils/getRequestHelper");

const AppError = require('../common/AppError');

const logger = require("../../logger");


/* Get all buyers for Founder management */
const getAllBuyers = async () => {
  try {
    const buyers = await buyerModel
      .find({})
      .populate("institution", "name")
      .populate("state", "name")
      .select(
        "serialNumber fullName email emailVerified phoneNo institution state student.profilePhoto totalOrder accountStatus isActive isSuspend isLocked isDeleted createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .lean();

    return buyers;
  } catch (error) {
    logger.error("Failed to fetch buyers", {
      error: error.message,
      stack: error.stack,
    });

    throw new AppError(error.message, 500);
  }
};


/**
 * Get one buyer by ID
 */
const getBuyerById = async (buyerId) => {
  if (!mongoose.Types.ObjectId.isValid(buyerId)) {
    throw new AppError("Invalid buyer ID", 400);
  }

  try {
    const buyer = await buyerModel
      .findById(buyerId)
      .populate("institution")
      .populate("state")
      .lean();

    if (!buyer) {
      throw new AppError("Buyer not found", 400);
    }

    return buyer;
  } catch (error) {
    logger.error("Failed to fetch buyer", {
      buyerId,
      error: error.message,
      stack: error.stack,
    });

    throw new AppError(error.message, 500);
  }
};


/* Lock buyer account */
const lockBuyer = async (buyerId, founderId, reason, req) => {
  if (!mongoose.Types.ObjectId.isValid(buyerId)) {
    throw new AppError("Invalid buyer ID", 400);
  }

  const buyer = await buyerModel.findById(buyerId);

  if (!buyer) {
    throw new AppError("Buyer not found", 404);
  }

  if (buyer.isDeleted || buyer.accountStatus === "deleted") {
    throw new AppError("Deleted buyer accounts cannot be locked", 400);
  }

  if (buyer.isLocked || buyer.accountStatus === "locked") {
    throw new AppError("Buyer account is already locked", 400);
  }

  buyer.isLocked = true;
  buyer.isActive = false;
  buyer.isSuspend = false;
  buyer.lockReason = reason || "Locked by Founder";
  buyer.accountStatus = "locked";
  buyer.tokenVersion += 1;

  await buyer.save();

  await auditLogModel.create({
    user: buyer._id,
    userModel: "Buyer",

    actor: founderId,
    actorModel: "Founder",
    actorRole: "founder",

    targetUser: buyer._id,
    role: "buyer",

    action: "BUYER_LOCKED",
    entity: "Buyer",
    entityId: buyer._id,

    reason: buyer.lockReason,

    metadata: {
      request: requestInfo(req),
    },
  });

  return buyer;
};


/* Unlock buyer account */
const unlockBuyer = async (buyerId, founderId, req) => {
  if (!mongoose.Types.ObjectId.isValid(buyerId)) {
    throw new AppError("Invalid buyer ID", 400);
  }

  const buyer = await buyerModel.findById(buyerId);

  if (!buyer) {
    throw new AppError("Buyer not found", 404);
  }

  if (buyer.isDeleted || buyer.accountStatus === "deleted") {
    throw new AppError("Deleted buyer accounts cannot be unlocked", 400);
  }

  if (!buyer.isLocked && buyer.accountStatus !== "locked") {
    throw new AppError("Buyer account is not locked", 400);
  }

  buyer.isLocked = false;
  buyer.lockReason = null;
  buyer.accountStatus = "active";
  buyer.isActive = true;
  buyer.isSuspend = false;

  await buyer.save();

  await auditLogModel.create({
    user: buyer._id,
    userModel: "Buyer",

    actor: founderId,
    actorModel: "Founder",
    actorRole: "founder",

    targetUser: buyer._id,
    role: "buyer",

    action: "BUYER_UNLOCKED",
    entity: "Buyer",
    entityId: buyer._id,

    metadata: {
      request: requestInfo(req),
    },
  });

  return buyer;
};


/* Ban buyer account */
const banBuyer = async (buyerId, founderId, reason, req) => {
  if (!mongoose.Types.ObjectId.isValid(buyerId)) {
    throw new AppError("Invalid buyer ID", 400);
  }

  const buyer = await buyerModel.findById(buyerId);

  if (!buyer) {
    throw new AppError("Buyer not found", 404);
  }

  if (buyer.isDeleted || buyer.accountStatus === "deleted") {
    throw new AppError("Deleted buyer accounts cannot be banned", 400);
  }

  if (buyer.accountStatus === "banned") {
    throw new AppError("Buyer account is already banned", 400);
  }

  buyer.accountStatus = "banned";
  buyer.isActive = false;
  buyer.isLocked = false;
  buyer.isSuspend = false;
  buyer.tokenVersion += 1;

  await buyer.save();

  await auditLogModel.create({
    user: buyer._id,
    userModel: "Buyer",

    actor: founderId,
    actorModel: "Founder",
    actorRole: "founder",

    targetUser: buyer._id,
    role: "buyer",

    action: "BUYER_BANNED",
    entity: "Buyer",
    entityId: buyer._id,

    reason: reason || "Banned by Founder",

    metadata: {
      request: requestInfo(req),
    },
  });

  return buyer;
};


/* Delete buyer account */
const deleteBuyer = async (buyerId, founderId, reason, req) => {
  if (!mongoose.Types.ObjectId.isValid(buyerId)) {
    throw new AppError("Invalid buyer ID", 400);
  }

  const buyer = await buyerModel.findById(buyerId);

  if (!buyer) {
    throw new AppError("Buyer not found", 404);
  }

  if (buyer.isDeleted || buyer.accountStatus === "deleted") {
    throw new AppError("Buyer account is already deleted", 400);
  }

  buyer.isDeleted = true;
  buyer.deletedBy = founderId;
  buyer.deletedByModel = "Founder";
  buyer.isActive = false;
  buyer.accountStatus = "deleted";
  buyer.deleteReason = reason || "Deleted by Founder";
  buyer.deleteDate = new Date();
  buyer.tokenVersion += 1;

  await buyer.save();

  await auditLogModel.create({
    user: buyer._id,
    userModel: "Buyer",

    actor: founderId,
    actorModel: "Founder",
    actorRole: "founder",

    targetUser: buyer._id,
    role: "buyer",

    action: "BUYER_DELETED",
    entity: "Buyer",
    entityId: buyer._id,

    reason: buyer.deleteReason,

    metadata: {
      request: requestInfo(req),
    },
  });

  return buyer;
};


module.exports = {
  getAllBuyers,
  getBuyerById,
  lockBuyer,
  unlockBuyer,
  banBuyer,
  deleteBuyer,
};