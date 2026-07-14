const mongoose = require('mongoose');

const {
    USER_TYPES,
    TICKET_TYPES,
    TICKET_STATUS,
    TICKET_PRIORITY,
    TICKET_CATEGORY_MAP
} = require('../../constants/support.constants');

const { Schema } = mongoose;

const { softDeletePlugin } = require("../base.schema");

const AttachmentSchema = new Schema(
    {
        publicId: {
            type: String,
            trim: true
        },

        url: {
            type: String,
            required: true,
            trim: true
        },

        originalName: {
            type: String,
            required: true,
            trim: true
        },

        mimeType: {
            type: String,
            required: true,
            trim: true
        },

        extension: {
            type: String,
            trim: true
        },

        size: {
            type: Number,
            default: 0
        },

        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        _id: false
    }
);

const ActivitySchema = new Schema(
    {
        action: {
            type: String,
            required: true,
            trim: true
        },

        performedBy: {
            type: Schema.Types.ObjectId,
            refPath: 'activities.performedByModel',
            required: true
        },

        performedByModel: {
            type: String,
            enum: Object.values(USER_TYPES),
            required: true
        },

        message: {
            type: String,
            trim: true
        },

        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        _id: false
    }
);

const SupportTicketSchema = new Schema(
    {
        ticketNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'userType',
            index: true
        },

        userType: {
            type: String,
            enum: [
                USER_TYPES.BUYER,
                USER_TYPES.VENDOR
            ],
            required: true,
            index: true
        },

        ticketType: {
            type: String,
            enum: Object.values(TICKET_TYPES),
            required: true,
            index: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        customCategory: {
            type: String,
            trim: true,
            maxlength: 150
        },

        subject: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 150
        },

        description: {
            type: String,
            required: true,
            trim: true,
            minlength: 20,
            maxlength: 5000
        },

        priority: {
            type: String,
            enum: Object.values(TICKET_PRIORITY),
            default: TICKET_PRIORITY.MEDIUM,
            index: true
        },

        status: {
            type: String,
            enum: Object.values(TICKET_STATUS),
            default: TICKET_STATUS.OPEN,
            index: true
        },

        tags: [
            {
                type: String,
                trim: true,
                lowercase: true
            }
        ],

        attachments: {
            type: [AttachmentSchema],
            default: []
        },

        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'Founder',
            default: null,
            index: true
        },

        activities: {
            type: [ActivitySchema],
            default: []
        },

        /**
 * Total number of replies.
 * Updated automatically whenever a reply is added or removed.
 */
        // repliesCount: {
        //     type: Number,
        //     default: 0,
        //     min: 0
        // },

        /**
         * Last reply timestamp.
         */
        // lastReplyAt: {
        //     type: Date,
        //     default: Date.now,
        //     index: true
        // },

        resolvedAt: {
            type: Date,
            default: null
        },

        resolvedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Founder',
            default: null
        },

        closedAt: {
            type: Date,
            default: null
        },

        reopenedAt: {
            type: Date,
            default: null
        },

        slaDueAt: {
            type: Date,
            default: null,
            index: true
        },

        internalNotes: [
            {
                note: {
                    type: String,
                    trim: true,
                    maxlength: 3000
                },

                addedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Founder'
                },

                createdAt: {
                    type: Date,
                    default: Date.now
                },

                closedBy: {
                    type: Schema.Types.ObjectId,
                    ref: 'Founder',
                    default: null
                }
            }
        ],

        /**
         * Extra metadata.
         * Useful for logging request information,
         * browser, device, IP, etc.
         */
        metadata: {
            ipAddress: {
                type: String,
                trim: true
            },

            userAgent: {
                type: String,
                trim: true
            },

            platform: {
                type: String,
                trim: true
            },

            browser: {
                type: String,
                trim: true
            },

            appVersion: {
                type: String,
                trim: true
            }
        },
    },
    {
        timestamps: true,

        versionKey: false,

        toJSON: {
            virtuals: true
        },

        toObject: {
            virtuals: true
        }
    }
);

SupportTicketSchema.index({
    createdBy: 1,
    createdAt: -1
});

