// const router = require('express').Router();

// const { getHomepageAdvertisements, trackAdvertisementImpression, trackAdvertisementClick, getAdvertisements, createAdvertisement, syncAdvertisementStatuses, getAdvertisementById, updateAdvertisement, deleteAdvertisement, submitAdvertisement, publishAdvertisement, approveAdvertisement, rejectAdvertisement, pauseAdvertisement, resumeAdvertisement } = require('../controllers/Founder/adverts.controller');

// const { advertisementUpload, } = require('../middleware/imageUpload');

// const { verifyUser, requireRole, apiLimiter } = require('../middleware/verifyUser');

// router.use(apiLimiter);
// router.use(verifyUser);

// router.get('/homepage', getHomepageAdvertisements);

// router.post('/:id/impression', trackAdvertisementImpression);

// router.post('/:id/click', trackAdvertisementClick);


// router.get('/', requireRole(['founder', 'vendor']), getAdvertisements);

// router.post('/', requireRole(['founder', 'vendor']), advertisementUpload.fields([
//     { name: 'desktop', maxCount: 1 },
//     { name: 'mobile', maxCount: 1 },
// ]), createAdvertisement);

// router.post('/sync-statuses', requireRole(['founder']), syncAdvertisementStatuses);

// router.get('/:id', requireRole(['founder', 'vendor']), getAdvertisementById);

// router.patch('/:id', requireRole(['founder', 'vendor']), advertisementUpload.fields([
//     { name: 'desktop', maxCount: 1 },
//     { name: 'mobile', maxCount: 1 },
// ]), updateAdvertisement);

// router.delete('/:id', requireRole(['founder', 'vendor']), deleteAdvertisement);

// router.patch('/:id/submit', requireRole(['founder', 'vendor']), submitAdvertisement);

// router.patch('/:id/publish', requireRole(['founder']), publishAdvertisement);

// router.patch('/:id/approve', requireRole(['founder']), approveAdvertisement);

// router.patch('/:id/reject', requireRole(['founder']), rejectAdvertisement);

// router.patch('/:id/pause', requireRole(['founder']), pauseAdvertisement);

// router.patch('/:id/resume', requireRole(['founder']), resumeAdvertisement);


// module.exports = router;


const router = require('express').Router();
const {
  getHomepageAdvertisements, trackAdvertisementImpression, trackAdvertisementClick,
  getAdvertisements, createAdvertisement, syncAdvertisementStatuses,
  getAdvertisementById, updateAdvertisement, deleteAdvertisement,
  submitAdvertisement, publishAdvertisement, approveAdvertisement,
  rejectAdvertisement, pauseAdvertisement, resumeAdvertisement,
} = require('../controllers/Founder/adverts.controller');
const { advertisementUpload } = require('../middleware/imageUpload');
const { verifyUser, requireRole, apiLimiter } = require('../middleware/verifyUser');

const uploadBanners = advertisementUpload.fields([
  { name: 'desktop', maxCount: 1 },
  { name: 'mobile', maxCount: 1 },
]);

router.use(apiLimiter);
// Public banner reads and tracking should be accessible to homepage visitors.
router.get('/homepage', getHomepageAdvertisements);
router.post('/:id/impression', trackAdvertisementImpression);
router.post('/:id/click', trackAdvertisementClick);

router.use(verifyUser);
router.get('/', requireRole(['founder', 'vendor']), getAdvertisements);
router.post('/', requireRole(['founder', 'vendor']), uploadBanners, createAdvertisement);
router.post('/sync-statuses', requireRole(['founder']), syncAdvertisementStatuses);
router.get('/:id', requireRole(['founder', 'vendor']), getAdvertisementById);
router.patch('/:id', requireRole(['founder', 'vendor']), uploadBanners, updateAdvertisement);
router.delete('/:id', requireRole(['founder', 'vendor']), deleteAdvertisement);
router.patch('/:id/submit', requireRole(['vendor']), submitAdvertisement);
router.patch('/:id/publish', requireRole(['founder']), publishAdvertisement);
router.patch('/:id/approve', requireRole(['founder']), approveAdvertisement);
router.patch('/:id/reject', requireRole(['founder']), rejectAdvertisement);
router.patch('/:id/pause', requireRole(['founder']), pauseAdvertisement);
router.patch('/:id/resume', requireRole(['founder']), resumeAdvertisement);
module.exports = router;
