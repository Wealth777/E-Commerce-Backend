const express = require('express');
const router = express.Router();

const imageUpload = require('../middleware/imageUpload');
const vendorOnboardingUpload = require('../middleware/imageUpload');
const { verifyUser, requireRole, loginLimiter, apiLimiter } = require('../middleware/verifyUser');

const { createUser, loginUser, logoutUser, getUsersDetails, updateVendorProfile, getVendorDetails, completeOnboarding, VendorDeleteAccount } = require('../controllers/Vendor/auth.controller');
const { addProduct, getVendorProducts, getAllProducts, getProductDetails, updateProduct, deleteProduct, getVendorProductsByCategory } = require('../controllers/Vendor/product.controller');
const { saveVendorPayout } = require('../controllers/Vendor/payout.controller');
const { getVendorOrders, vendorConfirmPayment, vendorConfirmOrder, vendorShipOrder, getRefundRequests, getReturnRequests, getSingleVendorOrder, reviewRefundRequest, reviewReturnRequest } = require('../controllers/Vendor/order.controller');
const { getVendorAnalytics, exportVendorAnalyticsPDF } = require('../controllers/Vendor/analytics.controller');
const { getUsersActivities } = require('../controllers/auditlog.controller');
const asyncHandler = require('../utils/asyncHandler');
const { validateRegister } = require('../middleware/validateRegister');
const ratingController = require('../controllers/common/rating.controller');
const reviewController = require('../controllers/common/review.controller');
const reportController = require('../controllers/common/report.controller');

const { createVendorCategory, getCategories, rejectCategory, approveCategory } = require('../controllers/Vendor/category.controller');

router.use(apiLimiter);

router.post('/auth/register', validateRegister, createUser);

router.post('/auth/login', loginLimiter, loginUser);

router.post('/profile/onboarding', verifyUser, vendorOnboardingUpload.fields([{ name: "profilePhoto", maxCount: 1 }, { name: "businessLogo", maxCount: 1 }, { name: "schoolIdCard", maxCount: 1 }, { name: "nationalId", maxCount: 1 }]), completeOnboarding);

router.post('/auth/logout', verifyUser, logoutUser);

router.delete("/profile", verifyUser, VendorDeleteAccount);

router.get('/profile/me', verifyUser, getUsersDetails);

router.put('/profile/me', verifyUser, imageUpload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
]), updateVendorProfile);

router.put('/profile/me/change-password', verifyUser, updateVendorProfile);

router.post('/product/add', verifyUser, requireRole(['vendor']), imageUpload.single('image'), addProduct)

router.get('/product/me', verifyUser, getVendorProducts);

router.get('/product/all', getAllProducts);

router.get("/categories", getCategories);

router.post("/categories", verifyUser, requireRole(['vendor']), createVendorCategory);

router.post('/payout', verifyUser, saveVendorPayout);

router.get('/orders', verifyUser, getVendorOrders)

router.post('/orders/action/confirmpayment', verifyUser, vendorConfirmPayment);

router.post('/orders/action/confirmorder', verifyUser, vendorConfirmOrder);

router.post('/orders/action/confirmshipped', verifyUser, vendorShipOrder);

router.get('/orders/refund-requests', verifyUser, getRefundRequests);

router.get('/orders/return-requests', verifyUser, getReturnRequests);

router.get('/analytics', verifyUser, requireRole(['vendor']), asyncHandler(getVendorAnalytics));

router.get("/analytics/export/pdf", verifyUser, asyncHandler(exportVendorAnalyticsPDF));

router.get('/activity', verifyUser, getUsersActivities);

router.get('/ratings/products', verifyUser, requireRole(['vendor']), ratingController.getVendorProductRatings);

router.get('/reviews/me', verifyUser, requireRole(['vendor']), reviewController.getVendorReviews);

router.post('/reports', verifyUser, reportController.createReport);

router.get('/reports/me', verifyUser, reportController.getMyReports);

// Dynamic routes
router.get("/product/:productId", getProductDetails);

router.get('/vendor/details/:id', getVendorDetails)

router.put('/product/:id', verifyUser, imageUpload.single("image"), updateProduct
);

router.delete('/product/:id', verifyUser, deleteProduct);

router.get('/vendor/products/:vendorId/category/:category', getVendorProductsByCategory)

router.patch("/categories/:categoryId/approve", verifyUser, requireRole(['founder']), approveCategory);

router.patch("/categories/:categoryId/reject", verifyUser, requireRole(['founder']), rejectCategory);

router.get('/orders/:orderId', verifyUser, getSingleVendorOrder);

router.patch('/orders/:orderId/refund-request/review', verifyUser, reviewRefundRequest);

router.patch('/orders/:orderId/return-request/review', verifyUser, reviewReturnRequest);

router.get('/reviews/vendor/:vendorId', reviewController.getVendorReviews);

module.exports  = router;