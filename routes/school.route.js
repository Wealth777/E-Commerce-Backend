const express = require('express');
const router = express.Router();

const { getSchools, getStatesBySchool, getLocationsByState } = require('../controllers/school.controller');

router.get('/', getSchools);

router.get('/:schoolId/states', getStatesBySchool);

router.get('/states/:stateId/locations', getLocationsByState)

module.exports = router;