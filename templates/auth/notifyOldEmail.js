module.exports = function emailChangedNotification(options = {}) {
    const {
        name = "",
        oldEmail = "",
        newEmail = "",
        browser = "Unknown Browser",
        os = "Unknown OS",
        device = "Unknown Device",
        location = "Unknown Location",
        changedAt = new Date(),
        logoUrl = process.env.EMAIL_LOGO,
        appName = process.env.APP_NAME || "CampusTrade",
        supportEmail = process.env.EMAIL_SUPPORT,
        recoveryUrl = "#",
    } = options;

    const safeName = name ? `Hi ${name},` : 'Hello,';

    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${appName} • Security Alert: Email Address Updated</title>
        <style>
            /* CLIENT-SAFE RESET & RESPONSIVENESS */
            body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; display: block; }
            table { border-collapse: collapse !important; }
            body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

            /* Interactive Micro-animations for Supporting Clients */
            .btn-lock {
                transition: all 0.3s ease-in-out !important;
            }
            .btn-lock:hover {
                background-color: #be123c !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(225, 29, 72, 0.2) !important;
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
                        
                        <!-- Top Crimson Alert Signature Gradient Bar to indicate security notice -->
                        <tr>
                            <td height="4" style="background: linear-gradient(90deg, #f43f5e 0%, #e11d48 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
                        </tr>

                        <!-- Classic Premium Header -->
                        <tr>
                            <td style="padding: 28px 36px; background-color: #1f2937;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="left" style="vertical-align: middle;">
                                            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                                <tr>
                                                    <td>
                                                        <img src=${logoUrl} alt="${appName} Logo" width="140" style="display:block; border:none; outline:none;" />
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                        <td align="right" style="vertical-align: middle; color: #f43f5e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                            Security Operations
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Main Content Body -->
                        <tr>
                            <td class="content" style="padding: 44px 48px 32px 48px;">
                                <h1 class="hero-heading" style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 800; line-height: 32px; color: #1e293b; letter-spacing: -0.5px;">
                                    Security Update: Email Changed
                                </h1>
                                
                                <p style="margin: 0 0 12px 0; color: #475569; font-size: 15px; line-height: 1.6; font-weight: 500;">
                                    ${safeName}
                                </p>
                                
                                <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                                    This notification confirms that the primary email address for your <strong>${appName}</strong> account was recently changed from <span style="color: #64748b; font-weight: 500; text-decoration: line-through;">${oldEmail || 'this address'}</span> to <strong style="color: #1e293b;">${newEmail}</strong>.
                                </p>

                                <!-- Audit Metadata Grid -->
                                <table role="presentation" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 24px 0; font-size: 13px; color: #475569;">
                                    <tr>
                                        <td style="padding: 16px;">
                                            <table role="presentation" width="100%">
                                                <tr>
                                                    <td style="padding-bottom: 6px; color: #64748b; width: 120px;"><strong>Application:</strong></td>
                                                    <td style="padding-bottom: 6px; color: #1e293b;">${appName} Registry</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding-bottom: 6px; color: #64748b;"><strong>New Route:</strong></td>
                                                    <td style="padding-bottom: 6px; color: #1e293b;">${newEmail}</td>
                                                </tr>
                                                <tr>
                                                    <td style="color: #64748b;"><strong>Status Event:</strong></td>
                                                    <td style="color: #e11d48; font-weight: 600;">Completed</td>
                                                </tr>
                                                <tr>
                                                    <td><strong>New Email:</strong></td>
                                                    <td>${newEmail}</td>
                                                </tr>

                                                <tr>
                                                    <td><strong>Date:</strong></td>
                                                    <td>${new Date(changedAt).toLocaleString()}</td>
                                                </tr>

                                                <tr>
                                                    <td><strong>Device:</strong></td>
                                                    <td>${device}</td>
                                                </tr>

                                                <tr>
                                                    <td><strong>Browser:</strong></td>
                                                    <td>${browser}</td>
                                                </tr>

                                                <tr>
                                                    <td><strong>Operating System:</strong></td>
                                                    <td>${os}</td>
                                                </tr>

                                                <tr>
                                                    <td><strong>Approximate Location:</strong></td>
                                                    <td>${location}</td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Unauthorized Action Section -->
                                <div style="margin: 32px 0; border-left: 4px solid #e11d48; padding-left: 16px;">
                                    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #1e293b;">
                                        If This Wasn't You:
                                    </h3>
                                    <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                                        Your account security may be compromised. Take immediate protective action by locking your profile configuration using the safety link below:
                                    </p>

                                    <!-- Call to Action Lock Button -->
                                    <table role="presentation" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td align="center" class="button-cell" style="border-radius: 12px; background-color: #e11d48;">
                                                <a class="btn-lock" href="${recoveryUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; border: 1px solid #e11d48; letter-spacing: 0.5px;">
                                                    Secure My Account
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />

                                <!-- Safety Footnote -->
                                <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
                                    <strong>Automated Security Broadcast:</strong> You are receiving this transmission at your former email destination for protective verification continuity. Please do not reply directly to this message. For escalations, message <a href="mailto:${supportEmail}" style="color: #e11d48; text-decoration: none; font-weight: 600;">${supportEmail}</a>.
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
                                            Unified Campus Marketplace Operations.
                                        </td>
                                        <td align="right" style="font-size: 12px; color: #64748b; vertical-align: top; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                            <a href="mailto:${supportEmail}" style="color: #64748b; text-decoration: underline; font-weight: 500;">Support Desk</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    
                </td>
            </tr>
        </table>
    </body>
</html>`;
};