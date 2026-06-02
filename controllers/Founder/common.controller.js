const logger = require('../../logger');
const { sendError } = require('../../utils/responseStruture');

const actorFromReq = (req) => ({
  _id: req.user._id,
  role: req.user.role,
  model: 'Founder',
});

const handleError = (res, error, fallbackMessage) => {
  logger.error(error);
  return sendError(
    res,
    error.statusCode || 500,
    error.statusCode ? error.message : fallbackMessage,
    error.errors || null
  );
};

module.exports = {
  actorFromReq,
  handleError,
};
