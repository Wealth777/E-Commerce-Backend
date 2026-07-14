const express = require("express");
const router = express.Router();

const supportController = require("../controllers/common/support.controller");
const { verifyUser } = require("../middleware/verifyUser");
const founderAccess = require("../middleware/founderAccess");
const { supportAttachmentUpload } = require("../middleware/imageUpload");
const {
    createTicketValidation,
    updateTicketValidation,
    replyValidation,
    ticketQueryValidation,
    ticketStatusValidation,
    assignTicketValidation,
    internalNoteValidation,
    deleteTicketValidation,
    restoreTicketValidation
} = require("../validators/support.validation");

/**
 * ============================================================================
 * USER ROUTES
 * Buyer & Vendor
 * ============================================================================
 */

router.post(
    "/",
    verifyUser,
    supportAttachmentUpload.array("attachments", 5),
    createTicketValidation,
    supportController.createTicket
);

router.get(
    "/my-tickets",
    verifyUser,
    ticketQueryValidation,
    supportController.getMyTickets
);

router.get(
    "/:ticketId",
    verifyUser,
    supportController.getSingleTicket
);

router.put(
    "/:ticketId",
    verifyUser,
    supportAttachmentUpload.array("attachments", 5),
    updateTicketValidation,
    supportController.updateTicket
);

router.patch(
    "/:ticketId/close",
    verifyUser,
    supportController.closeTicket
);

router.patch(
    "/:ticketId/reopen",
    verifyUser,
    supportController.reopenTicket
);

router.delete(
    "/:ticketId",
    verifyUser,
    deleteTicketValidation,
    supportController.deleteTicket
);

router.patch(
    "/:ticketId/restore",
    verifyUser,
    restoreTicketValidation,
    supportController.restoreTicket
);

router.post(
    "/:ticketId/replies",
    verifyUser,
    supportAttachmentUpload.array("attachments", 5),
    replyValidation,
    supportController.replyToTicket
);

router.get(
    "/:ticketId/replies",
    verifyUser,
    supportController.getReplies
);


/**
 * ============================================================================
 * FOUNDER ROUTES
 * ============================================================================
 */

router.get(
    "/",
    verifyUser,
    founderAccess.founderOnly,
    ticketQueryValidation,
    supportController.getAllTickets
);

router.patch(
    "/:ticketId/assign",
    verifyUser,
    founderAccess.founderOnly,
    assignTicketValidation,
    supportController.assignTicket
);

router.patch(
    "/:ticketId/resolve",
    verifyUser,
    founderAccess.founderOnly,
    supportController.resolveTicket
);

router.patch(
    "/:ticketId/status",
    verifyUser,
    founderAccess.founderOnly,
    ticketStatusValidation,
    supportController.updateTicketStatus
);

router.post(
    "/:ticketId/internal-note",
    verifyUser,
    founderAccess.founderOnly,
    internalNoteValidation,
    supportController.addInternalNote
);

module.exports = router;