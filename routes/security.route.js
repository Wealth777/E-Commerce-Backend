const express = require("express");
const { reportSecurityRecovery, recoverAccount } = require("../controllers/common/securityRecovery.controller");
const router = express.Router();

router.post('/unauthorized-email-change', reportSecurityRecovery);

router.post('/recover-account', recoverAccount);

module.exports = router;