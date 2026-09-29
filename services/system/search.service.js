const AddProduct = require("../../models/addproduct.model");
const Vendor = require("../../models/vendor.model");
const AppError = require("../common/AppError");

const searchMarketplace = async (query) => {
    const searchQuery = query?.trim();

    if (!searchQuery) {
        throw new AppError("Search query is required", 400);
    }

    if (searchQuery.length < 2) {
        throw new AppError("Search query must be at least 2 characters", 400);
    }

    const regex = new RegExp(searchQuery, "i");

    const [products, vendors] = await Promise.all([
        AddProduct.find({
            visibility: true,
            $or: [
                { name: regex },
                { description: regex },
            ],
        })
            .populate({
                path: "vendor",
                select: "fullName business.storeName business.logo",
                match: {
                    isDeleted: false,
                    isActive: true,
                    accountStatus: "active",
                    verificationStatus: "approved",
                },
            })
            .select("name image price vendor category")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean(),

        Vendor.find({
            isDeleted: false,
            isActive: true,
            accountStatus: "active",
            verificationStatus: "approved",
            $or: [
                { "business.storeName": regex },
                { "business.description": regex },
                { fullName: regex },
            ],
        })
            .select("fullName business.storeName business.logo")
            .sort({ "business.storeName": 1 })
            .limit(5)
            .lean(),
    ]);

    const validProducts = products.filter((product) => product.vendor);

    return {
        query: searchQuery,
        products: validProducts,
        vendors,
        counts: {
            products: validProducts.length,
            vendors: vendors.length,
        },
    };
};

module.exports = {
    searchMarketplace,
};