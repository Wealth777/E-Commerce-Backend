const express = require('express');
const { createUser, loginUser, getUsersDetails } = require('../controllers/Founder/auth.controller');
const dashboardController = require('../controllers/Founder/dashboard.controller');
const usersController = require('../controllers/Founder/users.controller');
const vendorController = require('../controllers/Founder/vendor.controller');
const buyerController = require('../controllers/Founder/buyer.controller');
const { verifyUser, loginLimiter, apiLimiter } = require('../middleware/verifyUser');
const { founderOnly, founderOrAdmin } = require('../middleware/founderAccess');
const reviewController = require('../controllers/common/review.controller');
const reportController = require('../controllers/common/report.controller');
const loginHistoryService = require('../services/loginHistory.service');
const { sendSuccess, sendError } = require('../utils/responseStruture');
const {
  mongoIdParam,
  listQueryValidator,
  reasonBodyValidator,
  rejectVendorValidator,
} = require('../validators/founder.validator');

const router = express.Router();

router.use(apiLimiter);

router.post('/auth/register', createUser);

router.post('/auth/login', loginLimiter, loginUser);

router.get('/get/me', verifyUser, founderOnly, getUsersDetails);

router.get('/profile/me', verifyUser, founderOnly, getUsersDetails);

router.get('/dashboard/overview', verifyUser, founderOnly, dashboardController.getDashboardOverview);

router.get('/login-history', verifyUser, founderOnly, async (req, res) => {
  try { return sendSuccess(res, 200, 'Login history fetched successfully', await loginHistoryService.listLoginHistory(req.query)); }
  catch (error) { return sendError(res, error.statusCode || 500, error.message || 'Failed to fetch login history'); }
});

router.get('/reviews', verifyUser, founderOrAdmin, listQueryValidator, reviewController.founderGetAllReviews);

router.get('/reports', verifyUser, founderOrAdmin, listQueryValidator, reportController.founderGetAllReports);

router.get('/users', verifyUser, founderOrAdmin, listQueryValidator, usersController.getUsers);

router.get('/vendors', verifyUser, founderOrAdmin, listQueryValidator, vendorController.getVendors);

router.get('/vendors/pending', verifyUser, founderOrAdmin, listQueryValidator, vendorController.getPendingVendors);

router.get('/vendors/approved', verifyUser, founderOrAdmin, listQueryValidator, vendorController.getApprovedVendors);

router.get('/vendors/rejected', verifyUser, founderOrAdmin, listQueryValidator, vendorController.getRejectedVendors);

router.get('/buyers', verifyUser, founderOrAdmin, listQueryValidator, buyerController.getBuyers);

// Dynamic Route
router.patch('/reviews/:reviewId/hide', verifyUser, founderOrAdmin, reviewController.founderHideReview);

router.patch('/reviews/:reviewId/restore', verifyUser, founderOrAdmin, reviewController.founderRestoreReview);

router.delete('/reviews/:reviewId', verifyUser, founderOnly, reviewController.founderDeleteReview);

router.get('/reports/:reportId', verifyUser, founderOrAdmin, reportController.founderGetReportDetails);

router.patch('/reports/:reportId/status', verifyUser, founderOrAdmin, reportController.founderUpdateReportStatus);

router.get('/users/:userId/reports', verifyUser, founderOrAdmin, reportController.founderGetReportsByUser);

router.get('/vendors/:vendorId/reports', verifyUser, founderOrAdmin, reportController.
founderGetReportsByVendor);

router.get('/buyers/:buyerId/reports', verifyUser, founderOrAdmin, reportController.founderGetReportsByBuyer);

router.get('/users/:userId', verifyUser, founderOrAdmin, mongoIdParam('userId'), usersController.getUserDetails);

router.patch('/users/:userId/suspend', verifyUser, founderOrAdmin, mongoIdParam('userId'), reasonBodyValidator, usersController.suspendUser);

router.patch('/users/:userId/activate', verifyUser, founderOrAdmin, mongoIdParam('userId'), reasonBodyValidator, usersController.activateUser);

router.delete('/users/:userId', verifyUser, founderOnly, mongoIdParam('userId'), reasonBodyValidator, usersController.softDeleteUser);

router.get('/vendors/:vendorId', verifyUser, founderOrAdmin, mongoIdParam('vendorId'), vendorController.getVendorDetails);

router.get('/vendors/:vendorId/products/active', verifyUser, founderOrAdmin, mongoIdParam('vendorId'), listQueryValidator, vendorController.getVendorActiveProducts);

router.patch('/vendors/:vendorId/approve', verifyUser, founderOrAdmin, mongoIdParam('vendorId'), reasonBodyValidator, vendorController.approveVendor);

router.patch('/vendors/:vendorId/reject', verifyUser, founderOrAdmin, mongoIdParam('vendorId'), rejectVendorValidator, vendorController.rejectVendor);

router.patch('/vendors/:vendorId/suspend', verifyUser, founderOrAdmin, mongoIdParam('vendorId'), reasonBodyValidator, vendorController.suspendVendor);

router.patch('/vendors/:vendorId/activate', verifyUser, founderOrAdmin, mongoIdParam('vendorId'), reasonBodyValidator, vendorController.activateVendor);

router.get('/buyers/:buyerId', verifyUser, founderOrAdmin, mongoIdParam('buyerId'), buyerController.getBuyerDetails);

router.patch('/buyers/:buyerId/ban', verifyUser, founderOrAdmin, mongoIdParam('buyerId'), reasonBodyValidator, buyerController.banBuyer);

router.patch('/buyers/:buyerId/unban', verifyUser, founderOrAdmin, mongoIdParam('buyerId'), reasonBodyValidator, buyerController.unbanBuyer);

module.exports = router;