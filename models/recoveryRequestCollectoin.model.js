const mongoose = require("mongoose");
const { softDeletePlugin } = require("./base.schema");

const RecoveryRequest = new mongoose.Schema(
    {
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
            index: true,
        },

        recoveryStatus: {
            type: String,
            enum: [
                "submitted",
                "under_review",
                "approved",
                "rejected",
                "cancelled",
            ],
            default: "submitted",
            index: true,
        },

        originalAccount: {
            fullName: String,
            email: String,

            student: {
                gender: String,
                institution: mongoose.Schema.Types.ObjectId,
                matricNumber: String,
                faculty: String,
                department: String,
                level: String,
            },

            business: {
                storeName: String,
                type: String,
            },

            verificationDocuments: {
                schoolIdCard: String,
                nationalId: String,
            },
        },

        submittedData: {
            fullName: {
                type: String,
                required: true,
                trim: true,
            },
            email: {
                type: String,
                required: true,
                lowercase: true,
                trim: true,
            },

            student: {
                profilePhoto: {
                    type: String,
                    trim: true,
                },
                gender: {
                    type: String,
                    enum: [
                        "male",
                        "female"
                    ],
                    trim: true
                },
                institution: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "School",
                    trim: true
                },
                state: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "School",
                    trim: true,
                },
                matricNumber: {
                    type: String,
                    trim: true,
                },
                faculty: {
                    type: String,
                    trim: true,
                },
                department: {
                    type: String,
                    trim: true,
                },
                level: {
                    type: String,
                    trim: true,
                },
                residence: {
                    type: String,
                    enum: [
                        "hostel",
                        "off-campus"
                    ]
                },
                address: {
                    type: String,
                    trim: true
                }
            },

            business: {
                storeName: {
                    type: String,
                    trim: true,
                    index: true,
                },
                type: {
                    type: String,
                    enum: [
                        "freelancer",
                        "reseller",
                        "service-provider"
                    ]
                },
                description: {
                    type: String,
                    trim: true,
                    minlength: 20,
                    maxlength: 2000,
                },
                logo: {
                    type: String,
                    trim: true,
                },
                banner: {
                    type: String,
                    trim: true,
                },
                socials: {
                    facebook: String,
                    instagram: String,
                    whatsapp: String,
                    tiktok: String,
                }
            },

            verificationDocuments: {
                schoolIdCard: {
                    type: String,
                },
                nationalId: {
                    type: String,
                }
            },
        },


        recoveryReason: {
            type: String,
            default: "Unauthorized email change",
        },

        reviewNotes: {
            type: String,
            trim: true,
            maxlength: 5000,
        },

        review: {
            reviewedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Founder",
            },

            reviewedAt: Date,

            decision: {
                type: String,
                enum: [
                    "approved",
                    "rejected",
                ],
            },

            rejectionReason: String,
        },

        requestMetadata: {
            ipAddress: String,

            device: String,

            location: String,

            userAgent: String,
        },

        founderActions: [
            {
                action: String,
                performedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Founder",
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                note: String,
            },
        ],

        expiresAt: {
            type: Date,
            default: () =>
                new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
        },

        caseNumber: {
            type: String,
            unique: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

RecoveryRequest.plugin(softDeletePlugin);

module.exports = mongoose.model("RecoveryRequestCollection", RecoveryRequest);