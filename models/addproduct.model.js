const mongoose = require('mongoose')
const { softDeletePlugin } = require('./base.schema')

const addProduct = new mongoose.Schema(
    {
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        image: {
            type: String,
            required: true
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
            index: true,
        },

        subCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            default: null,
            index: true,
        },
        status: {
            type: String,
            enum: ['in-stock', 'low-in-stock', 'out-of-stock'],
            default: 'in-stock'
        },
        price: {
            type: Number,
            required: true,
            min: 0
        },
        originalPrice: {
            type: Number,
            required: true,
            min: 0
        },
        stock: {
            type: Number,
            required: true,
            min: 0
        },
        sold: {
            type: Number,
            default: 0,
            min: 0
        },
        ratingSummary: {
            averageRating: { type: Number, default: 0, min: 0, max: 5 },
            totalRatings: { type: Number, default: 0, min: 0 },
            breakdown: {
                1: { type: Number, default: 0 },
                2: { type: Number, default: 0 },
                3: { type: Number, default: 0 },
                4: { type: Number, default: 0 },
                5: { type: Number, default: 0 }
            }
        },
    },
    {
        timestamps: true,
    }
)

addProduct.plugin(softDeletePlugin)

module.exports = mongoose.model('AddProduct', addProduct)