const mongoose = require("mongoose");
const SupportTicket = require("../../models/support/SupportTicket");
const SupportReply = require("../../models/support/SupportReply");
const generateTicketNumber = require("../../utils/support.ticketNumber");
const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess, sendError } = require("../../utils/responseStruture");
const {
    USER_TYPES,
    TICKET_STATUS,
    TICKET_PRIORITY,
    PAGINATION,
    SLA
} = require("../../constants/support.constants");
const { validationResult } = require("express-validator");
const SupportService = require('../../services/support/support.service')

/*PRIVATE HELPERS*/

const getAuthenticatedUser = (req) => {
    const user = req.user || {};

    return {
        id: user._id || user.id,
        userType: user.userType || user.role || user.accountType
    };
};

const isFounder = (userType) =>
    userType === USER_TYPES.FOUNDER;

const calculateSlaDueDate = (priority) => {
    const hours =
        SLA[priority?.toUpperCase()] ||
        SLA[TICKET_PRIORITY.MEDIUM.toUpperCase()];

    const dueDate = new Date();

    dueDate.setHours(dueDate.getHours() + hours);

    return dueDate;
};

const buildAttachmentPayload = (files = []) => {
    if (!Array.isArray(files) || !files.length) {
        return [];
    }

    return files.map(file => ({
        publicId:
            file.public_id ||
            file.publicId ||
            null,
        url:
            file.secure_url ||
            file.path ||
            file.url,
        originalName:
            file.originalname,
        mimeType:
            file.mimetype,
        extension:
            file.originalname?.split(".").pop(),
        size:
            file.size
    }));
};

const addTicketActivity = ({
    ticket,
    action,
    performedBy,
    performedByModel,
    message = ""
}) => {
    ticket.addActivity({ action, performedBy, performedByModel, message });
};

const validateRequest = (req, res) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) { return null }

    sendError(res, 422, "Validation failed.", errors.array());

    return true;
};

const ensureOwnership = (ticket, user) => {
    if (isFounder(user.userType)) {
        return true;
    }

    return (
        ticket.createdBy.toString() === user.id.toString() &&
        ticket.userType === user.userType
    );
};

const populateTicket = (query) => {
    return query
        .populate({
            path: "createdBy",
            select:
                "fullName firstName lastName email profilePhoto"
        })
        .populate({
            path: "assignedTo",
            select:
                "fullName email profilePhoto"
        })
        .populate({
            path: "resolvedBy",
            select:
                "fullName email"
        });
};

// Create Support Ticket
const createTicket = asyncHandler(async (req, res, next) => {
    try {
        const ticket = await SupportService.createTicket({
            user: req.user,
            body: req.body,
            files: req.files || [],
        });

        return sendSuccess(
            res,
            201,
            "Support ticket created successfully.",
            { ticket }
        );
    } catch (error) {
        next(error);
    }
});

// Get User Support Ticket
const getMyTickets = asyncHandler(async (req, res, next) => {
    try {
        const result = await SupportService.getMyTickets({
            user: req.user,
            query: req.query,
        });

        return sendSuccess(
            res,
            200,
            "Support tickets retrieved successfully.",
            result
        );
    } catch (error) {
        next(error);
    }
});

// Get single Support Ticket
const getSingleTicket = asyncHandler(async (req, res, next) => {
    try {
        const ticket = await SupportService.getTicketById({
            user: req.user,
            ticketId: req.params.ticketId,
        });

        return sendSuccess(
            res,
            200,
            "Support ticket retrieved successfully.",
            { ticket }
        );
    } catch (error) {
        next(error);
    }
});

// Update Support Ticket
const updateTicket = asyncHandler(async (req, res, next) => {
    if (validateRequest(req, res)) return;

    try {
        const ticket = await SupportService.updateTicket({
            user: req.user,
            ticketId: req.params.ticketId,
            body: req.body,
            files: req.files || [],
        });

        return sendSuccess(
            res,
            200,
            "Support ticket updated successfully.",
            { ticket }
        );
    } catch (error) {
        next(error);
    }
});

// Close Support Ticket
const closeTicket = asyncHandler(async (req, res, next) => {
    if (validateRequest(req, res)) return;

    try {
        const ticket = await SupportService.closeTicket({
            user: req.user,
            ticketId: req.params.ticketId,
        });

        return sendSuccess(
            res,
            200,
            "Support ticket closed successfully.",
            { ticket }
        );
    } catch (error) {
        next(error);
    }
});

