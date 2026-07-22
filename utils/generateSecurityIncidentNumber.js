const SecurityIncident = require("../models/securityIncident.model");

const INCIDENT_PREFIX = "CTSEC";
const PAD_LENGTH = 6;

/**
 * Example:
 * CTSEC-2026-000001
 * CTSEC-2026-000002
 */

const generateSecurityIncidentNumber = async () => {
    const currentYear = new Date().getFullYear();

    const latestIncident = await SecurityIncident
        .findOne({
            incidentNumber: {
                $regex: `^${INCIDENT_PREFIX}-${currentYear}`
            }
        })
        .sort({ createdAt: -1 })
        .select("incidentNumber")
        .lean();

    let sequence = 1;

    if (latestIncident) {
        const parts = latestIncident.incidentNumber.split("-");

        if (parts.length === 3) {
            sequence = Number(parts[2]) + 1;
        }
    }

    return `${INCIDENT_PREFIX}-${currentYear}-${String(sequence).padStart(PAD_LENGTH, "0")}`;
};

module.exports = generateSecurityIncidentNumber;