const express = require('express');
const router = express.Router();

const { verifyUser, requireRole, loginLimiter, apiLimiter } = require('../middleware/verifyUser');
const imageUpload = require('../middleware/imageUpload');

const { createUser, loginUser, logoutUser, getUsersDetails, updateBuyerProfile } = require('../controllers/Buyer/auth.controller');
const { addToCart, getCart, updateCartItem, removeFromCart } = require('../controllers/Buyer/cart.controller');
const { createBuyerOrder, getBuyerOrders, getSingleBuyerOrder, buyerConfirmDelivery, buyerCancelOrder, requestRefund, requestReturn } = require('../controllers/Buyer/order.controller');
const { getWishlist, addToWishlist, removeFromWishlist, clearWishlist } = require('../controllers/Buyer/wishlist.controller');
const { getUsersActivities } = require('../controllers/auditlog.controller');
const { validateRegister } = require('../middleware/validateRegister');

router.use(apiLimiter);

router.post('/auth/register', validateRegister, createUser);

router.post('/auth/login', loginLimiter, loginUser);

router.post('/auth/logout', verifyUser, logoutUser);

router.get('/profile/me', verifyUser, getUsersDetails);

router.put('/profile/me', verifyUser, imageUpload.fields([
    { name: 'profilePhoto', maxCount: 1 },
]), updateBuyerProfile);

router.post("/cart/add", verifyUser, addToCart);

router.get("/cart/", verifyUser, getCart);

router.put("/cart/update", verifyUser, updateCartItem);

router.delete("/cart/:productId", verifyUser, removeFromCart);

router.post("/checkout", verifyUser, imageUpload.paymentProofUpload.any(), createBuyerOrder);

router.get("/orders", verifyUser, requireRole(['buyer']), getBuyerOrders);

router.get("/orders/:orderId", verifyUser, getSingleBuyerOrder);

router.post('/orders/action/confirmdelivered', verifyUser, buyerConfirmDelivery);

router.post('/orders/action/cancelorder', verifyUser, buyerCancelOrder);

router.post('/orders/:orderId/refund-request', verifyUser, requestRefund);

router.post('/orders/:orderId/return-request', verifyUser, requestReturn);

router.get('/wishlist', verifyUser, getWishlist);

router.post('/wishlist', verifyUser, addToWishlist);

router.delete('/wishlist/:productId', verifyUser, removeFromWishlist);

router.delete('/wishlist', verifyUser, clearWishlist);

router.get('/activity', verifyUser, getUsersActivities);

module.exports  = router;