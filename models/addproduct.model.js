const mongoose = require('mongoose')

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
            type: String, 
            required: true
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
        originalPrice:{
            type: Number, 
            required: true,
            min: 0
        },
        stock: {
            type: Number,
            required: true,
            min: 0
        },
    },
    {
        timestamps: true,
    }
)

module.exports = mongoose.model('AddProduct', addProduct)