// const nodemailer = require("nodemailer");
// const logger = require('../logger');

// const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: Number(process.env.EMAIL_PORT),
//     secure: process.env.EMAIL_SECURE === "true",
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASSWORD,
//     },
//     pool: true,
//     maxConnections: 5,
//     maxMessages: 100,
// });

// const verifyEmailConnection = async () => {
//     try {
//         await transporter.verify();
//         logger.info("Email service connected successfully.");
//     } catch (error) {
//         logger.error("Email service connection failed.");
//         logger.error(error.message);
//     }
// };

// module.exports = {
//     transporter,
//     verifyEmailConnection,
// };

const nodemailer = require("nodemailer");
const dns = require("dns");

const logger = require("../logger");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,

  port: Number(process.env.EMAIL_PORT),

  secure: process.env.EMAIL_SECURE === "true",

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },

  pool: true,
  maxConnections: 5,
  maxMessages: 100,

  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { family: 4 }, callback);
  },
});

const verifyEmailConnection = async () => {
  try {
    await transporter.verify();

    logger.info("Email service connected successfully.");
  } catch (error) {
    logger.error("Email service connection failed.");
    logger.error(error.message);
  }
};

module.exports = {
  transporter,
  verifyEmailConnection,
};