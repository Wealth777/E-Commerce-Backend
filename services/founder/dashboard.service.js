const Buyer = require("../../models/buyer.model");
const Vendor = require("../../models/vendor.model");
const Order = require("../../models/buyerOrder.model");
const AddProduct = require("../../models/addproduct.model");
const AuditLog = require("../../models/auditLog.model");

const AppError = require('../common/AppError');

const logger = require("../../logger");

const getDashboardStats = async () => {
    try {
        const [
            totalBuyers,
            totalVendors,
            totalOrders,
            totalProducts,
            pendingVendorApprovals,
            recentActivities,
        ] = await Promise.all([
            Buyer.countDocuments({
                isDeleted: false,
            }),

            Vendor.countDocuments({
                isDeleted: false,
            }),

            Order.countDocuments(),

            AddProduct.countDocuments(),

            Vendor.countDocuments({
                isDeleted: false,
                verificationStatus: "pending",
            }),

            AuditLog.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("user", "fullName email serialNumber")
                .populate("actor", "fullName email serialNumber")
                .lean(),
        ]);

        const totalUsers = totalBuyers + totalVendors;

        return {
            totalUsers,
            totalVendors,
            totalBuyers,
            totalOrders,
            totalProducts,
            pendingVendorApprovals,
            recentActivities,
        }
    } catch (error) {
        logger.error("Failed to fetch dashboard stats", {
            error: error.message,
            stack: error.stack
        });

        throw new AppError(error.message, 500)
    }
};

module.exports = {
    getDashboardStats,
};