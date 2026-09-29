const { getAllProducts, getProductById, getProductStats, updateProductVisibility, } = require("../../services/founder/products.service");

const { sendSuccess, sendError, } = require("../../utils/responseStruture");

const logger = require("../../logger");


const handleError = (res, error, fallbackMessage) => {
    logger.error(fallbackMessage, {
        error: error.message,
        stack: error.stack,
    });

    return sendError(
        res,
        error.statusCode || 500,
        error.statusCode ? error.message : fallbackMessage,
        error.errors || null
    );
};

exports.getAllProducts = async (req, res) => {
    try {
        const {
            page,
            limit,
            search,
            visibility,
            status,
            category,
            vendor,
        } = req.query;

        const result = await getAllProducts({
            page,
            limit,
            search,
            visibility,
            status,
            category,
            vendor,
        });

        return sendSuccess(res, 200, "Products fetched successfully", result);
    } catch (error) {
        return handleError(res, error, "Failed to fetch products");
    }
};


exports.getProductById = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await getProductById(productId);

        return sendSuccess(res, 200, "Product fetched successfully", product);
    } catch (error) {
        return handleError(res, error, "Failed to fetch product");
    }
};


exports.getProductStats = async (req, res) => {
    try {
        const stats = await getProductStats();

        return sendSuccess(res, 200, "Product statistics fetched successfully", stats);
    } catch (error) {
        return handleError(res, error, "Failed to fetch product statistics");
    }
};


exports.updateProductVisibility = async (req, res) => {
    try {
        const { productId } = req.params;

        const { visibility, reason } = req.body;

        const founderId = req.user?._id;

        const updatedProduct = await updateProductVisibility({productId, visibility, reason, founderId, });

        return sendSuccess(res, 200,
            visibility
                ? "Product visibility enabled successfully"
                : "Product visibility disabled successfully",
            updatedProduct
        );
    } catch (error) {
        return handleError(res, error, "Failed to update product visibility");
    }
};