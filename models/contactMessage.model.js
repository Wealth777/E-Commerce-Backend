const mongoose = require('mongoose');

const contactMessage = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            trim: true
        },
        subject: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        image: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ["unread", "read", "resolved"],
            default: "unread",
        },

        readAt: {
            type: Date,
        },

        resolvedAt: {
            type: Date,
        },

        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Founder",
        },
    },
    { timestamps: true, }
)

module.exports = mongoose.model('ContactMessage', contactMessage)