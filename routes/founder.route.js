const express = require("express");

const { loginUser, getUsersDetails, } = require("../controllers/Founder/auth.controller");

const { getAllBuyersController, getBuyerByIdController, lockBuyerController, unlockBuyerController, banBuyerController, deleteBuyerController, } = require("../controllers/Founder/buyer.controller");

const { verifyUser, loginLimiter, apiLimiter, } = require("../middleware/verifyUser");

const { founderOnly } = require("../middleware/founderAccess");

const router = express.Router();

router.use(apiLimiter);


router.post("/auth/login", loginLimiter, loginUser);

router.get( "/get/me", verifyUser, founderOnly, getUsersDetails );

router.get( "/profile/me", verifyUser, founderOnly, getUsersDetails );

router.get( "/buyers", verifyUser, founderOnly, getAllBuyersController );

router.get( "/buyers/:buyerId", verifyUser, founderOnly, getBuyerByIdController );

router.patch( "/buyers/:buyerId/lock", verifyUser, founderOnly, lockBuyerController );

router.patch( "/buyers/:buyerId/unlock", verifyUser, founderOnly, unlockBuyerController );

router.patch( "/buyers/:buyerId/ban", verifyUser, founderOnly, banBuyerController );

router.delete( "/buyers/:buyerId", verifyUser, founderOnly, deleteBuyerController );


module.exports = router;