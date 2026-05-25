const nodemailer = require('nodemailer');
const logger = require('../../logger');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendNotificationEmail = async ({ to, subject, message }) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html: `
        <div>
          <h2>${subject}</h2>
          <p>${message}</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('Email notification sent', {
      to,
      messageId: info.messageId
    });

    return {
      sent: true,
      messageId: info.messageId
    };

  } catch (error) {
    logger.error('Email notification failed', {
      error: error.message
    });

    return {
      sent: false,
      error: error.message
    };
  }
};

module.exports = { sendNotificationEmail };