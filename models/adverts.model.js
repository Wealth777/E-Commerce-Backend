
const mongoose = require('mongoose')

const { softDeletePlugin } = require('./base.schema')

const advertisementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },

        headline: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 300,
            default: '',
        },

        badgeText: {
            type: String,
            trim: true,
            maxlength: 40,
            default: '',
        },

        images: {
            desktop: {
                type: String,
                required: true,
                trim: true,
            },

            mobile: {
                type: String,
                trim: true,
                default: '',
            },
        },

        cta: {
            label: {
                type: String,
                trim: true,
                maxlength: 30,
                default: 'Shop Now',
            },

            url: {
                type: String,
                required: true,
                trim: true,
            },
        },

        advertiserType: {
            type: String,
            enum: ['platform', 'vendor'],
            default: 'platform',
            required: true,
        },

        advertiser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vendor',
            default: null,
            index: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'createdByModel',
            required: true,
            index: true,
        },

        createdByModel: { type: String, enum: ['Founder', 'Vendor'], required: true, default: 'Founder' },

        placement: {
            type: String,
            enum: [
                'homepage_hero',
                'homepage_secondary',
                'product_listing',
                'store',
            ],
            default: 'homepage_hero',
            required: true,
            index: true,
        },

        displayOrder: {
            type: Number,
            default: 0,
            min: 0,
        },

        status: {
            type: String,
            enum: [
                'draft',
                'pending',
                'approved',
                'rejected',
                'active',
                'paused',
                'expired',
            ],
            default: 'draft',
            required: true,
            index: true,
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Founder',
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: null,
        },

        rejectionReason: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },

        revision: { type: Number, default: 0, min: 0 },

        impressions: {
            type: Number,
            default: 0,
            min: 0,
        },

        clicks: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
)

advertisementSchema.plugin(softDeletePlugin)

advertisementSchema.index({
    placement: 1,
    status: 1,
    startDate: 1,
    endDate: 1,
    displayOrder: 1,
})

advertisementSchema.index({
    createdBy: 1,
    createdAt: -1,
})

module.exports = mongoose.model('Advertisement', advertisementSchema)