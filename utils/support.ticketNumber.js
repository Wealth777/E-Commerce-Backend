const { TICKET_NUMBER } = require('../constants/support.constants');

const SupportTicket = require('../models/support/SupportTicket');

/**
 * ============================================================================
 * Generate Unique Ticket Number
 *
 * Example:
 * CTSUP-000001
 * CTSUP-000002
 * CTSUP-000003
 * ============================================================================
 */

const generateTicketNumber = async () => {
    const currentYear = new Date().getFullYear();

    // Find the latest ticket created this year
    const latestTicket = await SupportTicket
        .findOne({
            ticketNumber: {
                $regex: `^${TICKET_NUMBER.PREFIX}${TICKET_NUMBER.SUPPORT_PREFIX}-${currentYear}`
            }
        })
        .sort({ createdAt: -1 })
        .select('ticketNumber')
        .lean();

    let sequence = 1;

    if (latestTicket) {
        const parts = latestTicket.ticketNumber.split('-');

        if (parts.length === 3) {
            sequence = Number(parts[2]) + 1;
        }
    }

    const paddedSequence = String(sequence).padStart(
        TICKET_NUMBER.PAD_LENGTH,
        '0'
    );

    return `${TICKET_NUMBER.PREFIX}${TICKET_NUMBER.SUPPORT_PREFIX}-${currentYear}-${paddedSequence}`;
};

module.exports = generateTicketNumber;