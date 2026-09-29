const mongoose = require("mongoose");

const AddProduct = require("../../models/addproduct.model");
const Vendor = require("../../models/vendor.model");
const Category = require("../../models/category.model");
const AuditLog = require("../../models/auditLog.model");

const AppError = require('../common/AppError');

const logger = require("../../logger");



const getAllProducts = async ({
    page = 1,
    limit = 20,
    search = "",
    visibility,
    status,
    category,
    vendor,
}) => {
    try {
        page = Math.max(Number(page) || 1, 1);
        limit = Math.min(Math.max(Number(limit) || 20, 1), 100);

        const skip = (page - 1) * limit;

        const query = {};

        if (search && search.trim()) {
            query.name = {
                $regex: search.trim(),
                $options: "i",
            };
        }

        if (visibility !== undefined && visibility !== "") {
            if (visibility === true || visibility === "true") {
                query.visibility = true;
            }

            if (visibility === false || visibility === "false") {
                query.visibility = false;
            }
        }

        if (status && status.trim()) {
            query.status = status.trim();
        }

        if (category) {
            if (!mongoose.Types.ObjectId.isValid(category)) {
                throw new AppError("Invalid category ID", 400);
            }

            query.category = category;
        }

        if (vendor) {
            if (!mongoose.Types.ObjectId.isValid(vendor)) {
                throw new AppError("Invalid vendor ID", 400);
            }

            query.vendor = vendor;
        }

        const [products, totalProducts] = await Promise.all([
            AddProduct.find(query)
                .populate({
                    path: "vendor",
                    select: "serialNumber fullName email phoneNo business verificationStatus accountStatus",
                })
                .populate({
                    path: "category",
                    select: "name slug",
                })
                .populate({
                    path: "subCategory",
                    select: "name slug",
                })
                .populate({
                    path: "visibilityActionBy",
                    select: "serialNumber fullName email",
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            AddProduct.countDocuments(query),
        ]);

        const totalPages = Math.ceil(totalProducts / limit);

        return {
            products,
            pagination: {
                currentPage: page,
                limit,
                totalProducts,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
        };
    } catch (error) {
        logger.error("Failed to fetch products", {
            error: error.message,
            stack: error.stack,
        });

        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError("Failed to fetch products", 500);
    }
};


const getProductById = async (productId) => {
    try {
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            throw new AppError("Invalid product ID", 400);
        }

        const product = await AddProduct.findOne({
            _id: productId,
        })
            .populate({
                path: "vendor",
                select: "serialNumber fullName email emailVerified phoneNo business verificationStatus accountStatus isActive isDeleted createdAt",
            })
            .populate({
                path: "category",
                select: "name slug",
            })
            .populate({
                path: "subCategory",
                select: "name slug",
            })
            .populate({
                path: "visibilityActionBy",
                select: "serialNumber fullName email",
            })
            .lean();

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        return product;
    } catch (error) {
        logger.error("Failed to fetch product", {
            productId,
            error: error.message,
            stack: error.stack,
        });

        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError("Failed to fetch product", 500);
    }
};


const getProductStats = async () => {
    try {
        const baseQuery = {};

        const [
            totalProducts,
            visibleProducts,
            hiddenProducts,
            inStockProducts,
            lowStockProducts,
            outOfStockProducts,
            salesStats,
            stockStats,
        ] = await Promise.all([
            AddProduct.countDocuments(baseQuery),

            AddProduct.countDocuments({
                ...baseQuery,
                visibility: true,
            }),

            AddProduct.countDocuments({
                ...baseQuery,
                visibility: false,
            }),

            AddProduct.countDocuments({
                ...baseQuery,
                status: "in-stock",
            }),

            AddProduct.countDocuments({
                ...baseQuery,
                status: "low-in-stock",
            }),

            AddProduct.countDocuments({
                ...baseQuery,
                status: "out-of-stock",
            }),

            AddProduct.aggregate([
                {
                    $match: baseQuery,
                },
                {
                    $group: {
                        _id: null,
                        totalSold: {
                            $sum: "$sold",
                        },
                    },
                },
            ]),

            AddProduct.aggregate([
                {
                    $match: baseQuery,
                },
                {
                    $group: {
                        _id: null,
                        totalStock: {
                            $sum: "$stock",
                        },
                        totalStockValue: {
                            $sum: {
                                $multiply: ["$stock", "$price"],
                            },
                        },
                    },
                },
            ]),
        ]);

        return {
            products: {
                total: totalProducts,
                visible: visibleProducts,
                hidden: hiddenProducts,
            },

            inventory: {
                inStock: inStockProducts,
                lowStock: lowStockProducts,
                outOfStock: outOfStockProducts,
                totalUnits: stockStats[0]?.totalStock || 0,
                totalStockValue: stockStats[0]?.totalStockValue || 0,
            },

            sales: {
                totalUnitsSold: salesStats[0]?.totalSold || 0,
            },
        };
    } catch (error) {
        logger.error("Failed to fetch product statistics", {
            error: error.message,
            stack: error.stack,
        });

        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError("Failed to fetch product statistics", 500);
    }
};


const updateProductVisibility = async ({
    productId,
    visibility,
    reason,
    founderId,
}) => {
    try {
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            throw new AppError("Invalid product ID", 400);
        }

        if (typeof visibility !== "boolean") {
            throw new AppError("Visibility must be true or false", 400);
        }

        if (!founderId || !mongoose.Types.ObjectId.isValid(founderId)) {
            throw new AppError("Invalid founder ID", 400);
        }

        const product = await AddProduct.findOne({
            _id: productId,
        });

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        const previousVisibility = product.visibility;

        product.visibility = visibility;
        product.visibilityActionBy = founderId;
        product.visibilityActionModel = "Founder";
        product.visibilityActionAt = new Date();

        product.visibilityReason =
            reason && reason.trim()
                ? reason.trim()
                : null;

        await product.save();

        await AuditLog.create({
            user: founderId,
            userModel: "Founder",

            actor: founderId,
            actorModel: "Founder",
            actorRole: "founder",

            targetUser: product.vendor,
            role: "vendor",

            action: visibility
                ? "product_VISIBILITY_ENABLED"
                : "product_VISIBILITY_DISABLED",

            entity: "product",
            entityId: product._id,

            reason: product.visibilityReason,

            metadata: {
                previousVisibility,
                newVisibility: visibility,
                productName: product.name,
                vendorId: product.vendor,
            },
        });

        return await AddProduct.findById(product._id)
            .populate({
                path: "vendor",
                select: "serialNumber fullName email phoneNo business",
            })
            .populate({
                path: "category",
                select: "name slug",
            })
            .populate({
                path: "subCategory",
                select: "name slug",
            })
            .populate({
                path: "visibilityActionBy",
                select: "serialNumber fullName email",
            })
            .lean();
    } catch (error) {
        logger.error("Failed to update product visibility", {
            productId,
            founderId,
            error: error.message,
            stack: error.stack,
        });

        if (error instanceof AppError) {
            throw error;
        }

        throw new AppError("Failed to update product visibility", 500);
    }
};


module.exports = {
    getAllProducts,
    getProductById,
    getProductStats,
    updateProductVisibility,
};