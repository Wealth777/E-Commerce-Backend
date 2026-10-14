const advertisementService = require('../../services/founder/adverts.service');
const { sendSuccess, sendError } = require('../../utils/responseStruture');
const logger = require('../../logger');



const getErrorStatus = (error) => {
    return error.statusCode || 500;
};


const handleError = (res, error) => {
    const statusCode = getErrorStatus(error);

    if (statusCode >= 500) {
        logger.error(error);
    }

    return sendError(
        res,
        statusCode,
        statusCode >= 500
            ? 'Something went wrong while processing the advertisement.'
            : error.message
    );
};




const buildAdvertisementPayload = (req) => {
    const body = req.body || {};
    const payload = { ...body };

    // Convert displayOrder to a valid number.
    if (payload.displayOrder !== undefined) {
        const value = Number(payload.displayOrder);

        if (!Number.isSafeInteger(value) || value < 0) {
            const error = new Error(
                'Display order must be a non-negative integer.'
            );

            error.statusCode = 400;
            throw error;
        }

        payload.displayOrder = value;
    }

    // Handle both nested and flat CTA fields.
    const ctaLabel =
        body['cta.label'] ?? body.cta?.label;

    const ctaUrl =
        body['cta.url'] ?? body.cta?.url;

    if (
        ctaLabel !== undefined ||
        ctaUrl !== undefined
    ) {
        payload.cta = {};

        if (ctaLabel !== undefined) {
            payload.cta.label = ctaLabel;
        }

        if (ctaUrl !== undefined) {
            payload.cta.url = ctaUrl;
        }
    }

    // Handle uploaded images and existing URLs.
    const desktop = req.files?.desktop?.[0];
    const mobile = req.files?.mobile?.[0];

    const desktopUrl =
        body['images.desktop'] ??
        body.images?.desktop;

    const mobileUrl =
        body['images.mobile'] ??
        body.images?.mobile;

    const images = {};

    if (desktop) {
        images.desktop = desktop.path;
    } else if (desktopUrl !== undefined) {
        images.desktop = desktopUrl;
    }

    if (mobile) {
        images.mobile = mobile.path;
    } else if (mobileUrl !== undefined) {
        images.mobile = mobileUrl;
    }

    if (Object.keys(images).length > 0) {
        payload.images = images;
    }

    // Remove flattened multipart fields.
    delete payload['cta.label'];
    delete payload['cta.url'];
    delete payload['images.desktop'];
    delete payload['images.mobile'];

    return payload;
};


exports.createAdvertisement = async (req, res) => {
    try {
        const payload = buildAdvertisementPayload(req);

        const advertisement =
            await advertisementService.createAdvertisement(
                payload,
                req.user
            );

        return sendSuccess(
            res,
            201,
            'Advertisement created successfully.',
            advertisement
        );
    } catch (error) {
        return handleError(res, error);
    }
};



exports.updateAdvertisement = async (req, res) => {
    try {
        const payload = buildAdvertisementPayload(req);

        const advertisement =
            await advertisementService.updateAdvertisement(
                req.params.id,
                payload,
                req.user
            );

        return sendSuccess(
            res,
            200,
            'Advertisement updated successfully.',
            advertisement
        );
    } catch (error) {
        return handleError(res, error);
    }
};


exports.submitAdvertisement = async (req, res) => {
    try {
        const advertisement =
            await advertisementService.submitAdvertisement(
                req.params.id,
                req.user
            );

        return sendSuccess(
            res,
            200,
            'Advertisement submitted for review successfully.',
            advertisement
        );
    } catch (error) {
        return handleError(res, error);
    }
};

exports.publishAdvertisement = async (req, res) => {
    try {
        const advertisement =
            await advertisementService.publishAdvertisement(
                req.params.id,
                req.user
            );

        return sendSuccess(
            res,
            200,
            'Advertisement published successfully.',
            advertisement
        );
    } catch (error) {
        return handleError(res, error);
    }
};


