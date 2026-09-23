const { getAllOrders, getOrderById, getOrderStats, } = require('../../services/founder/orders.service')

const { sendSuccess, sendError } = require("../../utils/responseStruture");
const logger = require('../../logger')

const handleError = (res, error, fallbackMessage) => {
    logger.error("Failed to fetch buyer", error);
    return sendError(res, error.statusCode || 500, error.statusCode ? error.message : fallbackMessage, error.errors || null);
};

exports.getAllOrders = async (req, res) => {
    try {
        const {
            page,
            limit,
            search,
            status,
            paymentStatus,
            paymentMethod,
            deliveryMethod,
            startDate,
            endDate,
        } = req.query;

        const orders = await getAllOrders({
            page,
            limit,
            search,
            status,
            paymentStatus,
            paymentMethod,
            deliveryMethod,
            startDate,
            endDate,
        });

        return sendSuccess(res, 200, "Order fetched successfully", orders)
    } catch (error) {
        return handleError(res, error, 'Internal Server Error');
    }
}

exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params
        const orderDetails = await getOrderById(orderId);

        return sendSuccess(res, 200, "Order details fetched successfully", orderDetails)
    } catch (error) {
        return handleError(res, error, 'Internal Server Error');
    }
}

exports.getOrderStats = async (req, res) => {
    try {
        const orderStats = await getOrderStats();

        return sendSuccess(res, 200, "Order stats fetched successfully", orderStats)
    } catch (error) {
        return handleError(res, error, 'Internal Server Error')
    }
}