const { resend } = require("../config/email");
const logger = require("../logger");

const verificationMail = require("../templates/auth/verificationMail");
const verifyChangeEmail = require("../templates/auth/verifyChangeEmail");
const notiifyChangeEmail = require("../templates/auth/notifyOldEmail");
const vendorWelcome = require('../templates/auth/vendor.welcomeMail')
const buyerWelcome = require('../templates/auth/buyer.welcomeMail')
const resetPasswordMail = require('../templates/auth/forgetPasswordMail')

const securityRecoveryStartedMail = require('../templates/Security/sendSecurityRecoveryStarted')

const EMAIL_SUBJECTS = {
    VERIFY: "Verify Your CampusTrade Account",
    VERIFY_EMAIL_CHANGE: "Confirm Your New Email Address",
    NOTIFY_EMAIL_CHANGE: "Your CampusTrade email was changed",
    VENDOR_WELCOME: "Welcome to CampusTrade",
    BUYER_WELCOME: "Welcome to CampusTrade",
    PASSWORD_RESET: "Reset Your CampusTrade Password",
    SECURITY_RECOVERY_STARTED: "Your CampusTrade account has been secured",
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
            const { data, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM,
                to,
                cc: cc.length > 0 ? cc : undefined,
                bcc: bcc.length > 0 ? bcc : undefined,
                reply_to: replyTo || undefined,
                subject,
                text: text || undefined,
                html,
                attachments: attachments.length > 0 ? attachments : undefined,
            });

            if (error) {
                throw new Error(error.message);
            }

            logger.info("Email sent successfully.", {
                messageId: data?.id,
                recipient: to,
                subject,
            });

            return {
                success: true,
                messageId: data?.id,
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

    /* Send change email verification */
    async sendChangeEmailVerification({
        email,
        newEmail,
        name,
        verificationToken,
        expiresInMinutes = 60,
    }) {
        const verificationUrl =
            `${process.env.frontedURL}/verify-change-email?token=${verificationToken}`;

        const html = verifyChangeEmail({
            name,
            newEmail,
            verificationUrl,
            expiresInMinutes,
            appName: process.env.APP_NAME,
            supportEmail: process.env.EMAIL_SUPPORT,
        });

        return this.sendEmail({
            to: email,
            subject: EMAIL_SUBJECTS.VERIFY_EMAIL_CHANGE,
            html,
        });
    }

    /* Send change email Notification */
    async sendChangeEmailNotification({
        email,
        oldEmail,
        newEmail,
        name,
        verificationToken,
        browser,
        os,
        device,
        location,
        changedAt,
    }) {
        const recoveryUrl =
            `${process.env.frontedURL}/security/unauthorized-email-change?token=${verificationToken}`;

        const html = notiifyChangeEmail({
            name,
            oldEmail,
            newEmail,
            recoveryUrl,
            appName: process.env.APP_NAME,
            supportEmail: process.env.EMAIL_SUPPORT,
            browser,
            os,
            device,
            location,
            changedAt
        });

        return this.sendEmail({
            to: email,
            subject: EMAIL_SUBJECTS.NOTIFY_EMAIL_CHANGE,
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




    /* SECURITY MAILS */

    /* Send Security Recovery Started */
    async sendSecurityRecoveryStarted({
        email,
        name,
        recoveryUrl,
        ipAddress,
        deviceInfo,
    }) {
        const html = securityRecoveryStartedMail({
            name,
            recoveryUrl,
            ipAddress,
            deviceInfo,
            appName: process.env.APP_NAME,
            supportEmail: process.env.EMAIL_SUPPORT,
            logoUrl: process.env.EMAIL_LOGO,
        });

        return this.sendEmail({
            to: email,
            subject: EMAIL_SUBJECTS.SECURITY_RECOVERY_STARTED,
            html,
        });
    }

}

module.exports = new EmailService();