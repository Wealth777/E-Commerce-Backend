const express = require('express');
const router = express.Router();

const { verifyUser, requireRole, loginLimiter, apiLimiter } = require('../middleware/verifyUser');
const imageUpload = require('../middleware/imageUpload');

const { createUser, loginUser, googleLogin, logoutUser, getUsersDetails, updateBuyerProfile } = require('../controllers/Buyer/auth.controller');
const { addToCart, getCart, updateCartItem, removeFromCart } = require('../controllers/Buyer/cart.controller');
const { createBuyerOrder, getBuyerOrders, getSingleBuyerOrder, buyerConfirmDelivery, buyerCancelOrder, requestRefund, requestReturn } = require('../controllers/Buyer/order.controller');
const { getWishlist, addToWishlist, removeFromWishlist, clearWishlist } = require('../controllers/Buyer/wishlist.controller');
const { getUsersActivities } = require('../controllers/auditlog.controller');
const { validateRegister } = require('../middleware/validateRegister');
const ratingController = require('../controllers/common/rating.controller');
const reviewController = require('../controllers/common/review.controller');
const reportController = require('../controllers/common/report.controller');

router.use(apiLimiter);

router.post('/auth/register', validateRegister, createUser);

router.post('/auth/google', googleLogin);

router.post('/auth/login', loginLimiter, loginUser);

router.post('/auth/logout', verifyUser, logoutUser);

router.get('/profile/me', verifyUser, getUsersDetails);

router.put('/profile/me', verifyUser, imageUpload.fields([
    { name: 'profilePhoto', maxCount: 1 },
]), updateBuyerProfile);

router.post("/cart/add", verifyUser, addToCart);

router.get("/cart/", verifyUser, getCart);

router.put("/cart/update", verifyUser, updateCartItem);

router.post("/checkout", verifyUser, imageUpload.paymentProofUpload.any(), createBuyerOrder);

router.get("/orders", verifyUser, requireRole(['buyer']), getBuyerOrders);

router.post('/orders/action/confirmdelivered', verifyUser, buyerConfirmDelivery);

router.post('/orders/action/cancelorder', verifyUser, buyerCancelOrder);

router.get('/wishlist', verifyUser, getWishlist);

router.post('/wishlist', verifyUser, addToWishlist);

router.delete('/wishlist', verifyUser, clearWishlist);

router.get('/activity', verifyUser, getUsersActivities);

router.get('/ratings/me', verifyUser, requireRole(['buyer']), ratingController.getBuyerRatings);

router.get('/reviews/me', verifyUser, requireRole(['buyer']), reviewController.getBuyerReviews);

router.post('/reports', verifyUser, reportController.createReport);

router.get('/reports/me', verifyUser, reportController.getMyReports);

// Dynamic route
router.delete("/cart/:productId", verifyUser, removeFromCart);

router.get("/orders/:orderId", verifyUser, getSingleBuyerOrder);

router.post('/orders/:orderId/refund-request', verifyUser, requestRefund);

router.post('/orders/:orderId/return-request', verifyUser, requestReturn);

router.delete('/wishlist/:productId', verifyUser, removeFromWishlist);

router.post('/products/:productId/ratings', verifyUser, requireRole(['buyer']), ratingController.createProductRating);

router.patch('/ratings/:ratingId', verifyUser, requireRole(['buyer']), ratingController.updateProductRating);

router.delete('/ratings/:ratingId', verifyUser, requireRole(['buyer']), ratingController.deleteOwnProductRating);

router.get('/products/:productId/ratings', ratingController.getProductRatings);

router.get('/products/:productId/ratings/summary', ratingController.getProductRatingSummary);

router.post('/products/:productId/reviews', verifyUser, requireRole(['buyer']), reviewController.createReview);

router.patch('/reviews/:reviewId', verifyUser, requireRole(['buyer']), reviewController.updateOwnReview);

router.delete('/reviews/:reviewId', verifyUser, requireRole(['buyer']), reviewController.deleteOwnReview);

router.get('/products/:productId/reviews', reviewController.getProductReviews);


module.exports  = router;