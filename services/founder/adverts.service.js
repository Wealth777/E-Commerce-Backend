const mongoose = require('mongoose');
const Advertisement = require('../../models/adverts.model');
const Vendor = require('../../models/vendor.model');
const AppError = require('../common/AppError');
const { publishAdvertisementChange } = require('../../sockets/advertisement.socket');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const PLACEMENTS = ['homepage_hero', 'homepage_secondary', 'product_listing', 'store'];
const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'active', 'paused', 'expired'];
const EDITABLE_FIELDS = [
    'title', 'headline', 'description', 'badgeText', 'images', 'cta',
    'advertiserType', 'advertiser', 'placement', 'displayOrder', 'startDate', 'endDate',
];

const validateId = (id, label = 'ID') => {
    if (!mongoose.isValidObjectId(id)) {
        throw new AppError(`Invalid ${label}.`, 400);
    }
};

const assertRole = (actor, roles = ['founder', 'vendor']) => {
    if (!actor || !roles.includes(actor.role) || !mongoose.isValidObjectId(actor._id)) {
        throw new AppError('Permission denied.', 403);
    }
};

const assertOwnerOrFounder = (advertisement, actor) => {
    assertRole(actor);
    if (actor.role === 'founder') return;
    if (advertisement.createdByModel !== 'Vendor' ||
        String(advertisement.createdBy) !== String(actor._id)) {
        throw new AppError('You do not own this advertisement.', 403);
    }
};

const getAdvertisementOrFail = async (id) => {
    validateId(id, 'advertisement ID');
    const advertisement = await Advertisement.findById(id);
    if (!advertisement) throw new AppError('Advertisement not found.', 404);
    return advertisement;
};

const pickAllowedFields = (data = {}) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new AppError('Invalid advertisement data.', 400);
    }
    const filtered = {};
    for (const field of EDITABLE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(data, field)) filtered[field] = data[field];
    }
    return filtered;
};

const validateVendorAdvertiser = async (vendorId) => {
    validateId(vendorId, 'vendor ID');
    const vendor = await Vendor.findOne({
        _id: vendorId,
        verificationStatus: 'approved',
        isDeleted: { $ne: true },
    }).select('_id');
    if (!vendor) throw new AppError('Vendor does not exist or is not approved.', 400);
};

const validateAdvertisementData = async (data) => {
    if (typeof data.title !== 'string' || !data.title.trim() ||
        typeof data.headline !== 'string' || !data.headline.trim()) {
        throw new AppError('Title and headline are required.', 400);
    }
    if (!data.images || typeof data.images.desktop !== 'string' || !data.images.desktop.trim()) {
        throw new AppError('Desktop banner image is required.', 400);
    }
    for (const image of [data.images.desktop, data.images.mobile]) {
        if (image != null && image !== '' &&
            (typeof image !== 'string' || !/^https:\/\/[^\s]+$/i.test(image))) {
            throw new AppError('Banner images must use HTTPS URLs.', 400);
        }
    }

    if (!PLACEMENTS.includes(data.placement || 'homepage_hero')) {
        throw new AppError('Invalid advertisement placement.', 400);
    }
    if (!Number.isInteger(data.displayOrder ?? 0) || (data.displayOrder ?? 0) < 0) {
        throw new AppError('Display order must be a non-negative integer.', 400);
    }
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate >= endDate) {
        throw new AppError('Invalid campaign date range.', 400);
    }
    const type = data.advertiserType || 'platform';
    if (!['platform', 'vendor'].includes(type)) throw new AppError('Invalid advertiser type.', 400);
    if (type === 'vendor') {
        await validateVendorAdvertiser(data.advertiser);
    } else if (data.advertiser) {
        throw new AppError('Platform advertisements must not specify a vendor.', 400);
    }
};


const notifyAdvertisementChange = (placement, action) => {
    try {
        publishAdvertisementChange({ placement, action });
    } catch (error) {
        console.error('[advertisements] Socket publication failed:', error);
    }
};

const notifyPlacements = (placements, action) => {
    for (const placement of new Set(placements)) notifyAdvertisementChange(placement, action);
};

const publicFilter = (placement, now = new Date()) => ({
    placement,
    status: { $in: ['approved', 'active'] },
    startDate: { $lte: now },
    endDate: { $gt: now },
});


