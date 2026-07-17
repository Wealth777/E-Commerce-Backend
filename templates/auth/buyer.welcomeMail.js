module.exports = function buyerWelcome(options = {}) {
    const {
        name = '',
        logoUrl = process.env.EMAIL_LOGO,
        appName = process.env.APP_NAME,
        supportEmail = process.env.EMAIL_SUPPORT,
        loginUrl = process.env.BUYER_LOGIN_URL,
    } = options;

    const safeName = name ? `Hi ${name},` : 'Hello,';

    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to ${appName}</title>
        <style>
            /* CLIENT-SAFE RESET & RESPONSIVENESS */
            body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; display: block; }
            table { border-collapse: collapse !important; }
            body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

            /* Interactive Micro-animations */
            .btn-welcome {
                transition: all 0.3s ease-in-out !important;
            }
            .btn-welcome:hover {
                background-color: #059669 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2) !important;
            }
            
            @media only screen and (max-width:600px) {
                .container { width: 100% !important; max-width: 100% !important; padding: 10px !important; }
                .content { padding: 32px 20px 24px 20px !important; }
                .hero-heading { font-size: 24px !important; line-height: 30px !important; }
                .step-table { width: 100% !important; display: block !important; }
                .step-row { display: block !important; margin-bottom: 16px !important; }
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
                                            Discover Campus Trade
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Main Welcome Message -->
                        <tr>
                            <td class="content" style="padding: 44px 48px 32px 48px;">
                                <h1 class="hero-heading" style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 800; line-height: 34px; color: #1e293b; letter-spacing: -0.5px;">
                                    Welcome to ${appName}, ${safeName}!
                                </h1>
                                
                                <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
                                    Your buyer account is officially active. Welcome to a smarter, more dynamic campus marketplace built entirely around your student routine. Get ready to find incredible deals, track verified campus vendors, and save time on every deal.
                                </p>

                                <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 28px 0;" />

                                <!-- Modern Step-by-Step Buyer Guide -->
                                <h3 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">
                                    How to start exploring:
                                </h3>

                                <table class="step-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                                    <!-- Step 1 -->
                                    <tr class="step-row">
                                        <td style="padding: 0 0 20px 0; vertical-align: top;">
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td width="36" style="vertical-align: top;">
                                                        <div style="width: 24px; height: 24px; background-color: #ecfdf5; border-radius: 50%; text-align: center; line-height: 24px; color: #10B981; font-weight: 700; font-size: 13px;">1</div>
                                                    </td>
                                                    <td style="vertical-align: top; padding-left: 12px;">
                                                        <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #1e293b;">Explore Live Campus Deals</h4>
                                                        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">Browse local student listings, tech gear, textbooks, fashion, and essential daily services operating right on your campus campus.</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <!-- Step 2 -->
                                    <tr class="step-row">
                                        <td style="padding: 0 0 20px 0; vertical-align: top;">
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td width="36" style="vertical-align: top;">
                                                        <div style="width: 24px; height: 24px; background-color: #fffbeb; border-radius: 50%; text-align: center; line-height: 24px; color: #F59E0B; font-weight: 700; font-size: 13px;">2</div>
                                                    </td>
                                                    <td style="vertical-align: top; padding-left: 12px;">
                                                        <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #1e293b;">Connect with Verified Vendors</h4>
                                                        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">Tap directly into vendor profiles to review institutional standings, social handles, and access immediate customer chat panels.</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    <!-- Step 3 -->
                                    <tr class="step-row">
                                        <td style="padding: 0; vertical-align: top;">
                                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td width="36" style="vertical-align: top;">
                                                        <div style="width: 24px; height: 24px; background-color: #eff6ff; border-radius: 50%; text-align: center; line-height: 24px; color: #3b82f6; font-weight: 700; font-size: 13px;">3</div>
                                                    </td>
                                                    <td style="vertical-align: top; padding-left: 12px;">
                                                        <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #1e293b;">Trade Safely</h4>
                                                        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">Coordinate item handoffs at public campus landmarks and follow safety protocols to guarantee secure transactions.</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Call to Action Button -->
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 36px 0 16px 0;">
                                    <tr>
                                        <td align="center">
                                            <table role="presentation" class="button-wrapper" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td align="center" class="button-cell" style="border-radius: 12px; background-color: #10B981;">
                                                        <a class="btn-welcome" href="${loginUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; border: 1px solid #10B981; letter-spacing: 0.5px;">
                                                            Start Exploring Items
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- <p style="margin: 24px 0 0 0; color: #475569; font-size: 14px; line-height: 1.5; text-align: center;">
                                    Have questions about secure trades? Read our <a href="#" style="color: #10B981; font-weight: 600; text-decoration: none;">Campus Safety Protocols</a>.
                                </p> -->

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
                                            <a href="mailto:${supportEmail}" style="color: #10B981; text-decoration: none; font-weight: 600;">Contact Support</a>
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
                                You are receiving this transaction transmission because your address was securely registered to a student buyer profile on the ${appName} network hub.
                            </td>
                        </tr>
                    </table>
                    
                </td>
            </tr>
        </table>
    </body>
</html>`;

};
