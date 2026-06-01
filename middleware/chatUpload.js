const multer = require('multer');
const path = require('path');

const MAX_ATTACHMENTS = Number(process.env.CHAT_MAX_ATTACHMENTS || 5);
const MAX_FILE_SIZE = Number(process.env.CHAT_MAX_FILE_SIZE || 5 * 1024 * 1024);

const allowed = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

const rejected = new Set(['.exe', '.bat', '.cmd', '.apk', '.sh', '.js', '.msi', '.com', '.scr', '.jar', '.php', '.py', '.rb', '.pl']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_ATTACHMENTS },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (rejected.has(ext) || !allowed[ext] || !allowed[ext].includes(file.mimetype)) {
      return cb(new Error('Invalid chat attachment type'), false);
    }
    return cb(null, true);
  },
});

module.exports = { chatUpload: upload.array('attachments', MAX_ATTACHMENTS), MAX_ATTACHMENTS, MAX_FILE_SIZE, allowedChatTypes: allowed };
