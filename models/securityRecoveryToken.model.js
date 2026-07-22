const mongoose = require("mongoose");

const securityRecoveryTokenSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: "userModel",
            index: true,
        },

        userModel: {
            type: String,
            required: true,
            enum: ["Vendor", "Buyer", "Founder"],
        },

        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        metadata: {
            oldEmail: {
                type: String,
                trim: true,
                lowercase: true,
            },

            newEmail: {
                type: String,
                trim: true,
                lowercase: true,
            },

            browser: {
                type: String,
                default: "Unknown",
            },

            os: {
                type: String,
                default: "Unknown",
            },

            device: {
                type: String,
                default: "Unknown",
            },

            location: {
                type: String,
                default: "Unknown",
            },

            ipAddress: {
                type: String,
                default: null,
            },
        },

        used: {
            type: Boolean,
            default: false,
            index: true,
        },

        usedAt: {
            type: Date,
            default: null,
        },

        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

securityRecoveryTokenSchema.index(
    { expiresAt: 1 },
    {
        expireAfterSeconds: 0,
    }
);


securityRecoveryTokenSchema.methods.toJSON = function () {
    const obj = this.toObject();

    delete obj.__v;

    return obj;
};

module.exports = mongoose.model(
    "SecurityRecoveryToken",
    securityRecoveryTokenSchema
);