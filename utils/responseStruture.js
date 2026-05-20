const buildResponse = ({ success, message, data = null, errors = null }) => ({
  success,
  message,
  data,
  errors,
  timestamp: new Date().toISOString(),
});

const normalizeResponseArgs = (statusCode, success, message, data, errors) => {
  let normalizedSuccess = success;
  let normalizedMessage = message;
  let normalizedData = data;
  let normalizedErrors = errors;

  if (typeof normalizedSuccess !== 'boolean') {
    normalizedMessage = normalizedSuccess || (statusCode >= 400 ? 'Request failed' : 'Success');
    normalizedSuccess = statusCode < 400;
  }

  if (normalizedMessage && typeof normalizedMessage === 'object' && normalizedData === null) {
    normalizedData = normalizedMessage;
    normalizedMessage = normalizedSuccess ? 'Success' : 'Request failed';
  }

  if (!normalizedSuccess && normalizedData && normalizedErrors === null) {
    normalizedErrors = normalizedData;
    normalizedData = null;
  }

  return {
    success: normalizedSuccess,
    message: normalizedMessage || (normalizedSuccess ? 'Success' : 'Request failed'),
    data: normalizedData,
    errors: normalizedErrors,
  };
};

const sendResponse = (res, statusCode, success, message = null, data = null, errors = null) => {
  const payload = normalizeResponseArgs(statusCode, success, message, data, errors);
  return res.status(statusCode).json(buildResponse(payload));
};

const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  return sendResponse(res, statusCode, true, message, data, null);
};

const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = null, data = null) => {
  return sendResponse(res, statusCode, false, message, data, errors);
};

module.exports = { sendResponse, sendSuccess, sendError, buildResponse };
