const LoginHistory = require('../models/loginHistory.model');
const AuditLog = require('../models/auditLog.model');
const { applyDateRange, paginate } = require('./common/query.service');

const modelFromRole = (role) => ({ buyer: 'Buyer', vendor: 'Vendor', founder: 'Founder', admin: 'Admin' }[role] || null);
const maskEmail = (email) => email ? email.replace(/^(.{2}).*(@.*)$/, '$1***$2') : undefined;

const getClientIp = (req) => (req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '').toString().split(',')[0].trim();

const trackLogin = async ({ req, user = null, role, email, phoneNo, loginMethod = 'password', success, failureReason }) => {
  const payload = {
    user: user?._id || null,
    userModel: user ? modelFromRole(role || user.role) : null,
    role: role || user?.role,
    email: email || user?.email,
    phoneNo: phoneNo || user?.phoneNo,
    loginMethod,
    ipAddress: req ? getClientIp(req) : undefined,
    userAgent: req?.headers?.['user-agent'],
    deviceInfo: { userAgent: req?.headers?.['user-agent'] },
    success: Boolean(success),
    failureReason: success ? undefined : failureReason,
  };
  if (!payload.role) return null;
  const history = await LoginHistory.create(payload);
  if (user?._id) {
    await AuditLog.create({ user: user._id, userModel: modelFromRole(payload.role), role: payload.role, actor: user._id, actorModel: modelFromRole(payload.role), actorRole: payload.role, action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE', entity: 'LoginHistory', entityId: history._id, metadata: { email: maskEmail(payload.email), success: payload.success } });
  }
  return history;
};

const buildFilter = (query = {}) => {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.success !== undefined && query.success !== '') filter.success = query.success === true || query.success === 'true';
  if (query.user) filter.user = query.user;
  if (query.search) {
    const regex = new RegExp(query.search, 'i');
    filter.$or = [{ email: regex }, { phoneNo: regex }, { role: regex }, { failureReason: regex }];
  }
  applyDateRange(filter, query);
  return filter;
};

const listLoginHistory = (query) => paginate({ model: LoginHistory, filter: buildFilter(query), query, select: '-__v' });
const getUserLoginHistory = (userId, query = {}) => listLoginHistory({ ...query, user: userId });

module.exports = { trackLogin, listLoginHistory, getUserLoginHistory };