// Reopen Support Ticket
const reopenTicket = asyncHandler(async (req, res, next) => {
    if (validateRequest(req, res)) return;

    try {
        const ticket = await SupportService.reopenTicket({
            user: req.user,
            ticketId: req.params.ticketId,
        });

        return sendSuccess(
            res,
            200,
            "Support ticket reopened successfully.",
            { ticket }
        );
    } catch (error) {
        next(error);
    }
});

// Delete Support Ticket
const deleteTicket = asyncHandler(async (req, res, next) => {
    if (validateRequest(req, res)) return;

    try {
        await SupportService.deleteTicket({
            user: req.user,
            ticketId: req.params.ticketId,
            reason: req.body.reason || null,
        });

        return sendSuccess(
            res,
            200,
            "Support ticket deleted successfully."
        );
    } catch (error) {
        next(error);
    }
});

// Restore Support Ticket
const restoreTicket = asyncHandler(async (req, res, next) => {
    if (validateRequest(req, res)) return;

    try {
        const ticket = await SupportService.restoreTicket({
            user: req.user,
            ticketId: req.params.ticketId,
        });

        return sendSuccess(
            res,
            200,
            "Support ticket restored successfully.",
            { ticket }
        );
    } catch (error) {
        next(error);
    }
});

// Reply Support Ticket
const replyToTicket = asyncHandler(async (req, res, next) => {
    if (validateRequest(req, res)) return;

    try {
        const reply = await SupportService.addReply({
            user: req.user,
            ticketId: req.params.ticketId,
            body: req.body,
            files: req.files || [],
        });

        return sendSuccess(
            res,
            201,
            "Reply added successfully.",
            { reply }
        );
    } catch (error) {
        next(error);
    }
});

// Get Reply To Support Ticket
const getReplies = asyncHandler(async (req, res, next) => {
    if (validateRequest(req, res)) return;

    try {
        const replies = await SupportService.getReplies({
            user: req.user,
            ticketId: req.params.ticketId,
        });

        return sendSuccess(
            res,
            200,
            "Replies retrieved successfully.",
            { replies }
        );
    } catch (error) {
        next(error);
    }
});

// Assign Support Ticket
const assignTicket = asyncHandler(async (req, res, next) => {
    if (validateRequest(req, res)) return;

    try {
        const ticket = await SupportService.assignTicket({
            user: req.user,
            ticketId: req.params.ticketId,
            founderId: req.body.assignedTo,
        });

        return sendSuccess(
            res,
            200,
            "Support ticket assigned successfully.",
            { ticket }
        );
    } catch (error) {
        next(error);
    }
});

// Resolve Support Ticket
const resolveTicket = asyncHandler(async (req, res, next) => {
    if (validateRequest(req, res)) return;

    try {
        const ticket = await SupportService.resolveTicket({
            user: req.user,
            ticketId: req.params.ticketId,
        });

        return sendSuccess(
            res,
            200,
            "Support ticket resolved successfully.",
            { ticket }
        );
    } catch (error) {
        next(error);
    }
});

// Update Support Ticket Status
const updateTicketStatus = asyncHandler(async (req, res) => {

    if (validateRequest(req, res)) { return; }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id, userType } = getAuthenticatedUser(req);
        if (!isFounder(userType)) {
            await session.abortTransaction();
            session.endSession();
            return sendError(res, 403, "Only founders can update ticket status.");
        }

        const ticket = await SupportTicket.findById(req.params.ticketId).session(session);

        if (!ticket) {
            await session.abortTransaction();
            session.endSession();
            return sendError(res, 404, "Support ticket not found.");
        }

        const { status } = req.body;

        if (ticket.status === status) {
            await session.abortTransaction();
            session.endSession();
            return sendError(res, 400, `Ticket is already ${status}.`);
        }

        ticket.status = status;

        if (status === TICKET_STATUS.RESOLVED) {
            ticket.resolvedAt = new Date();
            ticket.resolvedBy = id;
        }

        if (status === TICKET_STATUS.CLOSED) {
            ticket.closedAt = new Date();
        }

        if (status === TICKET_STATUS.OPEN) {
            ticket.reopenedAt = new Date();
        }

        addTicketActivity({
            ticket,
            action: "status_updated",
            performedBy: id,
            performedByModel: USER_TYPES.FOUNDER,
            message: `Ticket status changed from "${ticket.status}" to "${status}".`
        });

        await ticket.save({ session });

        const updatedTicket = await populateTicket(
            SupportTicket.findById(ticket._id)
                .session(session)
        );

        await session.commitTransaction();
        session.endSession();
        return sendSuccess(res, 200, "Ticket status updated successfully.", updatedTicket);
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return sendError(res, 500, error.message || "Failed to update ticket status.");
    }
});