// exports.createAdvertisement = async (data, actor) => {
//     assertRole(actor);

//     const {
//         action = 'draft',
//         ...advertisementData
//     } = data || {};

//     const allowedActions =
//         actor.role === 'founder'
//             ? ['draft', 'publish']
//             : ['draft', 'submit'];

//     if (!allowedActions.includes(action)) {
//         throw new AppError(
//             'You are not permitted to perform this advertisement action.',
//             403
//         );
//     }

//     const payload = pickAllowedFields(advertisementData);

//     if (actor.role === 'vendor') {
//         payload.advertiserType = 'vendor';
//         payload.advertiser = actor._id;
//     }

//     await validateAdvertisementData(payload);

//     const now = new Date();
//     const startDate = new Date(payload.startDate);
//     const endDate = new Date(payload.endDate);

//     if (action !== 'draft' && endDate <= now) {
//         throw new AppError(
//             'Campaign end date must be in the future.',
//             400
//         );
//     }

//     let status = 'draft';

//     if (action === 'submit') {
//         status = 'pending';
//     }

//     if (action === 'publish') {
//         status = startDate <= now ? 'active' : 'approved';
//     }

//     const advertisement = await Advertisement.create({
//         ...payload,
//         createdBy: actor._id,
//         createdByModel:
//             actor.role === 'founder' ? 'Founder' : 'Vendor',
//         status,
//         reviewedBy:
//             action === 'publish' ? actor._id : null,
//         reviewedAt:
//             action === 'publish' ? now : null,
//         rejectionReason: null,
//     });

//     if (action === 'publish') {
//         notifyAdvertisementChange(
//             advertisement.placement,
//             'published'
//         );
//     }

//     return advertisement;
// };


exports.createAdvertisement = async (data, actor) => {
    assertRole(actor);

    const {
        action = 'draft',
        ...advertisementData
    } = data || {};

    const allowedActions =
        actor.role === 'founder'
            ? ['draft', 'publish']
            : ['draft', 'submit'];

    if (!allowedActions.includes(action)) {
        throw new AppError('You are not permitted to perform this action.', 403);
    }

    const payload = pickAllowedFields(advertisementData);

    if (actor.role === 'vendor') {
        payload.advertiserType = 'vendor';
        payload.advertiser = actor._id;
    }

    await validateAdvertisementData(payload);

    const now = new Date();
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);

    if (action !== 'draft' && endDate <= now) {
        throw new AppError('Campaign end date must be in the future.', 400);
    }

    let status = 'draft';

    if (action === 'submit') {
        status = 'pending';
    }

    if (action === 'publish') {
        status = startDate <= now ? 'active' : 'approved';
    }

    const advertisement = await Advertisement.create({
        ...payload,
        createdBy: actor._id,
        createdByModel:
            actor.role === 'founder' ? 'Founder' : 'Vendor',
        status,
        reviewedBy:
            action === 'publish' ? actor._id : null,
        reviewedAt:
            action === 'publish' ? now : null,
        rejectionReason: null,
    });

    if (action === 'publish') {
        notifyAdvertisementChange(
            advertisement.placement,
            'published'
        );
    }

    return advertisement;
};


exports.updateAdvertisement = async (id, data, actor) => {
    const advertisement = await getAdvertisementOrFail(id);
    assertOwnerOrFounder(advertisement, actor);
    if (!['draft', 'pending', 'rejected', 'paused', 'expired'].includes(advertisement.status)) {
        throw new AppError('Pause the live advertisement before editing.', 409);
    }
    const patch = pickAllowedFields(data);
    if (!Object.keys(patch).length) throw new AppError('No editable fields supplied.', 400);
    const current = advertisement.toObject();
    const mergedData = {
        ...current,
        ...patch,
        images: { ...current.images, ...(patch.images || {}) },
        cta: { ...current.cta, ...(patch.cta || {}) },
    };
    if (actor.role === 'vendor') {
        mergedData.advertiserType = 'vendor';
        mergedData.advertiser = actor._id;
    }
    await validateAdvertisementData(mergedData);
    const oldPlacement = advertisement.placement;
    const wasVisible = ['approved', 'active'].includes(advertisement.status);
    advertisement.set({
        ...patch,
        images: mergedData.images,
        cta: mergedData.cta,
        advertiserType: mergedData.advertiserType,
        advertiser: mergedData.advertiser,
    });
    advertisement.status = 'draft';
    advertisement.reviewedBy = null;
    advertisement.reviewedAt = null;
    advertisement.rejectionReason = null;
    advertisement.revision = (advertisement.revision || 0) + 1;
    await advertisement.save();
    if (wasVisible) notifyPlacements([oldPlacement, advertisement.placement], 'updated');
    return advertisement;
};

