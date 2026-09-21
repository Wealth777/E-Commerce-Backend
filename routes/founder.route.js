const express = require("express");

const { loginUser, getUsersDetails, googleLogin } = require("../controllers/Founder/auth.controller");

const { getAllBuyersController, getBuyerByIdController, lockBuyerController, unlockBuyerController, banBuyerController, deleteBuyerController, } = require("../controllers/Founder/buyer.controller");

const { getAllVendorController, getVendorByIdController, lockVendorController, unlockVendorController, banVendorController, deleteVendorController, } = require("../controllers/Founder/vendor.controller");

const { verifyUser, loginLimiter, apiLimiter, } = require("../middleware/verifyUser");

const { founderOnly } = require("../middleware/founderAccess");

const router = express.Router();

router.use(apiLimiter);


router.post("/auth/login", loginLimiter, loginUser);

router.post("/auth/google", loginLimiter, googleLogin);

router.get( "/get/me", verifyUser, founderOnly, getUsersDetails );

router.get( "/profile/me", verifyUser, founderOnly, getUsersDetails );

router.get( "/buyers", verifyUser, founderOnly, getAllBuyersController );

router.get( "/buyers/:buyerId", verifyUser, founderOnly, getBuyerByIdController );

router.patch( "/buyers/:buyerId/lock", verifyUser, founderOnly, lockBuyerController );

router.patch( "/buyers/:buyerId/unlock", verifyUser, founderOnly, unlockBuyerController );

router.patch( "/buyers/:buyerId/ban", verifyUser, founderOnly, banBuyerController );

router.delete( "/buyers/:buyerId", verifyUser, founderOnly, deleteBuyerController );





router.get( "/vendors", verifyUser, founderOnly, getAllVendorController );

router.get( "/vendors/:vendorId", verifyUser, founderOnly, getVendorByIdController );

router.patch( "/vendors/:vendorId/lock", verifyUser, founderOnly, lockVendorController );

router.patch( "/vendors/:vendorId/unlock", verifyUser, founderOnly, unlockVendorController );

router.patch( "/vendors/:vendorId/ban", verifyUser, founderOnly, banVendorController );

router.delete( "/vendors/:vendorId", verifyUser, founderOnly, deleteVendorController );


module.exports = router;