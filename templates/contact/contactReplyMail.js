module.exports = function contactResponseMail(options = {}) {
    const {
        name = '',
        logoUrl = process.env.EMAIL_LOGO,
        appName = process.env.APP_NAME,
        supportEmail = process.env.EMAIL_SUPPORT,
        originalSubject = '',
        originalContent = '',
        replyMessage = '',
    } = options;

    const safeName = name ? `Hi ${name},` : 'Hello,';

    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Response from ${appName}</title>

        <style>
            /* CLIENT-SAFE RESET & RESPONSIVENESS */
            body, table, td, a {
                -webkit-text-size-adjust: 100%;
                -ms-text-size-adjust: 100%;
            }

            table, td {
                mso-table-lspace: 0pt;
                mso-table-rspace: 0pt;
            }

            img {
                border: 0;
                height: auto;
                line-height: 100%;
                outline: none;
                text-decoration: none;
                -ms-interpolation-mode: bicubic;
                display: block;
            }

            table {
                border-collapse: collapse !important;
            }

            body {
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
            }

            .btn-support {
                transition: all 0.3s ease-in-out !important;
            }

            .btn-support:hover {
                background-color: #059669 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2) !important;
            }

            @media only screen and (max-width:600px) {
                .container {
                    width: 100% !important;
                    max-width: 100% !important;
                    padding: 10px !important;
                }

                .content {
                    padding: 32px 20px 24px 20px !important;
                }

                .hero-heading {
                    font-size: 24px !important;
                    line-height: 30px !important;
                }

                .footer-content {
                    padding: 24px 20px 32px 20px !important;
                }

                .header-content {
                    padding: 24px 20px !important;
                }

                .header-tagline {
                    display: none !important;
                }

                .button-wrapper {
                    width: 100% !important;
                }

                .button-cell {
                    display: block !important;
                    width: 100% !important;
                }

                .button-link {
                    display: block !important;
                    text-align: center !important;
                }
            }
        </style>
    </head>

    <body style="margin:0; padding:0; background-color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

        <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="background-color:#f8fafc; table-layout:fixed;"
        >
            <tr>
                <td align="center" style="padding:24px 0;">

                    <!-- Main Email Card -->
                    <table
                        role="presentation"
                        class="container"
                        width="600"
                        cellpadding="0"
                        cellspacing="0"
                        style="width:600px; max-width:600px; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.025);"
                    >

                        <!-- Premium Signature Gradient Accent Line -->
                        <tr>
                            <td
                                height="4"
                                style="background:linear-gradient(90deg, #10B981 0%, #F59E0B 100%); line-height:4px; font-size:0px;"
                            >
                                &nbsp;
                            </td>
                        </tr>

                        <!-- Professional Header -->
                        <tr>
                            <td
                                class="header-content"
                                style="padding:28px 36px; background-color:#1f2937;"
                            >
                                <table
                                    role="presentation"
                                    width="100%"
                                    cellpadding="0"
                                    cellspacing="0"
                                >
                                    <tr>
                                        <td style="vertical-align:middle;">
                                            <img
                                                src="${logoUrl}"
                                                alt="${appName} Logo"
                                                width="140"
                                                style="display:block; border:none; outline:none;"
                                            />
                                        </td>

                                        <td
                                            class="header-tagline"
                                            align="right"
                                            style="vertical-align:middle; color:#9ca3af; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
                                        >
                                            Support Response
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Main Content -->
                        <tr>
                            <td
                                class="content"
                                style="padding:44px 48px 32px 48px;"
                            >

                                <h1
                                    class="hero-heading"
                                    style="margin:0 0 16px 0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:28px; font-weight:800; line-height:34px; color:#1e293b; letter-spacing:-0.5px;"
                                >
                                    We've Responded to Your Message
                                </h1>

                                <p
                                    style="margin:0 0 24px 0; color:#475569; font-size:15px; line-height:1.6;"
                                >
                                    ${safeName}
                                </p>

                                <p
                                    style="margin:0 0 24px 0; color:#475569; font-size:15px; line-height:1.6;"
                                >
                                    Thank you for reaching out to ${appName}. Our team has reviewed your message and we're getting back to you below.
                                </p>

                                <!-- Original Subject -->
                                <table
                                    role="presentation"
                                    width="100%"
                                    cellpadding="0"
                                    cellspacing="0"
                                    style="margin:0 0 28px 0;"
                                >
                                    <tr>
                                        <td
                                            style="padding:16px 18px; background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:10px;"
                                        >
                                            <p
                                                style="margin:0 0 6px 0; color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;"
                                            >
                                                Your Message Subject
                                            </p>

                                            <p
                                                style="margin:0; color:#1e293b; font-size:15px; font-weight:700; line-height:1.5;"
                                            >
                                                ${originalSubject}
                                            </p>
                                            <p
                                                style="margin:0 0 6px 0; color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;"
                                            >
                                                Your Message Content
                                            </p>

                                            <p
                                                style="margin:0; color:#1e293b; font-size:15px; font-weight:700; line-height:1.5;"
                                            >
                                                ${originalContent}
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <hr
                                    style="border:none; border-top:1px solid #f1f5f9; margin:28px 0;"
                                />

                                <!-- Response Heading -->
                                <h3
                                    style="margin:0 0 14px 0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:14px; font-weight:700; text-transform:uppercase; color:#64748b; letter-spacing:1px;"
                                >
                                    Our Response
                                </h3>

                                <!-- Response Box -->
                                <table
                                    role="presentation"
                                    width="100%"
                                    cellpadding="0"
                                    cellspacing="0"
                                    style="margin-bottom:28px;"
                                >
                                    <tr>
                                        <td
                                            style="padding:20px; background-color:#ecfdf5; border-left:4px solid #10B981; border-radius:8px;"
                                        >
                                            <p
                                                style="margin:0; color:#334155; font-size:15px; line-height:1.7; white-space:pre-line;"
                                            >
                                                ${replyMessage}
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <p
                                    style="margin:0 0 24px 0; color:#475569; font-size:14px; line-height:1.6;"
                                >
                                    If you have any additional questions or need further assistance, you can reach out to our support team.
                                </p>

                                <!-- Support Button -->
                                <table
                                    role="presentation"
                                    width="100%"
                                    cellpadding="0"
                                    cellspacing="0"
                                    style="margin:32px 0 16px 0;"
                                >
                                    <tr>
                                        <td align="center">

                                            <table
                                                role="presentation"
                                                class="button-wrapper"
                                                cellpadding="0"
                                                cellspacing="0"
                                            >
                                                <tr>
                                                    <td
                                                        align="center"
                                                        class="button-cell"
                                                        style="border-radius:12px; background-color:#10B981;"
                                                    >
                                                        <a
                                                            class="btn-support button-link"
                                                            href="mailto:${supportEmail}"
                                                            target="_blank"
                                                            style="display:inline-block; padding:16px 36px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:12px; border:1px solid #10B981; letter-spacing:0.5px;"
                                                        >
                                                            Contact Support
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>

                                        </td>
                                    </tr>
                                </table>

                                <p
                                    style="margin:24px 0 0 0; color:#64748b; font-size:13px; line-height:1.5; text-align:center;"
                                >
                                    We're here to help make your CampusTrade experience better.
                                </p>

                            </td>
                        </tr>

                        <!-- Professional Footer -->
                        <tr>
                            <td
                                class="footer-content"
                                style="padding:24px 48px 36px 48px; background-color:#f8fafc; border-top:1px solid #f1f5f9;"
                            >
                                <table
                                    role="presentation"
                                    width="100%"
                                >
                                    <tr>

                                        <td
                                            style="font-size:12px; line-height:1.5; color:#64748b; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
                                        >
                                            &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.<br />
                                            Unified Campus Marketplace & Registry.
                                        </td>

                                        <td
                                            align="right"
                                            style="font-size:12px; color:#64748b; vertical-align:top; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
                                        >
                                            <a
                                                href="mailto:${supportEmail}"
                                                style="color:#10B981; text-decoration:none; font-weight:600;"
                                            >
                                                Contact Support
                                            </a>
                                        </td>

                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>

                    <!-- Compliance Sub-Footer -->
                    <table
                        role="presentation"
                        width="600"
                        cellpadding="0"
                        cellspacing="0"
                        style="max-width:600px; width:600px;"
                    >
                        <tr>
                            <td
                                align="center"
                                style="padding:16px 24px; font-size:11px; line-height:1.4; color:#94a3b8;"
                            >
                                You are receiving this email because you contacted ${appName} through our official contact channel.
                            </td>
                        </tr>
                    </table>

                </td>
            </tr>
        </table>

    </body>
</html>`;
};