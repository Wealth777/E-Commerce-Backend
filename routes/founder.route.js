const express = require('express');
const { createUser, loginUser, getUsersDetails } = require('../controllers/founder.controller');
const router = express.Router();

router.post('/auth/register', createUser);

router.post('/auth/login', loginUser);

router.get('/get/me', getUsersDetails);

module.exports  = router;