const axios = require('axios');
const logger = require('../../logger');

const sendNotificationWhatsApp = async ({ to, message }) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          body: message
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    logger.info("WhatsApp notification sent", {
      to
    });

    return {
      sent: true,
      data: response.data
    };

  } catch (error) {
    logger.error("WhatsApp notification failed", {
      error: error.message
    });

    return {
      sent: false,
      error: error.message
    };
  }
};

module.exports = { sendNotificationWhatsApp };