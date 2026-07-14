const mongoose = require("mongoose");

const SupportTicket = require("../../models/support/SupportTicket");
const SupportReply = require("../../models/support/SupportReply");

const {
    USER_TYPES,
    TICKET_STATUS,
    PAGINATION,
    SORT_OPTIONS,
    TICKET_PRIORITY,
    SLA
} = require("../../constants/support.constants");

const logger = require("../../logger");
const generateTicketNumber = require("../../utils/support.ticketNumber");
const { safeCreateNotification } = require("../notification/notification.service");
const AuditLog = require("../../models/auditLog.model");
const { emitNotification, } = require('../../sockets/notification.socket');

/* Helper Functions */

/* Normalize authenticated user.  */
const getActor = (user) => {
    if (!user) {
        throw new Error("Authentication required.");
    }

    let model = USER_TYPES.BUYER;

    switch ((user.role || "").toLowerCase()) {
        case "vendor":
            model = USER_TYPES.VENDOR;
            break;

        case "founder":
            model = USER_TYPES.FOUNDER;
            break;

        default:
            model = USER_TYPES.BUYER;
    }

    return {
        id: user._id,
        role: user.role,
        model,
    };
};

/* Calculate SlaDueDate */
const calculateSlaDueDate = (priority) => {
    const hours =
        SLA[priority?.toUpperCase()] ||
        SLA[TICKET_PRIORITY.MEDIUM.toUpperCase()];

    const dueDate = new Date();

    dueDate.setHours(dueDate.getHours() + hours);

    return dueDate;
};


/* Convert uploaded files into SupportTicket attachment structure. */
const buildAttachmentData = (files = []) => {
    if (!Array.isArray(files) || files.length === 0) {
        return [];
    }
    return files.map((file) => ({
        publicId: file.filename || file.public_id || null,
        url: file.path || file.secure_url || file.url,
        originalName: file.originalname,
        mimeType: file.mimetype,
        extension: file.originalname?.split(".").pop()?.toLowerCase() || "",
        size: file.size || 0,
        uploadedAt: new Date(),
    }));
};

/* Create audit log safely. */
const createAuditLog = async ({
    session,
    actor,
    targetUser,
    action,
    entity,
    entityId,
    reason = null,
    metadata = {},
}) => {
    try {
        await AuditLog.create(
            [
                {
                    user: targetUser,
                    userModel: actor.model,
                    actor: actor.id,
                    actorModel: actor.model,
                    actorRole:
                        actor.role === "founder"
                            ? "founder"
                            : actor.role,
                    targetUser,
                    role:
                        actor.role === "founder"
                            ? "founder"
                            : actor.role,
                    action,
                    entity,
                    entityId,
                    reason,
                    metadata,
                },
            ],
            { session }
        );
    } catch (error) {
        logger.error("Support audit log failed.", {
            error: error.message,
            action,
            entityId,
        });
    }
};

/* Send notification safely. */
const notifyUser = async ({
    recipientId,
    recipientRole,
    type,
    title,
    message,
    metadata = {},
}) => {
    try {
        await safeCreateNotification({
            recipientId,
            recipientRole,
            type,
            title,
            message,
            metadata,
        });
    } catch (error) {
        logger.error("Support notification failed.", {
            error: error.message,
        });
    }
};

/* Notify founder. */
const notifyFounder = async ({
    founderId,
    type,
    title,
    message,
    metadata = {},
}) => {
    return notifyUser({
        recipientId: founderId,
        recipientRole: "founder",
        type,
        title,
        message,
        metadata,
    });
};

/* Placeholder for email integration. */
const sendSupportEmailPlaceholder = async () => {
    return true;
};

/* Verify ticket ownership. */
const validateTicketOwnership = (ticket, actor) => {
    if (!ticket) {
        throw new Error("Support ticket not found.");
    }

    if (actor.model === USER_TYPES.FOUNDER) {
        return true;
    }

    const isOwner =
        ticket.createdBy.toString() === actor.id.toString() &&
        ticket.userType === actor.model;

    if (!isOwner) {
        throw new Error(
            "You are not authorized to access this support ticket."
        );
    }
    return true;
};

/* Founder authorization. */
const validateFounderAccess = (actor) => {
    if (actor.model !== USER_TYPES.FOUNDER) {
        throw new Error(
            "Only founders are allowed to perform this action."
        );
    }
    return true;
};

