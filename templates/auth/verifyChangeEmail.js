module.exports = function verifyChangeEmail(options = {}) {
    const {
        name = '',
        newEmail = '',
        verificationUrl = '#',
        logoUrl = process.env.EMAIL_LOGO,
        appName = process.env.APP_NAME,
        expiresInMinutes = 60,
        supportEmail = process.env.EMAIL_SUPPORT,
    } = options;

    const safeName = name ? `Hi ${name},` : 'Hello,';
    
    // Sub-text dynamic segment if the new target email parameter exists
    const targetEmailContext = newEmail 
        ? ` We received a request to update the primary email address for your account to <strong style="color: #1e293b;">${newEmail}</strong>.`
        : ' We received a request to change the primary email address associated with your account.';

    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${appName} • Confirm Email Change</title>
        <style>
            /* CLIENT-SAFE RESET & RESPONSIVENESS */
            body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; display: block; }
            table { border-collapse: collapse !important; }
            body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

            /* Interactive Micro-animations for Supporting Clients */
            .btn-verify {
                transition: all 0.3s ease-in-out !important;
            }
            .btn-verify:hover {
                background-color: #059669 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2) !important;
            }
            
            @media only screen and (max-width:600px) {
                .container { width: 100% !important; max-width: 100% !important; padding: 10px !important; }
                .content { padding: 24px 20px !important; }
                .hero-heading { font-size: 22px !important; line-height: 28px !important; }
                .button-wrapper { width: 100% !important; }
                .button-cell { display: block !important; width: 100% !important; }
            }
        </style>
    </head>
    <body style="margin:0; padding:0; background-color:#f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; table-layout: fixed;">
            <tr>
                <td align="center" style="padding: 24px 0;">
                    
                    <!-- Main Email Wrapper Card -->
                    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#ffffff; border: 1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.025);">
                        
                        <!-- Top Accent Signature Gradient Bar -->
                        <tr>
                            <td height="4" style="background: linear-gradient(90deg, #10B981 0%, #F59E0B 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
                        </tr>

                        <!-- Classic Premium Header -->
                        <tr>
                            <td style="padding: 28px 36px; background-color: #1f2937;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="left" style="vertical-align: middle;">
                                            <!-- Application Brand Identity Frame -->
                                            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td>
                                                        <img src=${logoUrl} alt="${appName} Logo" width="140" style="display:block; border:none; outline:none;" />
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                        <td align="right" style="vertical-align: middle; color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                            Security Desk
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Professional Main Content Body -->
                        <tr>
                            <td class="content" style="padding: 44px 48px 32px 48px;">
                                <h1 class="hero-heading" style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 800; line-height: 32px; color: #1e293b; letter-spacing: -0.5px;">
                                    Confirm Email Update
                               </h1>
                                
                                <p style="margin: 0 0 12px 0; color: #475569; font-size: 15px; line-height: 1.6; font-weight: 500;">
                                    ${safeName}
                                </p>
                                
                                <p style="margin: 0 0 28px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                                    ${targetEmailContext} To maintain core profile synchronization parameters and verify your access authority, please finalize authorization via the link below.
                                </p>

                                <!-- Call to Action Button Container -->
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                                    <tr>
                                        <td align="center">
                                            <table role="presentation" class="button-wrapper" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td align="center" class="button-cell" style="border-radius: 12px; background-color: #10B981;">
                                                        <a class="btn-verify" href="${verificationUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; border: 1px solid #10B981; letter-spacing: 0.5px;">
                                                            Confirm Email Change
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Alternate Manual URL Link -->
                                <p style="margin: 28px 0 6px 0; color: #64748b; font-size: 13px; font-weight: 600;">
                                    Alternative confirmation vector:
                                </p>
                                <p style="word-break: break-all; margin: 0 0 28px 0; font-size: 13px; line-height: 1.5;">
                                    <a href="${verificationUrl}" target="_blank" style="color: #10B981; font-weight: 500; text-decoration: underline;">${verificationUrl}</a>
                                </p>

                                <!-- Security Metrics & Expiration Parameters -->
                                <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; margin-bottom: 28px;">
                                    <tr>
                                        <td style="padding: 16px;">
                                            <p style="margin: 0 0 6px 0; color: #334155; font-size: 13px; font-weight: 700;">
                                                ⚠️ Expiration Parameter Window
                                            </p>
                                            <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                                                For identity verification protection, this secure session link will expire in <strong style="color: #334155;">${expiresInMinutes} minutes</strong>. No alterations will take effect without dynamic authorization.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />

                                <!-- Safety Notice -->
                                <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
                                    <strong>Corporate Safety Protocol:</strong> If you did not request this email swap sequence, please change your application password immediately to secure your directory profile and report the event to <a href="mailto:${supportEmail}" style="color: #10B981; text-decoration: none; font-weight: 600;">${supportEmail}</a>.
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
                                You received this secure transmission because an active request was initiated to update account data inside the ${appName} network directory.
                            </td>
                        </tr>
                    </table>
                    
                </td>
            </tr>
        </table>
    </body>
</html>`;
};