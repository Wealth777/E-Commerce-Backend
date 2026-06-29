
const mongoose = require('mongoose');
const Product = require('../../models/addproduct.model');
const ProductRating = require('../../models/productRating.model');
const Review = require('../../models/review.model');

async function syncProductRatingSummary(productId, session = null) {
    const result = await ProductRating.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId), status: 'active', deleted: { $ne: true } } },
        {
            $group: {
                _id: null, totalRatings: { $sum: 1 },
                weighted: { $sum: { $divide: ['$rating', 5] } },
                one: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
                two: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                three: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                four: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                five: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } }
            }
        }
    ]).session(session);
    const row = result[0] || {};
    const total = row.totalRatings || 0;
    const averageRating = total ? Number((row.weighted / total).toFixed(2)) : 0;
    await Product.findByIdAndUpdate(productId, { $set: { ratingSummary: { averageRating, totalRatings: total, breakdown: { 1: row.one || 0, 2: row.two || 0, 3: row.three || 0, 4: row.four || 0, 5: row.five || 0 } } } }, { session });
}
async function syncProductReviewSummary(productId, session = null) {
    const totalReviews = await Review.countDocuments({ product: productId, status: 'active', deleted: { $ne: true } }).session(session);
    await Product.findByIdAndUpdate(productId, { $set: { reviewSummary: { totalReviews } } }, { session });
}
module.exports = { syncProductRatingSummary, syncProductReviewSummary };