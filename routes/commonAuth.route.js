const express = require("express");
const {
    logoutUser,
    forgotPassword,
    verifyEmail,
    verifyChangedEmail,
    resetPassword,
    resendVerificationEmail,
    changePassword,
    changeEmail,
    suspendUserAccount,
    reactivateUserAccount,
    UserDeleteAccount,
    getLoginHistory,
    logoutAllDevices,
    getActiveSessions,
    updateNotificationPreference,
    updatePromotionalMessages
} = require("../controllers/common/auth.controller");
const { verifyUser } = require("../middleware/verifyUser");

const router = express.Router();

router.post("/logout", verifyUser, logoutUser);

router.get("/verify-email", verifyEmail);

router.get("/verify-changed-email", verifyChangedEmail);

router.post("/resend-verification", resendVerificationEmail);

router.post("/forget-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.put("/settings/change-password", verifyUser, changePassword);

router.put("/settings/change-email", verifyUser, changeEmail);

router.post("/settings/profile/suspend/me", verifyUser, suspendUserAccount);

router.post("/settings/profile/reactivate/me", verifyUser, reactivateUserAccount);

router.post("/settings/profile/delete/me", verifyUser, UserDeleteAccount);

router.get("/settings/login-history", verifyUser, getLoginHistory);

router.get("/settings/active-sessions", verifyUser, getActiveSessions);

router.post("/settings/login-all-devices", verifyUser, logoutAllDevices);

router.put("/settings/notification-preference", verifyUser, updateNotificationPreference);

router.put("/settings/promotional-messages", verifyUser, updatePromotionalMessages);

module.exports = router;