/* Add activity entry. */
const addActivityLog = ({
    ticket,
    action,
    actor,
    message,
}) => {
    ticket.addActivity({
        action,
        performedBy: actor.id,
        performedByModel: actor.model,
        message,
    });
};

/* Ticket Creation */

const createTicket = async ({
    user,
    body,
    files = [],
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const actor = getActor(user);
        const attachments = buildAttachmentData(files);

        const ticketNumber =
            await generateTicketNumber();

        const ticket = new SupportTicket({
            ticketNumber,
            createdBy: actor.id,
            userType: actor.model,
            ticketType: body.ticketType,
            category: body.category,
            customCategory: body.customCategory || null,
            subject: body.subject,
            description: body.description,
            priority: body.priority,
            tags: body.tags || [],
            attachments,
            status: body.status,
            slaDueAt:
                calculateSlaDueDate(
                    priority ||
                    TICKET_PRIORITY.MEDIUM
                ),
            metadata: {
                ipAddress: body.ipAddress,
                browser: body.browser,
                platform: body.platform,
                userAgent: body.userAgent,
                appVersion: body.appVersion,
            },
        });

        addActivityLog({
            ticket,
            action: "ticket_created",
            actor,
            message: "Support ticket created.",
        });

        await ticket.save({ session });

        await createAuditLog({
            session,
            actor,
            targetUser: actor.id,
            action: "SUPPORT_TICKET_CREATED",
            entity: "SupportTicket",
            entityId: ticket._id,
            metadata: {
                ticketNumber,
            },
        });

        await notifyUser({
            recipientId: actor.id,
            recipientRole: ticket.userType.toLowerCase(),
            type: "SUPPORT_TICKET_CREATED",
            title: "Support Ticket Created",
            message:
                "Your support ticket has been created successfully.",
            metadata: {
                ticketId: ticket._id,
                ticketNumber,
            },
        });

        emitTicketCreated(ticket);

        await sendSupportEmailPlaceholder();
        await session.commitTransaction();
        return ticket;
    } catch (error) {
        await session.abortTransaction();
        logger.error("Support ticket creation failed.", {
            error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};

/* Ticket Retrieval */

const buildTicketQuery = ({
    actor,
    status,
    ticketType,
    priority,
    category,
    assignedTo,
    search,
}) => {
    const query = {};

    if (actor.model !== USER_TYPES.FOUNDER) {
        query.createdBy = actor.id;
        query.userType = actor.model;
    }

    if (status) {
        query.status = status;
    }

    if (ticketType) {
        query.ticketType = ticketType;
    }

    if (priority) {
        query.priority = priority;
    }

    if (category) {
        query.category = category;
    }

    if (assignedTo) {
        query.assignedTo = assignedTo;
    }

    if (search) {
        query.$text = {
            $search: search,
        };
    }

    return query;
};

const buildPagination = ({
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
}) => {
    const currentPage = Math.max(1, Number(page));

    const pageSize = Math.min(
        Math.max(1, Number(limit)),
        PAGINATION.MAX_LIMIT
    );

    return {
        page: currentPage,
        limit: pageSize,
        skip: (currentPage - 1) * pageSize,
    };
};

const getMyTickets = async ({
    user,
    query = {},
}) => {
    const actor = getActor(user);

    const {
        page,
        limit,
        skip,
    } = buildPagination(query);

    const filters = buildTicketQuery({
        actor,
        ...query,
    });

    const [tickets, total] = await Promise.all([
        SupportTicket.find(filters)
            .populate(
                "assignedTo",
                "firstName lastName email"
            )
            .sort({
                createdAt: -1,
            })
            .skip(skip)
            .limit(limit),
        SupportTicket.countDocuments(filters),
    ]);

    return {
        tickets,
        pagination: {
            currentPage: page,
            pageSize: limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getAllTickets = async ({
    user,
    query = {},
}) => {
    const actor = getActor(user);
    validateFounderAccess(actor);

    const {
        page,
        limit,
        skip,
    } = buildPagination(query);

    const filters = buildTicketQuery({
        actor,
        ...query,
    });

    const sort =
        SORT_OPTIONS[query.sort?.toUpperCase()] || SORT_OPTIONS.NEWEST;

    const [tickets, total] = await Promise.all([
        SupportTicket.find(filters)
            .populate(
                "createdBy",
                "fullName email profilePhoto"
            )
            .populate(
                "assignedTo",
                "firstName lastName email"
            )
            .sort(sort).skip(skip).limit(limit),
        SupportTicket.countDocuments(filters),
    ]);

    return {
        tickets,
        pagination: {
            currentPage: page,
            pageSize: limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getTicketById = async ({
    user,
    ticketId,
}) => {
    const actor = getActor(user);
    const ticket = await SupportTicket.findById(ticketId)
        .populate(
            "createdBy",
            "fullName email profilePhoto"
        )
        .populate(
            "assignedTo",
            "firstName lastName email"
        )
        .populate(
            "resolvedBy",
            "firstName lastName"
        );

    if (!ticket) {
        throw new Error("Support ticket not found.");
    }
    validateTicketOwnership(ticket, actor);

    return ticket;
};

/* Ticket Update */

const updateTicket = async ({
    user,
    ticketId,
    body,
    files = [],
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const actor = getActor(user);
        const ticket = await SupportTicket.findById(ticketId).session(session);
        validateTicketOwnership(ticket, actor);
        if (
            [
                TICKET_STATUS.CLOSED,
                TICKET_STATUS.RESOLVED,
            ].includes(ticket.status)
        ) {
            throw new Error(
                "This ticket can no longer be updated."
            );
        }

        if (body.subject !== undefined) {
            ticket.subject = body.subject;
        }

        if (body.description !== undefined) {
            ticket.description = body.description;
        }

        if (body.priority !== undefined) {
            ticket.priority = body.priority;
        }

        if (body.category !== undefined) {
            ticket.category = body.category;
        }

        if (body.customCategory !== undefined) {
            ticket.customCategory = body.customCategory;
        }

        if (Array.isArray(body.tags)) {
            ticket.tags = body.tags;
        }

        if (files.length > 0) {
            ticket.attachments.push(
                ...buildAttachmentData(files)
            );
        }

        addActivityLog({
            ticket,
            action: "ticket_updated",
            actor,
            message: "Support ticket updated.",
        });

        await ticket.save({ session });
        await createAuditLog({
            session,
            actor,
            targetUser: ticket.createdBy,
            action: "SUPPORT_TICKET_UPDATED",
            entity: "SupportTicket",
            entityId: ticket._id,
            metadata: {
                ticketNumber: ticket.ticketNumber,
            },
        });

        await notifyUser({
            recipientId: ticket.createdBy,
            recipientRole: ticket.userType.toLowerCase(),
            type: "SUPPORT_TICKET_UPDATED",
            title: "Support Ticket Updated",
            message:
                "Your support ticket has been updated successfully.",
            metadata: {
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
            },
        });

        emitTicketUpdated(ticket);

        await sendSupportEmailPlaceholder();
        await session.commitTransaction();
        return ticket;
    } catch (error) {
        await session.abortTransaction();
        logger.error("Failed to update support ticket.", {
            ticketId,
            error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};

/* Close Ticket */

const closeTicket = async ({
    user,
    ticketId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const actor = getActor(user);
        const ticket = await SupportTicket.findById(ticketId).session(session);
        validateTicketOwnership(ticket, actor);

        if (ticket.status === TICKET_STATUS.CLOSED) {
            throw new Error("Ticket is already closed.");
        }

        await ticket.closeTicket();

        addActivityLog({
            ticket,
            action: "ticket_closed",
            actor,
            message: "Support ticket closed.",
        });

        await createAuditLog({
            session,
            actor,
            targetUser: ticket.createdBy,
            action: "SUPPORT_TICKET_CLOSED",
            entity: "SupportTicket",
            entityId: ticket._id,
            metadata: {
                ticketNumber: ticket.ticketNumber,
            },
        });

        await notifyUser({
            recipientId: ticket.createdBy,
            recipientRole: ticket.userType.toLowerCase(),
            type: "SUPPORT_TICKET_CLOSED",
            title: "Support Ticket Closed",
            message:
                "Your support ticket has been closed.",
            metadata: {
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
            },
        });

        await sendSupportEmailPlaceholder();
        await session.commitTransaction();
        return ticket;
    } catch (error) {
        await session.abortTransaction();
        logger.error("Failed to close support ticket.", {
            ticketId,
            error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};
/* Reopen Ticket */

const reopenTicket = async ({
    user,
    ticketId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const actor = getActor(user);
        const ticket = await SupportTicket.findById(ticketId).session(session);
        validateTicketOwnership(ticket, actor);

        if (
            ticket.status !== TICKET_STATUS.CLOSED &&
            ticket.status !== TICKET_STATUS.RESOLVED
        ) {
            throw new Error(
                "Only closed or resolved tickets can be reopened."
            );
        }

        await ticket.reopenTicket();

        addActivityLog({
            ticket,
            action: "ticket_reopened",
            actor,
            message: "Support ticket reopened.",
        });

        await ticket.save({ session });
        await createAuditLog({
            session,
            actor,
            targetUser: ticket.createdBy,
            action: "SUPPORT_TICKET_REOPENED",
            entity: "SupportTicket",
            entityId: ticket._id,
            metadata: {
                ticketNumber: ticket.ticketNumber,
            },
        });

        await notifyUser({
            recipientId: ticket.createdBy,
            recipientRole: ticket.userType.toLowerCase(),
            type: "SUPPORT_TICKET_REOPENED",
            title: "Support Ticket Reopened",
            message:
                "Your support ticket has been reopened successfully.",
            metadata: {
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
            },
        });

        if (ticket.assignedTo) {
            await notifyFounder({
                founderId: ticket.assignedTo,
                type: "SUPPORT_TICKET_REOPENED",
                title: "Support Ticket Reopened",
                message: `Ticket ${ticket.ticketNumber} has been reopened.`,
                metadata: {
                    ticketId: ticket._id,
                    ticketNumber: ticket.ticketNumber,
                },
            });
        }

        await sendSupportEmailPlaceholder();
        await session.commitTransaction();
        return ticket;
    } catch (error) {
        await session.abortTransaction();
        logger.error("Failed to reopen support ticket.", {
            ticketId,
            error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};

/* Delete Ticket (Soft Delete) */

const deleteTicket = async ({
    user,
    ticketId,
    reason = null,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const actor = getActor(user);
        const ticket = await SupportTicket.findById(ticketId).session(session);
        validateTicketOwnership(ticket, actor);

        if (ticket.deleted) {
            throw new Error("Support ticket has already been deleted.");
        }

        await ticket.softDelete(
            actor.id,
            actor.model
        );

        addActivityLog({
            ticket,
            action: "ticket_deleted",
            actor,
            message: "Support ticket deleted.",
        });

        await ticket.save({ session });
        await createAuditLog({
            session,
            actor,
            targetUser: ticket.createdBy,
            action: "SUPPORT_TICKET_DELETED",
            entity: "SupportTicket",
            entityId: ticket._id,
            reason,
            metadata: {
                ticketNumber: ticket.ticketNumber,
            },
        });

        await notifyUser({
            recipientId: ticket.createdBy,
            recipientRole: ticket.userType.toLowerCase(),
            type: "SUPPORT_TICKET_DELETED",
            title: "Support Ticket Deleted",
            message:
                "Your support ticket has been deleted successfully.",
            metadata: {
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
            },
        });

        await sendSupportEmailPlaceholder();
        await session.commitTransaction();
        return ticket;
    } catch (error) {
        await session.abortTransaction();
        logger.error("Delete support ticket failed.", {
            ticketId,
            error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};

/* Restore Ticket */

const restoreTicket = async ({
    user,
    ticketId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const actor = getActor(user);
        validateFounderAccess(actor);
        const ticket = await SupportTicket.findOne({
            _id: ticketId
        })
            .setOptions({ withDeleted: true })
            .session(session);

        if (!ticket) {
            throw new Error("Support ticket not found.");
        }

        if (!ticket.deleted) {
            throw new Error("Support ticket is not deleted.");
        }

        await ticket.restore();
        addActivityLog({
            ticket,
            action: "ticket_restored",
            actor,
            message: "Support ticket restored.",
        });

        await ticket.save({ session });
        await createAuditLog({
            session,
            actor,
            targetUser: ticket.createdBy,
            action: "SUPPORT_TICKET_RESTORED",
            entity: "SupportTicket",
            entityId: ticket._id,
            metadata: {
                ticketNumber: ticket.ticketNumber,
            },
        });

        await notifyUser({
            recipientId: ticket.createdBy,
            recipientRole: ticket.userType.toLowerCase(),
            type: "SUPPORT_TICKET_RESTORED",
            title: "Support Ticket Restored",
            message:
                "Your support ticket has been restored.",
            metadata: {
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
            },
        });

        await sendSupportEmailPlaceholder();
        await session.commitTransaction();
        return ticket;
    } catch (error) {
        await session.abortTransaction();
        logger.error("Restore support ticket failed.", {
            ticketId,
            error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};

/* Reply To Ticket */

const addReply = async ({
    user,
    ticketId,
    body,
    files = [],
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const actor = getActor(user);
        const ticket = await SupportTicket.findById(ticketId).session(session);

        if (!ticket) {
            throw new Error("Support ticket not found.");
        }

        if (actor.model !== USER_TYPES.FOUNDER) {
            validateTicketOwnership(ticket, actor);
        }

        if (ticket.status === TICKET_STATUS.CLOSED) {
            throw new Error("Cannot reply to a closed ticket.");
        }

        const [reply] = await SupportReply.create(
            [{
                ticket: ticket._id,
                author: actor.id,
                authorModel: actor.model,
                message: body.message,
                isInternal:
                    actor.model === USER_TYPES.FOUNDER
                        ? Boolean(body.isInternal)
                        : false,

                attachments: buildAttachmentData(files),
            }], { session }
        );

        addActivityLog({
            ticket,
            action: "ticket_replied",
            actor,
            message: "A new reply was added.",
        });

        if (actor.model === USER_TYPES.FOUNDER) {
            ticket.status = TICKET_STATUS.WAITING_FOR_USER;
        } else {
            ticket.status = TICKET_STATUS.WAITING_FOR_SUPPORT;
        }

        await ticket.save({ session });
        await createAuditLog({
            session,
            actor,
            targetUser: ticket.createdBy,
            action: "SUPPORT_TICKET_REPLIED",
            entity: "SupportReply",
            entityId: reply._id,
            metadata: {
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
            },
        });

        if (actor.model === USER_TYPES.FOUNDER) {
            await notifyUser({
                recipientId: ticket.createdBy,
                recipientRole: ticket.userType.toLowerCase(),
                type: "SUPPORT_REPLY_RECEIVED",
                title: "New Support Reply",
                message:
                    "Support has replied to your ticket.",
                metadata: {
                    ticketId: ticket._id,
                    replyId: reply._id,
                },
            });
        } else if (ticket.assignedTo) {
            await notifyFounder({
                founderId: ticket.assignedTo,
                type: "SUPPORT_NEW_REPLY",
                title: "New Customer Reply",
                message: `A customer replied to ticket ${ticket.ticketNumber}.`,
                metadata: {
                    ticketId: ticket._id,
                    replyId: reply._id,
                },
            });
        }

        emitReplyCreated(ticket, reply);

        await sendSupportEmailPlaceholder();
        await session.commitTransaction();
        return reply;
    } catch (error) {
        await session.abortTransaction();
        logger.error("Failed to add support reply.", {
            ticketId,
            error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};

/* Get Ticket Replies */

const getReplies = async ({
    user,
    ticketId,
}) => {
    const actor = getActor(user);
    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) {
        throw new Error("Support ticket not found.");
    }

    if (actor.model !== USER_TYPES.FOUNDER) {
        validateTicketOwnership(ticket, actor);
    }

    const includeInternal = actor.model === USER_TYPES.FOUNDER;

    return SupportReply.findTicketReplies(
        ticketId,
        includeInternal
    );
};

/* Assign Ticket */

const assignTicket = async ({
    user,
    ticketId,
    founderId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const actor = getActor(user);
        validateFounderAccess(actor);
        const ticket = await SupportTicket.findById(ticketId).session(session);

        if (!ticket) {
            throw new Error("Support ticket not found.");
        }

        ticket.assignedTo = founderId;

        if (ticket.status === TICKET_STATUS.OPEN) {
            ticket.status = TICKET_STATUS.IN_PROGRESS;
        }

        addActivityLog({
            ticket,
            action: "ticket_assigned",
            actor,
            message: `Ticket assigned to founder ${founderId}.`,
        });

        await ticket.save({ session });
        await createAuditLog({
            session,
            actor,
            targetUser: ticket.createdBy,
            action: "SUPPORT_TICKET_ASSIGNED",
            entity: "SupportTicket",
            entityId: ticket._id,
            metadata: {
                ticketNumber: ticket.ticketNumber,
                assignedTo: founderId,
            },
        });

        await notifyFounder({
            founderId,
            type: "SUPPORT_TICKET_ASSIGNED",
            title: "New Support Ticket Assigned",
            message: `Ticket ${ticket.ticketNumber} has been assigned to you.`,
            metadata: {
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
            },
        });

        await notifyUser({
            recipientId: ticket.createdBy,
            recipientRole: ticket.userType.toLowerCase(),
            type: "SUPPORT_TICKET_ASSIGNED",
            title: "Support Ticket Assigned",
            message: "Your support ticket has been assigned to a support representative.",
            metadata: {
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
            },
        });

        await sendSupportEmailPlaceholder();
        await session.commitTransaction();
        return ticket;
    } catch (error) {
        await session.abortTransaction();
        logger.error("Failed to assign support ticket.", {
            ticketId,
            founderId,
            error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};

/* Resolve Ticket */

const resolveTicket = async ({
    user,
    ticketId,
}) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const actor = getActor(user);
        validateFounderAccess(actor);
        const ticket = await SupportTicket.findById(ticketId).session(session);

        if (!ticket) {
            throw new Error("Support ticket not found.");
        }

        if (ticket.status === TICKET_STATUS.RESOLVED) {
            throw new Error("Support ticket is already resolved.");
        }

        ticket.status = TICKET_STATUS.RESOLVED;
        ticket.resolvedAt = new Date();
        ticket.resolvedBy = actor.id;

        addActivityLog({
            ticket,
            action: "ticket_resolved",
            actor,
            message: "Support ticket resolved.",
        });

        await ticket.save({ session });
        await createAuditLog({
            session,
            actor,
            targetUser: ticket.createdBy,
            action: "SUPPORT_TICKET_RESOLVED",
            entity: "SupportTicket",
            entityId: ticket._id,
            metadata: {
                ticketNumber: ticket.ticketNumber,
            },
        });

        await notifyUser({
            recipientId: ticket.createdBy,
            recipientRole: ticket.userType.toLowerCase(),
            type: "SUPPORT_TICKET_RESOLVED",
            title: "Support Ticket Resolved",
            message: "Your support ticket has been resolved.",
            metadata: {
                ticketId: ticket._id,
                ticketNumber: ticket.ticketNumber,
            },
        });

        await sendSupportEmailPlaceholder();
        await session.commitTransaction();
        return ticket;
    } catch (error) {
        await session.abortTransaction();
        logger.error("Failed to resolve support ticket.", {
            ticketId,
            error: error.message,
        });
        throw error;
    } finally {
        session.endSession();
    }
};

/* SOCKET EVENTS */

const emitTicketCreated = (ticket) => {
    try {
        emitNotification({
            recipient: ticket.createdBy,
            recipientRole: ticket.userType.toLowerCase(),
            type: "support.ticket.created",
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            status: ticket.status
        });
    } catch (error) {
        logger.error("Failed to emit ticket created event", {
            error: error.message,
            ticketId: ticket?._id
        });
    }
};

const emitTicketUpdated = (ticket) => {
    try {
        emitNotification({
            recipient: ticket.createdBy,
            recipientRole: ticket.userType.toLowerCase(),
            type: "support.ticket.updated",
            ticketId: ticket._id,
            status: ticket.status
        });
    } catch (error) {
        logger.error("Failed to emit ticket updated event", {
            error: error.message,
            ticketId: ticket?._id
        });
    }
};

const emitReplyCreated = (ticket, reply) => {
    try {
        emitNotification({
            recipient: ticket.createdBy,
            recipientRole: ticket.userType.toLowerCase(),
            type: "support.reply.created",
            ticketId: ticket._id,
            replyId: reply._id
        });
    } catch (error) {
        logger.error("Failed to emit support reply event", {
            error: error.message
        });
    }
};


/* EMAIL PLACEHOLDERS */

const sendTicketCreatedEmail = async () => {
    logger.info("Support email placeholder: ticket created.");
};

const sendReplyEmail = async () => {
    logger.info("Support email placeholder: reply.");
};

const sendTicketResolvedEmail = async () => {
    logger.info("Support email placeholder: resolved.");
};

const sendTicketClosedEmail = async () => {
    logger.info("Support email placeholder: closed.");
};

module.exports = {
    createTicket,
    buildTicketQuery,
    buildPagination,
    getMyTickets,
    getAllTickets,
    getTicketById,
    updateTicket,
    closeTicket,
    reopenTicket,
    deleteTicket,
    restoreTicket,
    addReply,
    getReplies,
    assignTicket,
    resolveTicket,
    sendTicketCreatedEmail,
    sendReplyEmail,
    sendTicketResolvedEmail,
    sendTicketClosedEmail
};