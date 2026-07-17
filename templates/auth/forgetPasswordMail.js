module.exports = function passwordResetMail(options = {}) {
    const {
        name = '',
        logoUrl = process.env.EMAIL_LOGO,
        appName = process.env.APP_NAME,
        supportEmail = process.env.EMAIL_SUPPORT,
        expiresInMinutes = 60,
        resetUrl = process.env.RESET_URL
    } = options;

    const safeName = name ? `Hi ${name},` : 'Hello,';

    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password • ${appName}</title>
        <style>
            /* CLIENT-SAFE RESET & RESPONSIVENESS */
            body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; display: block; }
            table { border-collapse: collapse !important; }
            body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

            /* Interactive Micro-animations */
            .btn-reset {
                transition: all 0.3s ease-in-out !important;
            }
            .btn-reset:hover {
                background-color: #059669 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2) !important;
            }
            
            @media only screen and (max-width:600px) {
                .container { width: 100% !important; max-width: 100% !important; padding: 10px !important; }
                .content { padding: 32px 20px 24px 20px !important; }
                .hero-heading { font-size: 24px !important; line-height: 30px !important; }
                .button-wrapper { width: 100% !important; }
                .button-cell { display: block !important; width: 100% !important; }
            }
        </style>
    </head>
    <body style="margin:0; padding:0; background-color:#f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; table-layout: fixed;">
            <tr>
                <td align="center" style="padding: 24px 0;">
                    
                    <!-- Main Email Card -->
                    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#ffffff; border: 1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025);">
                        
                        <!-- Premium Signature Gradient Accent Line -->
                        <tr>
                            <td height="4" style="background: linear-gradient(90deg, #10B981 0%, #F59E0B 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
                        </tr>

                        <!-- Professional Header Block -->
                        <tr>
                            <td style="padding: 28px 36px; background-color: #1f2937;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="left" style="vertical-align: middle;">
                                            <img src="${logoUrl}" alt="${appName} Logo" width="140" style="display:block; border:none; outline:none;" />
                                        </td>
                                        <td align="right" style="vertical-align: middle; color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                            Security Desk
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Main Content Area -->
                        <tr>
                            <td class="content" style="padding: 44px 48px 32px 48px;">
                                <h1 class="hero-heading" style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 800; line-height: 32px; color: #1e293b; letter-spacing: -0.5px;">
                                    Reset Your Password
                                </h1>
                                
                                <p style="margin: 0 0 12px 0; color: #475569; font-size: 15px; line-height: 1.6; font-weight: 500;">
                                    Hello ${safeName || 'there'},
                                </p>
                                
                                <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                                    We received a request to reset the password associated with your ${appName} account. If you initiated this request, please click the button below to establish new credentials.
                                </p>

                                <!-- Call to Action Button -->
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                                    <tr>
                                        <td align="center">
                                            <table role="presentation" class="button-wrapper" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td align="center" class="button-cell" style="border-radius: 12px; background-color: #10B981;">
                                                        <a class="btn-reset" href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; border: 1px solid #10B981; letter-spacing: 0.5px;">
                                                            Reset My Password
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Alternate Manual URL Link -->
                                <p style="margin: 28px 0 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">
                                    Alternative recovery vector:
                                </p>
                                <p style="word-break: break-all; margin: 0 0 28px 0; font-size: 13px; line-height: 1.5;">
                                    <a href="${resetUrl}" target="_blank" style="color: #10B981; font-weight: 500; text-decoration: underline;">${resetUrl}</a>
                                </p>

                                <!-- Security Metrics & Expiration Parameters -->
                                <table role="presentation" width="100%" style="background-color: #fffbeb; border: 1px dashed #f59e0b; border-radius: 12px; margin-bottom: 28px;">
                                    <tr>
                                        <td style="padding: 16px;">
                                            <p style="margin: 0 0 6px 0; color: #b45309; font-size: 13px; font-weight: 700;">
                                                🔒 Security Notice & Window
                                            </p>
                                            <p style="margin: 0; color: #78350f; font-size: 12px; line-height: 1.5;">
                                                This recovery credential route is strictly temporary and will expire in <strong style="color: #78350f;">${expiresInMinutes} minutes</strong>. 
                                                <strong>If you did not request this recovery process</strong>, no further actions are necessary. Your current security layout remains safe and unchanged.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

                                <!-- Safety Notice -->
                                <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
                                    <strong>Corporate Safety Protocol:</strong> ${appName} security representatives will never request access credentials or personal authentication details via email correspondence. If you suspect spoofing, reach out directly at <a href="mailto:${supportEmail}" style="color: #10B981; text-decoration: none; font-weight: 600;">${supportEmail}</a>.
                                </p>
                            </td>
                        </tr>

                        <!-- Modern Professional Footer Structure -->
                        <tr>
                            <td style="padding: 24px 48px 36px 48px; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
                                <table role="presentation" width="100%">
                                    <tr>
                                        <td style="font-size: 12px; line-height: 1.5; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                            &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.<br />
                                            Unified Campus Marketplace & Registry.
                                        </td>
                                        <td align="right" style="font-size: 12px; color: #64748b; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                            <a href="mailto:${supportEmail}" style="color: #10B981; text-decoration: none; font-weight: 600;">Contact Desk</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Compliance Sub-Footer Info -->
                    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 600px;">
                        <tr>
                            <td align="center" style="padding: 16px 24px; font-size: 11px; line-height: 1.4; color: #94a3b8;">
                                You are receiving this transaction transmission because a secure recovery sequence was initialized for your registered handle on the ${appName} network.
                            </td>
                        </tr>
                    </table>
                    
                </td>
            </tr>
        </table>
    </body>
</html>`;

};
