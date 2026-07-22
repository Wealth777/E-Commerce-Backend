const express = require("express");
const {
    forgotPassword,
    verifyEmail,
    verifyChangedEmail,
    resetPassword,
    resendVerificationEmail,
    changePassword,
    changeEmail,
} = require("../controllers/common/auth.controller");
const { verifyUser } = require("../middleware/verifyUser");

const router = express.Router();

router.get("/verify-email", verifyEmail);

router.get("/verify-changed-email", verifyChangedEmail);

router.post("/resend-verification", resendVerificationEmail);

router.post("/forget-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.put("/settings/change-password", verifyUser, changePassword);

router.put("/settings/change-email", verifyUser, changeEmail);

module.exports = router;