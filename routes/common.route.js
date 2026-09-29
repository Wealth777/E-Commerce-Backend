const express = require("express");

const router = express.Router()

const { apiLimiter, } = require("../middleware/verifyUser");

router.use(apiLimiter);

const { searchMarketplaceController } = require('../controllers/common/search.controller')

router.get('/search', searchMarketplaceController)

module.exports = router;