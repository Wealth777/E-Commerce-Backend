const express = require('express');
const router = express.Router();

const { verifyUser, requireRole, requireCompletedProfile, loginLimiter, apiLimiter } = require('../middleware/verifyUser');
const imageUpload = require('../middleware/imageUpload');

const { createUser, loginUser, googleLogin, logoutUser, getUsersDetails, updateBuyerProfile, completeBuyerProfile } = require('../controllers/Buyer/auth.controller');
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

router.put("/profile/complete", verifyUser, completeBuyerProfile);

router.put('/profile/me', verifyUser, imageUpload.fields([
    { name: 'profilePhoto', maxCount: 1 },
]), updateBuyerProfile);

router.post("/cart/add", verifyUser, requireCompletedProfile, addToCart);

router.get("/cart/", verifyUser, requireCompletedProfile, getCart);

router.put("/cart/update", verifyUser, requireCompletedProfile, updateCartItem);

router.post("/checkout", verifyUser, requireCompletedProfile, imageUpload.paymentProofUpload.any(), createBuyerOrder);

router.get("/orders", verifyUser, requireCompletedProfile, requireRole(['buyer']), getBuyerOrders);

router.post('/orders/action/confirmdelivered', verifyUser, requireCompletedProfile, buyerConfirmDelivery);

router.post('/orders/action/cancelorder', verifyUser, requireCompletedProfile, buyerCancelOrder);

router.get('/wishlist', verifyUser, requireCompletedProfile, getWishlist);

router.post('/wishlist', verifyUser, requireCompletedProfile, addToWishlist);

router.delete('/wishlist', verifyUser, requireCompletedProfile, clearWishlist);

router.get('/activity', verifyUser, requireCompletedProfile, getUsersActivities);

router.get('/ratings/me', verifyUser, requireCompletedProfile, requireRole(['buyer']), ratingController.getBuyerRatings);

router.get('/reviews/me', verifyUser, requireCompletedProfile, requireRole(['buyer']), reviewController.getBuyerReviews);

router.post('/reports', verifyUser, requireCompletedProfile, reportController.createReport);

router.get('/reports/me', verifyUser, requireCompletedProfile, reportController.getMyReports);

// Dynamic route
router.delete("/cart/:productId", verifyUser, requireCompletedProfile, removeFromCart);

router.get("/orders/:orderId", verifyUser, getSingleBuyerOrder);

router.post('/orders/:orderId/refund-request', verifyUser, requireCompletedProfile, requestRefund);

router.post('/orders/:orderId/return-request', verifyUser, requireCompletedProfile, requestReturn);

router.delete('/wishlist/:productId', verifyUser, requireCompletedProfile, removeFromWishlist);

router.post('/products/:productId/ratings', verifyUser, requireCompletedProfile, requireRole(['buyer']), ratingController.createProductRating);

router.patch('/ratings/:ratingId', verifyUser, requireCompletedProfile, requireRole(['buyer']), ratingController.updateProductRating);

router.delete('/ratings/:ratingId', verifyUser, requireCompletedProfile, requireRole(['buyer']), ratingController.deleteOwnProductRating);

router.get('/products/:productId/ratings', requireCompletedProfile, ratingController.getProductRatings);

router.get('/products/:productId/ratings/summary', requireCompletedProfile, ratingController.getProductRatingSummary);

router.post('/products/:productId/reviews', verifyUser, requireCompletedProfile, requireRole(['buyer']), reviewController.createReview);

router.patch('/reviews/:reviewId', verifyUser, requireCompletedProfile, requireRole(['buyer']), reviewController.updateOwnReview);

router.delete('/reviews/:reviewId', verifyUser, requireCompletedProfile, requireRole(['buyer']), reviewController.deleteOwnReview);

router.get('/products/:productId/reviews', requireCompletedProfile, requireRole(['buyer']), reviewController.getProductReviews);


module.exports  = router;