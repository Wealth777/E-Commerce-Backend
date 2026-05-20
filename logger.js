const fs = require('fs');
const path = require('path');

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const writeLog = (level, message, meta = null) => {
  const payload = {
    level,
    service: 'campustrade-backend',
    message: message instanceof Error ? message.message : message,
    stack: message instanceof Error ? message.stack : undefined,
    meta,
    timestamp: new Date().toISOString(),
  };

  const line = `${JSON.stringify(payload)}\n`;
  fs.appendFileSync(path.join(logsDir, `${level}.log`), line);
  fs.appendFileSync(path.join(logsDir, 'combined.log'), line);

  const stream = level === 'error' ? process.stderr : process.stdout;
  if (process.env.NODE_ENV !== 'test') stream.write(line);
};

module.exports = {
  info: (message, meta) => writeLog('info', message, meta),
  warn: (message, meta) => writeLog('warn', message, meta),
  error: (message, meta) => writeLog('error', message, meta),
  debug: (message, meta) => {
    if (process.env.LOG_LEVEL === 'debug') writeLog('debug', message, meta);
  },
};
