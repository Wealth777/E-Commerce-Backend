const { sendError } = require('../utils/responseStruture');

const roleGroups = {
  founderOnly: ['founder'],
  founderOrAdmin: ['founder', 'admin'],
};

const allowRoles = (roles = []) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return sendError(res, 403, 'Access denied');
  }
  return next();
};

const founderOnly = allowRoles(roleGroups.founderOnly);
const founderOrAdmin = allowRoles(roleGroups.founderOrAdmin);

module.exports = {
  allowRoles,
  founderOnly,
  founderOrAdmin,
  roleGroups,
};