exports.approveAdvertisement = async (req, res) => {
    try {
        const advertisement =
            await advertisementService.approveAdvertisement(
                req.params.id,
                req.user
            );

        return sendSuccess(
            res,
            200,
            'Advertisement approved successfully.',
            advertisement
        );
    } catch (error) {
        return handleError(res, error);
    }
};



exports.rejectAdvertisement = async (req, res) => {
    try {
        const advertisement =
            await advertisementService.rejectAdvertisement(
                req.params.id,
                req.user,
                req.body.reason
            );

        return sendSuccess(
            res,
            200,
            'Advertisement rejected successfully.',
            advertisement
        );
    } catch (error) {
        return handleError(res, error);
    }
};


exports.pauseAdvertisement = async (req, res) => {
    try {
        const advertisement =
            await advertisementService.pauseAdvertisement(
                req.params.id,
                req.user
            );

        return sendSuccess(
            res,
            200,
            'Advertisement paused successfully.',
            advertisement
        );
    } catch (error) {
        return handleError(res, error);
    }
};



exports.resumeAdvertisement = async (req, res) => {
    try {
        const advertisement =
            await advertisementService.resumeAdvertisement(
                req.params.id,
                req.user
            );

        return sendSuccess(
            res,
            200,
            'Advertisement resumed successfully.',
            advertisement
        );
    } catch (error) {
        return handleError(res, error);
    }
};


exports.deleteAdvertisement = async (req, res) => {
    try {
        const result =
            await advertisementService.deleteAdvertisement(
                req.params.id,
                req.user
            );

        return sendSuccess(
            res,
            200,
            'Advertisement deleted successfully.',
            result
        );
    } catch (error) {
        return handleError(res, error);
    }
};



exports.getAdvertisementById = async (req, res) => {
    try {
        const advertisement =
            await advertisementService.getAdvertisementById(
                req.params.id,
                req.user
            );

        return sendSuccess(
            res,
            200,
            'Advertisement retrieved successfully.',
            advertisement
        );
    } catch (error) {
        return handleError(res, error);
    }
};



exports.getAdvertisements = async (req, res) => {
    try {
        const {
            page,
            limit,
            status,
            placement,
            advertiserType,
            createdBy,
            advertiser,
        } = req.query;

        const result =
            await advertisementService.getAdvertisements(
                {
                    page,
                    limit,
                    status,
                    placement,
                    advertiserType,
                    createdBy,
                    advertiser,
                },
                req.user
            );

        return sendSuccess(
            res,
            200,
            'Advertisements retrieved successfully.',
            result
        );
    } catch (error) {
        return handleError(res, error);
    }
};



exports.getHomepageAdvertisements = async (req, res) => {
    try {
        const { placement, limit } = req.query;

        const advertisements =
            await advertisementService.getHomepageAdvertisements({
                placement: placement || 'homepage_hero',
                limit,
            });

        return sendSuccess(
            res,
            200,
            'Homepage advertisements retrieved successfully.',
            advertisements
        );
    } catch (error) {
        return handleError(res, error);
    }
};



exports.trackAdvertisementImpression = async (req, res) => {
    try {
        const result =
            await advertisementService.trackAdvertisementImpression(
                req.params.id
            );

        return sendSuccess(
            res,
            200,
            'Advertisement impression recorded successfully.',
            result
        );
    } catch (error) {
        return handleError(res, error);
    }
};


exports.trackAdvertisementClick = async (req, res) => {
    try {
        const result =
            await advertisementService.trackAdvertisementClick(
                req.params.id
            );

        return sendSuccess(
            res,
            200,
            'Advertisement click recorded successfully.',
            result
        );
    } catch (error) {
        return handleError(res, error);
    }
};


exports.syncAdvertisementStatuses = async (req, res) => {
    try {
        const result =
            await advertisementService.syncAdvertisementStatuses(
                req.user
            );

        return sendSuccess(
            res,
            200,
            'Advertisement statuses synchronized successfully.',
            result
        );
    } catch (error) {
        return handleError(res, error);
    }
};