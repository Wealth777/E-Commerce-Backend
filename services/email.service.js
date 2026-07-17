const { transporter } = require("../config/email");
const logger = require("../logger");

const verificationMail = require("../templates/auth/verificationMail");
const vendorWelcome = require('../templates/auth/vendor.welcomeMail')
const buyerWelcome = require('../templates/auth/buyer.welcomeMail')
const resetPasswordMail = require('../templates/auth/forgetPasswordMail')

const EMAIL_SUBJECTS = {
    VERIFY: "Verify Your CampusTrade Account",
    VENDOR_WELCOME: "Welcome to CampusTrade",
    BUYER_WELCOME: "Welcome to CampusTrade",
    PASSWORD_RESET: "Reset Your CampusTrade Password",
};

class EmailService {
    /**
     * Send a generic email
     */
    async sendEmail({
        to,
        subject,
        html,
        text = "",
        attachments = [],
        cc = [],
        bcc = [],
        replyTo,
    }) {
        if (!to) {
            throw new Error("Recipient email is required.");
        }

        if (!subject) {
            throw new Error("Email subject is required.");
        }

        if (!html) {
            throw new Error("Email HTML content is required.");
        }

        try {
            const info = await transporter.sendMail({
                from: process.env.EMAIL_FROM,
                to,
                cc,
                bcc,
                subject,
                text,
                html,
                attachments,
                replyTo,
            });

            logger.info("Email sent successfully.", {
                messageId: info.messageId,
                recipient: to,
                subject,
            });

            return {
                success: true,
                messageId: info.messageId,
            };
        } catch (error) {
            logger.error("Failed to send email.", {
                recipient: to,
                subject,
                error: error.message,
            });

            throw error;
        }
    }

    /* Send account verification email */
    async sendVerificationEmail({
        email,
        name,
        verificationToken,
        expiresInMinutes = 60,
    }) {
        const verificationUrl =
            `${process.env.frontedURL}/verify-email?token=${verificationToken}`;

        const html = verificationMail({
            name,
            verificationUrl,
            expiresInMinutes,
            appName: process.env.APP_NAME,
            supportEmail: process.env.EMAIL_SUPPORT,
        });

        return this.sendEmail({
            to: email,
            subject: EMAIL_SUBJECTS.VERIFY,
            html,
        });
    }

    /* Send forget password */
    async sendPasswordResetEmail({
        email,
        name,
        resetToken,
        expiresInMinutes = 15,
    }) {
        const resetUrl =
            `${process.env.frontedURL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        const html = resetPasswordMail({
            name,
            resetUrl,
            expiresInMinutes,
            appName: process.env.APP_NAME,
            supportEmail: process.env.EMAIL_SUPPORT,
        });

        return this.sendEmail({
            to: email,
            subject: EMAIL_SUBJECTS.PASSWORD_RESET,
            html,
        });
    }

    /* Send welcome mail to vendor */
    async sendVendorWelcome({
        email,
        name,
    }) {
        const html = vendorWelcome({
            name,
            appName: process.env.APP_NAME,
            supportEmail: process.env.EMAIL_SUPPORT,
        })

        return this.sendEmail({
            to: email,
            subject: EMAIL_SUBJECTS.VENDOR_WELCOME,
            html,
        });
    }

    /* Send welcome mail to buyer */
    async sendBuyerWelcome({
        email,
        name,
    }) {
        const html = buyerWelcome({
            name,
            appName: process.env.APP_NAME,
            supportEmail: process.env.EMAIL_SUPPORT,
        })

        return this.sendEmail({
            to: email,
            subject: EMAIL_SUBJECTS.BUYER_WELCOME,
            html,
        });
    }

}

module.exports = new EmailService();