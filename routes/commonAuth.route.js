const express = require('express');
const { forgotPassword, verifyEmail, resetPassword, resendVerificationEmail } = require('../controllers/common/auth.controller');
const router = express.Router();

router.get("/verify-email", verifyEmail);

router.post("/resend-verification", resendVerificationEmail);

router.post("/forget-password", forgotPassword);

router.post("/reset-password", resetPassword);

module.exports = router;