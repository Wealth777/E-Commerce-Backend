const sendResponse = (res, statusCode, success, message, data = null, errors = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    errors,
    timestamp: new Date().toISOString()
  });
};

module.exports = { sendResponse }