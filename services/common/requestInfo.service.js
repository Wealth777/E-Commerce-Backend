const getIpAddress = (req) => (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '').toString().split(',')[0].trim();

const parseDeviceInfo = (userAgent = '') => {
  const ua = userAgent || '';
  return {
    raw: ua,
    browser: ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Unknown',
    os: ua.includes('Windows') ? 'Windows' : ua.includes('Android') ? 'Android' : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Unknown',
    deviceType: /Mobile|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop',
  };
};

const getRequestInfo = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  return {
    ipAddress: getIpAddress(req),
    userAgent,
    deviceInfo: parseDeviceInfo(userAgent),
    location: req.body?.location || req.query?.location || null,
  };
};

module.exports = { getRequestInfo };
