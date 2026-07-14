const mongoose = require('mongoose');

const { USER_TYPES } = require('../../constants/support.constants');

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

const SupportReplySchema = new Schema(
    {
        ticket: {
            type: Schema.Types.ObjectId,
            ref: 'SupportTicket',
            required: true,
            index: true
        },

        author: {
            type: Schema.Types.ObjectId,
            required: true,
            refPath: 'authorModel',
            index: true
        },

        authorModel: {
            type: String,
            enum: [
                USER_TYPES.BUYER,
                USER_TYPES.VENDOR,
                USER_TYPES.FOUNDER
            ],
            required: true,
            index: true
        },

        message: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 5000
        },

        attachments: {
            type: [AttachmentSchema],
            default: []
        },

        isInternal: {
            type: Boolean,
            default: false,
            index: true
        },

        isEdited: {
            type: Boolean,
            default: false
        },

        editedAt: {
            type: Date,
            default: null
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

SupportReplySchema.index({
    ticket: 1,
    createdAt: 1
});

SupportReplySchema.index({
    author: 1,
    createdAt: -1
});

SupportReplySchema.index({
    ticket: 1,
    isInternal: 1
});

SupportReplySchema.index({
    createdAt: -1
});

SupportReplySchema.index({
    message: 'text'
});

SupportReplySchema.path('attachments').validate(function (attachments) {

    return attachments.length <= 5;

}, 'Maximum of 5 attachments allowed.');

SupportReplySchema.pre('validate', function (next) {

    const hasMessage =
        this.message &&
        this.message.trim().length > 0;

    const hasAttachments =
        this.attachments &&
        this.attachments.length > 0;

    if (!hasMessage && !hasAttachments) {
        return next(
            new Error(
                'Reply must contain a message or at least one attachment.'
            )
        );
    }

    next();

});

SupportReplySchema.virtual('isFounderReply').get(function () {
    return this.authorModel === USER_TYPES.FOUNDER;
});

SupportReplySchema.virtual('hasAttachments').get(function () {
    return this.attachments.length > 0;
});

SupportReplySchema.pre('save', function (next) {

    if (!this.isModified('message')) {
        return next();
    }

    if (!this.isNew) {
        this.isEdited = true;
        this.editedAt = new Date();
    }

    next();

});

SupportReplySchema.methods.markAsEdited = async function (message) {

    this.message = message;
    this.isEdited = true;
    this.editedAt = new Date();

    return this.save();

};

SupportReplySchema.statics.findTicketReplies = function (
    ticketId,
    includeInternal = false
) {

    const query = {
        ticket: ticketId
    };

    if (!includeInternal) {
        query.isInternal = false;
    }

    return this.find(query)
        .populate('author', 'fullName profilePhoto')
        .sort({ createdAt: 1 });

};

SupportReplySchema.statics.findReply = function (replyId) {

    return this.findById(replyId)
        .populate('author', 'fullName profilePhoto');

};

SupportReplySchema.statics.countTicketReplies = function (ticketId) {

    return this.countDocuments({
        ticket: ticketId
    });

};

SupportReplySchema.plugin(softDeletePlugin);

module.exports = mongoose.model(
    'SupportReply',
    SupportReplySchema
);