import nodemailer from 'nodemailer';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user,
        pass,
      },
    });
  }
  return null;
}

interface EmailTemplateOptions {
  title: string;
  badgeText?: string;
  badgeIcon?: string;
  heading: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}

function buildThemeEmailHtml(options: EmailTemplateOptions): string {
  const { title, badgeText = 'TASKFLOW', badgeIcon = '⚡', heading, bodyHtml, ctaText, ctaUrl, footerNote } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f9fafb;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: #818cf8;
      text-decoration: none;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f9fafb;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #161e2e; border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(79, 70, 229, 0.05) 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.08); text-align: center;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); width: 44px; height: 44px; border-radius: 12px; text-align: center; vertical-align: middle; font-size: 22px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
                    ${badgeIcon}
                  </td>
                  <td style="padding-left: 12px; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff; text-align: left;">
                    Task<span style="color: #818cf8;">Flow</span>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #818cf8; background-color: rgba(99, 102, 241, 0.15); display: inline-block; padding: 4px 12px; border-radius: 9999px; border: 1px solid rgba(99, 102, 241, 0.3);">
                ${badgeText}
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3; text-align: center;">
                ${heading}
              </h1>
              
              <div style="font-size: 15px; line-height: 1.6; color: #d1d5db; text-align: left;">
                ${bodyHtml}
              </div>

              ${
                ctaText && ctaUrl
                  ? `
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${ctaUrl}" target="_blank" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4); transition: all 0.2s ease;">
                  ${ctaText}
                </a>
              </div>

              <!-- Fallback Link -->
              <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 14px 16px; margin-top: 24px; text-align: left; word-break: break-all;">
                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #9ca3af;">
                  Button not working? Copy and paste this URL into your browser:
                </p>
                <a href="${ctaUrl}" target="_blank" style="font-size: 13px; color: #818cf8; text-decoration: underline;">
                  ${ctaUrl}
                </a>
              </div>
              `
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; font-size: 12px; color: #6b7280; line-height: 1.5;">
              ${footerNote ? `<p style="margin: 0 0 10px 0; color: #9ca3af;">${footerNote}</p>` : ''}
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} TaskFlow Inc. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendVerificationEmail(toEmail: string, name: string, token: string) {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  const subject = 'TaskFlow - Verify Your Email Address';
  const html = buildThemeEmailHtml({
    title: subject,
    badgeIcon: '✉️',
    badgeText: 'EMAIL VERIFICATION',
    heading: `Welcome to TaskFlow, ${name}! 👋`,
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">Hi <strong style="color: #ffffff;">${name}</strong>,</p>
      <p style="margin: 0;">Thank you for registering with TaskFlow. Please verify your email address to activate your account and access your workspace.</p>
    `,
    ctaText: 'Verify Email Address',
    ctaUrl: verifyUrl,
    footerNote: 'This verification link will expire in 24 hours. If you did not create a TaskFlow account, please ignore this email.',
  });

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || `"TaskFlow" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject,
        html,
      });
      console.log(`✉️ Verification email sent to ${toEmail}`);
      return;
    } catch (err) {
      console.error(`⚠️ Failed to send verification email to ${toEmail}:`, err);
    }
  }

  console.log(`\n======================================================`);
  console.log(`✉️ [MOCK MAILER] VERIFICATION EMAIL to: ${toEmail}`);
  console.log(`👉 VERIFY LINK: ${verifyUrl}`);
  console.log(`======================================================\n`);
}

export async function sendPasswordResetEmail(toEmail: string, token: string) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  const subject = 'TaskFlow - Reset Your Password';
  const html = buildThemeEmailHtml({
    title: subject,
    badgeIcon: '🔒',
    badgeText: 'SECURITY UPDATE',
    heading: 'Reset Your Password',
    bodyHtml: `
      <p style="margin: 0;">We received a request to reset your password for your TaskFlow account. Click the button below to set a new secure password:</p>
    `,
    ctaText: 'Reset Password',
    ctaUrl: resetUrl,
    footerNote: 'This link will expire in 1 hour. If you did not request a password reset, please ignore this email.',
  });

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || `"TaskFlow" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject,
        html,
      });
      console.log(`✉️ Password reset email sent to ${toEmail}`);
      return;
    } catch (err) {
      console.error(`⚠️ Failed to send password reset email to ${toEmail}:`, err);
    }
  }

  console.log(`\n======================================================`);
  console.log(`✉️ [MOCK MAILER] PASSWORD RESET EMAIL to: ${toEmail}`);
  console.log(`👉 RESET LINK: ${resetUrl}`);
  console.log(`======================================================\n`);
}

export async function sendProjectInviteEmail(
  toEmail: string,
  inviterName: string,
  projectName: string,
  token: string
) {
  const inviteUrl = `${FRONTEND_URL}/invitations/${token}`;
  const subject = `TaskFlow - ${inviterName} invited you to join "${projectName}"`;
  const html = buildThemeEmailHtml({
    title: subject,
    badgeIcon: '🚀',
    badgeText: 'PROJECT INVITATION',
    heading: `You've been invited to join a project!`,
    bodyHtml: `
      <p style="margin: 0 0 16px 0;"><strong style="color: #ffffff;">${inviterName}</strong> has invited you to collaborate on TaskFlow.</p>
      <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 18px; margin: 16px 0; text-align: center;">
        <span style="font-size: 12px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 6px;">PROJECT NAME</span>
        <span style="font-size: 20px; font-weight: 800; color: #ffffff;">${projectName}</span>
      </div>
      <p style="margin: 0;">Click the button below to accept or decline this invitation and start collaborating with your team.</p>
    `,
    ctaText: 'View Invitation',
    ctaUrl: inviteUrl,
    footerNote: 'This invitation will expire in 7 days.',
  });

  const transporter = getTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || `"TaskFlow" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject,
        html,
      });
      console.log(`✉️ Project invitation email sent to ${toEmail}`);
      return;
    } catch (err) {
      console.error(`⚠️ Failed to send project invitation email to ${toEmail}:`, err);
    }
  }

  console.log(`\n======================================================`);
  console.log(`✉️ [MOCK MAILER] PROJECT INVITE EMAIL to: ${toEmail}`);
  console.log(`👉 INVITE LINK: ${inviteUrl}`);
  console.log(`======================================================\n`);
}

