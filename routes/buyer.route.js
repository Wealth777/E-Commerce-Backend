const express = require('express');
const { createUser, loginUser, getUsersDetails, updateBuyerProfile, addToCart, getCart, updateCartItem, removeFromCart, createBuyerOrder, logoutUser, getBuyerOrders, getSingleBuyerOrder, getBuyerActivities, getWishlist, addToWishlist, removeFromWishlist, clearWishlist, buyerConfirmDelivery, buyerCancelOrder, requestRefund, requestReturn } = require('../controllers/buyer.controller');
const verifyUser = require('../middleware/verifyUser');
const imageUpload = require('../middleware/imageUpload');
const router = express.Router();

router.post('/auth/register', createUser);

router.post('/auth/login', loginUser);

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

router.get("/orders", verifyUser, getBuyerOrders);

router.get("/orders/:orderId", verifyUser, getSingleBuyerOrder);

router.post('/orders/action/confirmdelivered', verifyUser, buyerConfirmDelivery);

router.post('/orders/action/cancelorder', verifyUser, buyerCancelOrder);

// Refund and Return Request routes
router.post('/orders/:orderId/refund-request', verifyUser, requestRefund);

router.post('/orders/:orderId/return-request', verifyUser, requestReturn);

router.get('/wishlist', verifyUser, getWishlist);

router.post('/wishlist', verifyUser, addToWishlist);

router.delete('/wishlist/:productId', verifyUser, removeFromWishlist);

router.delete('/wishlist', verifyUser, clearWishlist);

router.get('/activity', verifyUser, getBuyerActivities);

module.exports  = router;