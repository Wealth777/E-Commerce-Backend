const {
    sendResponse,
    sendSuccess,
    sendError,
} = require("../../utils/responseStruture");

const {
    searchMarketplace,
} = require("../../services/system/search.service");

const searchMarketplaceController = async (req, res) => {
    try {
        const { query } = req.query;

        const result = await searchMarketplace(query);

        return sendSuccess(
            res,
            200,
            "Search completed successfully",
            result
        );
    } catch (error) {
        return sendError(res, error);
    }
};

module.exports = {
    searchMarketplaceController,
};