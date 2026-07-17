const mongoose = require("mongoose");

const verificationTokenSchema = new mongoose.Schema(
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
            enum: ["Vendor", "Buyer"],
        },

        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
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

/*
Automatically remove expired documents.
MongoDB TTL monitor usually runs every 60 seconds.
*/

verificationTokenSchema.index(
    { expiresAt: 1 },
    {
        expireAfterSeconds: 0,
    }
);

module.exports = mongoose.model(
    "VerificationToken",
    verificationTokenSchema
);