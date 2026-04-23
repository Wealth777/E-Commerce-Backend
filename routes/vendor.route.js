const express = require('express');
const { createUser, loginUser, getUsersDetails, addProduct, getVendorProducts, getAllProducts, updateProduct, deleteProduct, updateVendorProfile, saveVendorPayout, getVendorActivities, getVendorAnalytics, logoutUser, getVendorOrders, getSingleVendorOrder, vendorConfirmPayment, vendorConfirmOrder, vendorShipOrder } = require('../controllers/vendor.controller');
const imageUpload = require('../middleware/imageUpload');
const verifyUser = require('../middleware/verifyUser');
const router = express.Router();

router.post('/auth/register', createUser);

router.post('/auth/login', loginUser);

router.post('/auth/logout', verifyUser, logoutUser);

router.get('/profile/me', verifyUser, getUsersDetails);

router.put('/profile/me', verifyUser, imageUpload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
]), updateVendorProfile);

router.put('/profile/me/change-password', verifyUser, updateVendorProfile);

router.post('/product/add', verifyUser, imageUpload.single("image"), addProduct)

router.get('/product/me', verifyUser, getVendorProducts);

router.get('/product/all', getAllProducts);

router.put('/product/:id', verifyUser, imageUpload.single("image"), updateProduct
);

router.delete('/product/:id', verifyUser, deleteProduct);

router.post('/payout', verifyUser, saveVendorPayout);

router.get('/orders', verifyUser, getVendorOrders)

router.get('/orders/:orderId', verifyUser, getSingleVendorOrder);

router.post('/orders/action/confirmpayment', verifyUser, vendorConfirmPayment);

router.post('/orders/action/confirmorder', verifyUser, vendorConfirmOrder);

router.post('/orders/action/confirmshipped', verifyUser, vendorShipOrder);

router.post('/analytics', verifyUser, getVendorAnalytics);

router.get('/activity', verifyUser, getVendorActivities);


module.exports  = router;