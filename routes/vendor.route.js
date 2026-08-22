const express = require('express');
const router = express.Router();

const imageUpload = require('../middleware/imageUpload');
const vendorOnboardingUpload = require('../middleware/imageUpload');
const { verifyUser, requireRole, loginLimiter, apiLimiter, requireVerifiedEmail, requireCompletedOnboarding } = require('../middleware/verifyUser');

const { createUser, loginUser, getUsersDetails, updateVendorProfile, getVendorDetails, completeOnboarding } = require('../controllers/Vendor/auth.controller');
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

/* -------------------------------------------------------------------------- */
/*                               PUBLIC ROUTES                                */
/* -------------------------------------------------------------------------- */

router.post("/auth/register", validateRegister, createUser);

router.post("/auth/login", loginLimiter, loginUser);

router.get("/product/all", getAllProducts);

router.get("/categories", getCategories);

/* -------------------------------------------------------------------------- */
/*                          AUTHENTICATED ROUTES                              */
/* -------------------------------------------------------------------------- */

router.get("/profile/me", verifyUser, getUsersDetails);

router.put(
    "/profile/me",
    verifyUser,
    imageUpload.fields([
        { name: "student.profilePhoto", maxCount: 1 },
        { name: "business.logo", maxCount: 1 },
        { name: "business.banner", maxCount: 1 },
    ]),
    updateVendorProfile
);

/* -------------------------------------------------------------------------- */
/*                         VERIFIED ACCOUNT ROUTES                            */
/* -------------------------------------------------------------------------- */

router.post(
    "/profile/onboarding",
    verifyUser,
    requireVerifiedEmail,
    vendorOnboardingUpload.fields([
        { name: "profilePhoto", maxCount: 1 },
        { name: "businessLogo", maxCount: 1 },
        { name: "schoolIdCard", maxCount: 1 },
        { name: "nationalId", maxCount: 1 },
    ]),
    completeOnboarding
);

/* -------------------------------------------------------------------------- */
/*                        ACTIVE VENDOR ROUTES                                */
/* -------------------------------------------------------------------------- */

router.post(
    "/product/add",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    imageUpload.single("image"),
    addProduct
);

router.get(
    "/product/me",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    getVendorProducts
);

router.post(
    "/categories",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    createVendorCategory
);

router.post(
    "/payout",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    saveVendorPayout
);

router.get(
    "/orders",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    getVendorOrders
);

router.post(
    "/orders/action/confirmpayment",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    vendorConfirmPayment
);

router.post(
    "/orders/action/confirmorder",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    vendorConfirmOrder
);

router.post(
    "/orders/action/confirmshipped",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    vendorShipOrder
);

router.get(
    "/orders/refund-requests",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    getRefundRequests
);

router.get(
    "/orders/return-requests",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    getReturnRequests
);

router.get(
    "/analytics",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    asyncHandler(getVendorAnalytics)
);

router.get(
    "/analytics/export/pdf",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    asyncHandler(exportVendorAnalyticsPDF)
);

router.get(
    "/ratings/products",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    ratingController.getVendorProductRatings
);

router.get(
    "/reviews/me",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    reviewController.getVendorReviews
);

router.post(
    "/reports",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    reportController.createReport
);

router.get(
    "/reports/me",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    reportController.getMyReports
);

router.get(
    "/activity",
    verifyUser,
    requireRole(["vendor"]),
    getUsersActivities
);

/* -------------------------------------------------------------------------- */
/*                        ALL VENDOR DYNAMIC ROUTES                           */
/* -------------------------------------------------------------------------- */

router.get("/product/:productId", getProductDetails);

router.get("/vendor/details/:id", getVendorDetails);

router.get(
    "/vendor/products/:vendorId/category/:category",
    getVendorProductsByCategory
);

router.get(
    "/reviews/vendor/:vendorId",
    reviewController.getVendorReviews
);

router.put(
    "/product/:id",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    imageUpload.single("image"),
    updateProduct
);

router.delete(
    "/product/:id",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    deleteProduct
);

router.get(
    "/orders/:orderId",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    getSingleVendorOrder
);

router.patch(
    "/orders/:orderId/refund-request/review",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    reviewRefundRequest
);

router.patch(
    "/orders/:orderId/return-request/review",
    verifyUser,
    requireRole(["vendor"]),
    requireVerifiedEmail,
    requireCompletedOnboarding,
    reviewReturnRequest
);

module.exports = router;