exports.submitAdvertisement = async (id, actor) => {
    const advertisement = await getAdvertisementOrFail(id);
    assertOwnerOrFounder(advertisement, actor);
    if (!['draft', 'rejected'].includes(advertisement.status)) {
        throw new AppError('Only draft or rejected advertisements may be submitted.', 409);
    }
    await validateAdvertisementData(advertisement.toObject());
    if (advertisement.endDate <= new Date()) {
        throw new AppError('Campaign end date must be in the future.', 400);
    }
    advertisement.status = 'pending';
    advertisement.reviewedBy = null;
    advertisement.reviewedAt = null;
    advertisement.rejectionReason = null;
    await advertisement.save();
    return advertisement;
};

exports.publishAdvertisement = async (id, actor) => {
    assertRole(actor, ['founder']);

    const advertisement = await getAdvertisementOrFail(id);

    if (advertisement.status !== 'draft') {
        throw new AppError(
            'Only draft advertisements may be published directly.',
            409
        );
    }

    await validateAdvertisementData(advertisement.toObject());

    const now = new Date();

    if (advertisement.endDate <= now) {
        throw new AppError(
            'Campaign end date must be in the future.',
            400
        );
    }

    advertisement.status =
        advertisement.startDate <= now ? 'active' : 'approved';

    advertisement.reviewedBy = actor._id;
    advertisement.reviewedAt = now;
    advertisement.rejectionReason = null;

    await advertisement.save();

    notifyAdvertisementChange(
        advertisement.placement,
        'published'
    );

    return advertisement;
};


exports.approveAdvertisement = async (id, actor) => {
    assertRole(actor, ['founder']);
    const advertisement = await getAdvertisementOrFail(id);
    if (advertisement.status !== 'pending') throw new AppError('Only pending ads may be approved.', 409);
    if (advertisement.createdByModel === 'Founder' && String(advertisement.createdBy) === String(actor._id)) {
        throw new AppError('Self-approval is prohibited.', 403);
    }
    if (advertisement.endDate <= new Date()) throw new AppError('Campaign already expired.', 400);
    advertisement.status = 'approved';
    advertisement.reviewedBy = actor._id;
    advertisement.reviewedAt = new Date();
    advertisement.rejectionReason = null;
    await advertisement.save();
    notifyAdvertisementChange(advertisement.placement, 'approved');
    return advertisement;
};


exports.rejectAdvertisement = async (id, actor, reason) => {
    assertRole(actor, ['founder']);
    if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 1000) {
        throw new AppError('A rejection reason of at most 1000 characters is required.', 400);
    }
    const advertisement = await getAdvertisementOrFail(id);
    if (advertisement.status !== 'pending') throw new AppError('Only pending ads may be rejected.', 409);
    advertisement.status = 'rejected';
    advertisement.reviewedBy = actor._id;
    advertisement.reviewedAt = new Date();
    advertisement.rejectionReason = reason.trim();
    await advertisement.save();
    return advertisement;
};


exports.pauseAdvertisement = async (id, actor) => {
    const advertisement = await getAdvertisementOrFail(id);
    assertOwnerOrFounder(advertisement, actor);
    if (!['approved', 'active'].includes(advertisement.status)) {
        throw new AppError('Only approved or active ads may be paused.', 409);
    }
    advertisement.status = 'paused';
    await advertisement.save();
    notifyAdvertisementChange(advertisement.placement, 'paused');
    return advertisement;
};


exports.resumeAdvertisement = async (id, actor) => {
    const advertisement = await getAdvertisementOrFail(id);
    assertOwnerOrFounder(advertisement, actor);
    if (advertisement.status !== 'paused') throw new AppError('Only paused ads may be resumed.', 409);
    if (advertisement.endDate <= new Date()) throw new AppError('Campaign expired; edit and resubmit.', 409);
    if (!advertisement.reviewedAt || !advertisement.reviewedBy) {
        throw new AppError('Unreviewed advertisements cannot be resumed.', 409);
    }
    advertisement.status = 'approved';
    await advertisement.save();
    notifyAdvertisementChange(advertisement.placement, 'resumed');
    return advertisement;
};


