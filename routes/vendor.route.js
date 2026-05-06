const express = require('express');
const { createUser, loginUser, getUsersDetails, addProduct, getVendorProducts, getAllProducts, updateProduct, deleteProduct, updateVendorProfile, saveVendorPayout, getVendorActivities, getVendorAnalytics, logoutUser, getVendorOrders, getSingleVendorOrder, vendorConfirmPayment, vendorConfirmOrder, vendorShipOrder, exportVendorAnalyticsPDF, getProductDetails, getVendorDetails, getVendorProductsByCategory, getRefundRequests, getReturnRequests, reviewRefundRequest, reviewReturnRequest } = require('../controllers/vendor.controller');
const imageUpload = require('../middleware/imageUpload');
const verifyUser = require('../middleware/verifyUser');
const router = express.Router();

router.post('/auth/register', createUser);

router.post('/auth/login', loginUser);

router.post('/auth/logout', verifyUser, logoutUser);

router.get('/profile/me', verifyUser, getUsersDetails);

router.put('/profile/me', verifyUser, imageUpload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
]), updateVendorProfile);

router.put('/profile/me/change-password', verifyUser, updateVendorProfile);

router.post('/product/add', verifyUser, imageUpload.single("image"), addProduct)

router.get('/product/me', verifyUser, getVendorProducts);

router.get('/product/all', getAllProducts);

router.post('/payout', verifyUser, saveVendorPayout);

router.get('/orders', verifyUser, getVendorOrders)

router.post('/orders/action/confirmpayment', verifyUser, vendorConfirmPayment);

router.post('/orders/action/confirmorder', verifyUser, vendorConfirmOrder);

router.post('/orders/action/confirmshipped', verifyUser, vendorShipOrder);

// Refund and Return Request routes
router.get('/orders/refund-requests', verifyUser, getRefundRequests);

router.get('/orders/return-requests', verifyUser, getReturnRequests);

router.get('/analytics', verifyUser, getVendorAnalytics);

router.get("/analytics/export/pdf", verifyUser, exportVendorAnalyticsPDF);

router.get('/activity', verifyUser, getVendorActivities);

// Dynamic routes
router.get("/product/:productId", getProductDetails);

router.get('/vendor/details/:id', getVendorDetails)

router.put('/product/:id', verifyUser, imageUpload.single("image"), updateProduct
);

router.delete('/product/:id', verifyUser, deleteProduct);

router.get('/vendor/products/:vendorId/category/:category', getVendorProductsByCategory)

router.get('/orders/:orderId', verifyUser, getSingleVendorOrder);

router.patch('/orders/:orderId/refund-request/review', verifyUser, reviewRefundRequest);

router.patch('/orders/:orderId/return-request/review', verifyUser, reviewReturnRequest);

module.exports  = router;