const express = require("express");

const router = express.Router()

const { apiLimiter, } = require("../middleware/verifyUser");
const { contactMessageUpload, } = require("../middleware/imageUpload");

router.use(apiLimiter);

const { searchMarketplaceController } = require('../controllers/common/search.controller')

const { createMessage } = require('../controllers/common/contactMessage.controller')

router.get('/search', searchMarketplaceController);

router.post('/contact', contactMessageUpload.single("image"), createMessage);

module.exports = router;