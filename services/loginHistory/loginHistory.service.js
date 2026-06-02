const LoginHistory = require('../../models/loginHistory.model');
const AuditLog = require('../../models/auditLog.model');
const { addDateRange, paginated } = require('../common/query.service');
const { getRefByRole } = require('../common/authz.service');

const maskEmail = (email = '') => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
};

const createLoginHistory = async ({ user = null, role, email, phoneNo, loginMethod = 'email', success, failureReason = null, requestInfo = {}, session = null }) => {
  const payload = {
    user: user?._id || user || null,
    userModel: getRefByRole(role),
    role,
    email,
    phoneNo,
    loginMethod,
    success,
    failureReason,
    ...requestInfo,
  };

  const docs = await LoginHistory.create([payload], session ? { session } : undefined);

  if (user?._id || user) {
    await AuditLog.create([{
      user: user?._id || user,
      role,
      action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
      entity: 'LoginHistory',
      entityId: docs[0]._id,
      metadata: { email: maskEmail(email), failureReason },
    }], session ? { session } : undefined);
  }

  return docs[0];
};

const buildFilter = (query = {}, base = {}) => {
  const filter = { ...base };
  if (query.role) filter.role = query.role;
  if (query.success !== undefined) filter.success = String(query.success) === 'true';
  addDateRange(filter, query);
  return filter;
};

const listLoginHistory = (query = {}, base = {}) => {
  const filter = buildFilter(query, base);
  return paginated({ model: LoginHistory, filter, query, sortFields: ['createdAt', 'role', 'success'], select: '-__v' });
};

module.exports = { createLoginHistory, listLoginHistory };