SupportTicketSchema.index({
    ticketType: 1,
    status: 1
});

SupportTicketSchema.index({
    status: 1,
    priority: -1
});

SupportTicketSchema.index({
    assignedTo: 1,
    status: 1
});

SupportTicketSchema.index({
    category: 1
});

SupportTicketSchema.index({
    repliesCount: -1
});

SupportTicketSchema.index({
    lastReplyAt: -1
});

SupportTicketSchema.index({
    createdAt: -1
});

SupportTicketSchema.index({
    subject: "text",
    description: "text"
});

SupportTicketSchema.path('category').validate(function (value) {

    const categories = TICKET_CATEGORY_MAP[this.ticketType];

    if (!categories) {
        return false;
    }

    return categories.includes(value);

}, 'Invalid category for selected ticket type.');

SupportTicketSchema.path('customCategory').validate(function (value) {

    if (this.category !== 'other') {
        return true;
    }

    return !!value && value.trim().length >= 3;

}, 'Custom category is required when category is "other".');

SupportTicketSchema.path('attachments').validate(function (attachments) {

    return attachments.length <= 5;

}, 'Maximum of 5 attachments allowed.');

SupportTicketSchema.virtual('isClosed').get(function () {
    return this.status === TICKET_STATUS.CLOSED;
});

SupportTicketSchema.virtual('isResolved').get(function () {
    return this.status === TICKET_STATUS.RESOLVED;
});

SupportTicketSchema.virtual('isActive').get(function () {
    return ![
        TICKET_STATUS.CLOSED,
        TICKET_STATUS.REJECTED
    ].includes(this.status);
});

SupportTicketSchema.virtual('isOverdue').get(function () {

    if (!this.slaDueAt) {
        return false;
    }

    return (
        this.status !== TICKET_STATUS.RESOLVED &&
        this.status !== TICKET_STATUS.CLOSED &&
        new Date() > this.slaDueAt
    );

});


// SupportTicketSchema.pre('find', excludeDeleted);
// SupportTicketSchema.pre('findOne', excludeDeleted);
// SupportTicketSchema.pre('findOneAndUpdate', excludeDeleted);
// SupportTicketSchema.pre('countDocuments', excludeDeleted);

SupportTicketSchema.pre('save', function (next) {

    if (!this.isModified('status')) {
        return next();
    }

    switch (this.status) {

        case TICKET_STATUS.RESOLVED:
            this.resolvedAt = new Date();
            break;

        case TICKET_STATUS.CLOSED:
            this.closedAt = new Date();
            break;

        case TICKET_STATUS.OPEN:

            if (!this.isNew) {
                this.reopenedAt = new Date();
            }

            break;

        default:
            break;
    }

    next();

});

SupportTicketSchema.methods.closeTicket = async function () {

    this.status = TICKET_STATUS.CLOSED;
    this.closedAt = new Date();

    return this.save();

};

SupportTicketSchema.methods.resolveTicket = async function () {

    this.status = TICKET_STATUS.RESOLVED;
    this.resolvedAt = new Date();

    return this.save();

};

SupportTicketSchema.methods.reopenTicket = async function () {

    this.status = TICKET_STATUS.OPEN;
    this.reopenedAt = new Date();

    return this.save();

};

SupportTicketSchema.methods.addActivity = function ({
    action,
    performedBy,
    performedByModel,
    message = ''
}) {

    this.activities.push({
        action,
        performedBy,
        performedByModel,
        message,
        createdAt: new Date()
    });

    return this;

};

SupportTicketSchema.statics.findByTicketNumber = function (ticketNumber) {

    return this.findOne({
        ticketNumber
    });

};

SupportTicketSchema.statics.findUserTickets = function (
    userId,
    userType
) {

    return this.find({
        createdBy: userId,
        userType
    });

};

SupportTicketSchema.statics.findActiveTickets = function () {

    return this.find({
        status: {
            $nin: [
                TICKET_STATUS.CLOSED,
                TICKET_STATUS.REJECTED
            ]
        }
    });

};

SupportTicketSchema.plugin(softDeletePlugin);

module.exports = mongoose.model(
    'SupportTicket',
    SupportTicketSchema
);