exports.deleteAdvertisement = async (id, actor) => {
    const advertisement = await getAdvertisementOrFail(id);
    assertOwnerOrFounder(advertisement, actor);
    const wasVisible = ['approved', 'active'].includes(advertisement.status);
    await advertisement.softDelete(actor._id, actor.role === 'founder' ? 'Founder' : 'Vendor');
    if (wasVisible) notifyAdvertisementChange(advertisement.placement, 'deleted');
    return { id: advertisement.id, deleted: true };
};


exports.getAdvertisementById = async (id, actor) => {
    const advertisement = await getAdvertisementOrFail(id);
    assertOwnerOrFounder(advertisement, actor);
    return advertisement;
};


exports.getAdvertisements = async (query = {}, actor) => {
    assertRole(actor);
    const page = Math.max(DEFAULT_PAGE, Math.min(100000, Number.parseInt(query.page, 10) || DEFAULT_PAGE));
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number.parseInt(query.limit, 10) || DEFAULT_LIMIT));
    const filter = {};
    if (actor.role === 'vendor') {
        filter.createdBy = actor._id;
        filter.createdByModel = 'Vendor';
    }
    if (query.status) {
        if (!STATUSES.includes(query.status)) throw new AppError('Invalid advertisement status.', 400);
        filter.status = query.status;
    }
    if (query.placement) {
        if (!PLACEMENTS.includes(query.placement)) throw new AppError('Invalid placement.', 400);
        filter.placement = query.placement;
    }
    const [advertisements, total] = await Promise.all([
        Advertisement.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        Advertisement.countDocuments(filter),
    ]);
    return {
        advertisements,
        pagination: {
            page, limit, total, totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1,
        },
    };
};


exports.getHomepageAdvertisements = async ({ placement = 'homepage_hero', limit = 10 } = {}) => {
    if (!PLACEMENTS.includes(placement)) throw new AppError('Invalid advertisement placement.', 400);
    const safeLimit = Math.max(1, Math.min(30, Number.parseInt(limit, 10) || 10));
    return Advertisement.find(publicFilter(placement))
        .sort({ displayOrder: 1, createdAt: -1 })
        .limit(safeLimit)
        .select('headline description badgeText images cta placement displayOrder startDate endDate')
        .lean();
};


exports.syncAdvertisementStatuses = async (actor) => {
    if (actor) assertRole(actor, ['founder']);
    const now = new Date();
    const affected = await Advertisement.find({
        $or: [
            { status: { $in: ['approved', 'active'] }, endDate: { $lte: now } },
            { status: 'approved', startDate: { $lte: now }, endDate: { $gt: now } },
        ],
    }).select('_id placement status startDate endDate').lean();
    const [expired, activated] = await Promise.all([
        Advertisement.updateMany(
            { status: { $in: ['approved', 'active'] }, endDate: { $lte: now } },
            { $set: { status: 'expired' } }
        ),
        Advertisement.updateMany(
            { status: 'approved', startDate: { $lte: now }, endDate: { $gt: now } },
            { $set: { status: 'active' } }
        ),
    ]);
    if (expired.modifiedCount || activated.modifiedCount) {
        notifyPlacements(affected.map((ad) => ad.placement), 'schedule_changed');
    }
    return { expired: expired.modifiedCount, activated: activated.modifiedCount };
};


const trackAdvertisementInteraction = async (id, field) => {
    validateId(id, 'advertisement ID');
    const now = new Date();
    const advertisement = await Advertisement.findOneAndUpdate(
        {
            _id: id,
            status: { $in: ['approved', 'active'] },
            startDate: { $lte: now },
            endDate: { $gt: now },
        },
        { $inc: { [field]: 1 } },
        { returnDocument: 'after' }
    ).select('_id');
    if (!advertisement) throw new AppError('Advertisement unavailable.', 404);
    return { recorded: true };
};



exports.trackAdvertisementImpression = async (id) => {
    return trackAdvertisementInteraction(id, 'impressions');
};


exports.trackAdvertisementClick = async (id) => {
    return trackAdvertisementInteraction(id, 'clicks');
};
