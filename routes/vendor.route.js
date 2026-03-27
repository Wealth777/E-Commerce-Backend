const express = require('express');
const { createUser, loginUser, getUsersDetails, addProduct, getVendorProducts, getAllProducts, updateProduct, deleteProduct } = require('../controllers/vendor.controller');
const imageUpload = require('../middleware/imageUpload');
const verifyUser = require('../middleware/verifyUser');
const router = express.Router();

router.post('/auth/register', createUser);

router.post('/auth/login', loginUser);

router.get('/profile/me', verifyUser, getUsersDetails);

router.post('/product/add', verifyUser, imageUpload.single("image"), addProduct)

router.get('/product/vendor', verifyUser, getVendorProducts);

router.get('/product/all', getAllProducts);

router.put('/product/:id', verifyUser, imageUpload.single("image"), updateProduct
);

router.delete('/product/:id', verifyUser, deleteProduct);


module.exports  = router;