const addInternalNote = asyncHandler(async (req, res) => {

    if (validateRequest(req, res)) { return; }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { id, userType } = getAuthenticatedUser(req);
        if (!isFounder(userType)) {
            await session.abortTransaction();
            session.endSession();
            return sendError(res, 403, "Only founders can add internal notes.");
        }

        const ticket = await SupportTicket.findById(req.params.ticketId).session(session);

        if (!ticket) {
            await session.abortTransaction();
            session.endSession();
            return sendError(res, 404, "Support ticket not found.");
        }

        ticket.internalNotes.push({
            note: req.body.note,
            addedBy: id,
            createdAt: new Date()
        });

        addTicketActivity({
            ticket,
            action: "internal_note_added",
            performedBy: id,
            performedByModel: USER_TYPES.FOUNDER,
            message: "Internal note added."
        });

        await ticket.save({ session });
        const updatedTicket = await populateTicket(
            SupportTicket.findById(ticket._id).session(session)
        );

        await session.commitTransaction();
        session.endSession();
        return sendSuccess(res, 201, "Internal note added successfully.", updatedTicket.internalNotes);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return sendError(res, 500, error.message || "Failed to add internal note.");

    }

});

const getAllTickets = asyncHandler(async (req, res) => {

    if (validateRequest(req, res)) { return; }

    try {
        const { userType } = getAuthenticatedUser(req);
        if (!isFounder(userType)) { return sendError(res, 403, "Only founders can access all support tickets"); }

        const page = Math.max(Number(req.query.page) || PAGINATION.DEFAULT_PAGE, 1);

        const limit = Math.min(Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);

        const skip = (page - 1) * limit;
        const {
            search,
            status,
            priority,
            ticketType,
            category,
            assignedTo,
            createdBy,
            userType: ticketUserType,
            from,
            to,
            overdue,
            sort = "newest"
        } = req.query;

        const filter = {};

        if (status) {
            filter.status = status;
        }

        if (priority) {
            filter.priority = priority;
        }

        if (ticketType) {
            filter.ticketType = ticketType;
        }

        if (category) {
            filter.category = category;
        }

        if (assignedTo) {
            filter.assignedTo = assignedTo;
        }

        if (createdBy) {
            filter.createdBy = createdBy;
        }

        if (ticketUserType) {
            filter.userType = ticketUserType;
        }

        if (from || to) {
            filter.createdAt = {};
            if (from) {
                filter.createdAt.$gte = new Date(from);
            }
            if (to) {
                filter.createdAt.$lte = new Date(to);
            }

        }

        if (overdue === "true") {
            filter.slaDueAt = {
                $lt: new Date()
            };
            filter.status = {
                $nin: [
                    TICKET_STATUS.RESOLVED,
                    TICKET_STATUS.CLOSED
                ]
            };
        }

        if (search) {
            filter.$or = [
                {
                    ticketNumber: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    subject: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    description: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    category: {
                        $regex: search,
                        $options: "i"
                    }
                }
            ];
        }

        let query = SupportTicket.find(filter);

        if (req.query.withDeleted === "true") {
            query = SupportTicket.findWithDeleted(filter);
        }

        switch (sort) {
            case "oldest":
                query.sort({ createdAt: 1 });
                break;
            case "updated":
                query.sort({ updatedAt: -1 });
                break;
            case "priority":
                query.sort({ priority: -1, createdAt: -1 });
                break;
            case "status":
                query.sort({ status: 1, createdAt: -1 });
                break;
            default:
                query.sort({ createdAt: -1 });
        }

        query.skip(skip).limit(limit);

        query = populateTicket(query);

        const total = req.query.withDeleted === "true"
            ? await SupportTicket.countDocumentsWithDeleted(filter)
            : await SupportTicket.countDocuments(filter);

        const tickets = await query;

        return sendSuccess(res, 200, "Support tickets retrieved successfully.",
            {
                tickets,
                filters: {
                    search,
                    status,
                    priority,
                    ticketType,
                    category,
                    assignedTo,
                    createdBy,
                    ticketUserType,
                    overdue
                },
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNextPage: page * limit < total,
                    hasPreviousPage: page > 1
                }
            }
        );
    } catch (error) {
        return sendError(res, 500, error.message || "Failed to retrieve support tickets.");
    }
});

module.exports = {
    createTicket,
    getMyTickets,
    getAllTickets,
    getSingleTicket,
    updateTicket,
    closeTicket,
    reopenTicket,
    resolveTicket,
    updateTicketStatus,
    assignTicket,
    replyToTicket,
    getReplies,
    addInternalNote,
    deleteTicket,
    restoreTicket
};