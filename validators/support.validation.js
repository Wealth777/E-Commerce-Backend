const { body, param, query } = require('express-validator');

const {
    TICKET_TYPES,
    TICKET_STATUS,
    TICKET_PRIORITY,
    TICKET_CATEGORY_MAP
} = require('../constants/support.constants');

const ticketIdValidator = [
    param('ticketId')
        .isMongoId()
        .withMessage('Invalid ticket id.')
];

const validateCategory = query('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required.')
    .custom((value, { req }) => {

        const categories = TICKET_CATEGORY_MAP[req.body.ticketType];

        if (!categories) {
            throw new Error('Invalid ticket type.');
        }

        if (!categories.includes(value)) {
            throw new Error(
                'Selected category does not belong to the specified ticket type.'
            );
        }

        return true;

    });

const validateCustomCategory = query('customCategory')
    .optional()
    .trim()
    .custom((value, { req }) => {

        if (req.body.category !== 'other') {
            return true;
        }

        if (!value || value.trim().length < 3) {
            throw new Error(
                'Custom category is required when category is "other".'
            );
        }

        return true;

    });

const createTicketValidation = [

    query('ticketType')
        .trim()
        .notEmpty()
        .withMessage('Ticket type is required.')
        .isIn(Object.values(TICKET_TYPES))
        .withMessage('Invalid ticket type.'),

    validateCategory,

    validateCustomCategory,

    query('subject')
        .trim()
        .notEmpty()
        .withMessage('Subject is required.')
        .isLength({
            min: 5,
            max: 150
        })
        .withMessage(
            'Subject must be between 5 and 150 characters.'
        ),

    query('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required.')
        .isLength({
            min: 20,
            max: 5000
        })
        .withMessage(
            'Description must be between 20 and 5000 characters.'
        ),

    query('priority')
        .optional()
        .trim()
        .isIn(Object.values(TICKET_PRIORITY))
        .withMessage('Invalid priority.'),

    query('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array.'),

    query('tags.*')
        .optional()
        .trim()
        .isLength({
            min: 2,
            max: 30
        })
        .withMessage(
            'Each tag must be between 2 and 30 characters.'
        )
];

const updateTicketValidation = [

    ...ticketIdValidator,

    query('subject')
        .optional()
        .trim()
        .isLength({
            min: 5,
            max: 150
        })
        .withMessage(
            'Subject must be between 5 and 150 characters.'
        ),

    query('description')
        .optional()
        .trim()
        .isLength({
            min: 20,
            max: 5000
        })
        .withMessage(
            'Description must be between 20 and 5000 characters.'
        ),

    query('priority')
        .optional()
        .trim()
        .isIn(Object.values(TICKET_PRIORITY))
        .withMessage('Invalid priority.'),

    query('status')
        .optional()
        .trim()
        .isIn(Object.values(TICKET_STATUS))
        .withMessage('Invalid ticket status.'),

    query('category')
        .optional()
        .custom((value, { req }) => {

            if (!req.body.ticketType) {
                return true;
            }

            const categories =
                TICKET_CATEGORY_MAP[req.body.ticketType];

            if (
                categories &&
                !categories.includes(value)
            ) {
                throw new Error(
                    'Selected category does not belong to the specified ticket type.'
                );
            }

            return true;

        }),

    validateCustomCategory,

    query('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array.'),

    query('tags.*')
        .optional()
        .trim()
        .isLength({
            min: 2,
            max: 30
        })
        .withMessage(
            'Each tag must be between 2 and 30 characters.'
        )
];

const replyValidation = [

    ...ticketIdValidator,

    query('message')
        .optional()
        .trim()
        .isLength({
            min: 1,
            max: 5000
        })
        .withMessage(
            'Reply must be between 1 and 5000 characters.'
        ),

    query('isInternal')
        .optional()
        .isBoolean()
        .withMessage('isInternal must be a boolean.'),

    query().custom((value, { req }) => {

        const hasMessage =
            req.body.message &&
            req.body.message.trim().length > 0;

        const hasFiles =
            req.files &&
            req.files.length > 0;

        if (!hasMessage && !hasFiles) {
            throw new Error(
                'Reply must contain a message or at least one attachment.'
            );
        }

        return true;

    })
];

const ticketQueryValidation = [

    query('status')
        .optional()
        .trim()
        .isIn(Object.values(TICKET_STATUS))
        .withMessage('Invalid status.'),

    query('ticketType')
        .optional()
        .trim()
        .isIn(Object.values(TICKET_TYPES))
        .withMessage('Invalid ticket type.'),

    query('priority')
        .optional()
        .trim()
        .isIn(Object.values(TICKET_PRIORITY))
        .withMessage('Invalid priority.')
];

const ticketStatusValidation = [

    ...ticketIdValidator,

    query('status')
        .trim()
        .notEmpty()
        .withMessage('Status is required.')
        .isIn(Object.values(TICKET_STATUS))
        .withMessage('Invalid ticket status.')
];

const assignTicketValidation = [

    ...ticketIdValidator,

    query('assignedTo')
        .trim()
        .notEmpty()
        .withMessage('Assigned user is required.')
        .isMongoId()
        .withMessage('Invalid assigned user id.')
];

const internalNoteValidation = [

    ...ticketIdValidator,

    query('note')
        .trim()
        .notEmpty()
        .withMessage('Note is required.')
        .isLength({
            min: 2,
            max: 3000
        })
        .withMessage(
            'Note must be between 2 and 3000 characters.'
        )
];

const deleteTicketValidation = [
    ...ticketIdValidator
];

const restoreTicketValidation = [
    ...ticketIdValidator
];

module.exports = {
    ticketIdValidator,

    createTicketValidation,

    updateTicketValidation,

    replyValidation,

    ticketQueryValidation,

    ticketStatusValidation,

    assignTicketValidation,

    internalNoteValidation,

    deleteTicketValidation,

    restoreTicketValidation
};