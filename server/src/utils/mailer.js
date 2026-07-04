import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure local sent_emails directory exists for simulation
const sentEmailsDir = path.resolve(__dirname, '../../sent_emails');
if (!fs.existsSync(sentEmailsDir)) {
  fs.mkdirSync(sentEmailsDir, { recursive: true });
}

export async function sendInviteEmail(toEmail, toName, role, organizationName, inviteLink) {
  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>StayZen Invitation</title>
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background-color: #f4f6f3; color: #1b2724; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 40px auto; background: #ffffff; border: 1px solid #e4e9e5; border-radius: 13px; overflow: hidden; box-shadow: 0 4px 12px rgba(27, 39, 36, 0.05); }
    .header { background: #0b4438; padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; font-family: 'Manrope', Arial, sans-serif; }
    .content { padding: 40px 30px; text-align: center; }
    .content p { font-size: 15px; line-height: 1.6; color: #53605c; margin: 0 0 24px; }
    .btn { display: inline-block; background-color: #0b4438; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 14px; box-shadow: 0 4px 10px rgba(11, 68, 56, 0.15); margin-bottom: 24px; }
    .footer { background: #fafbfa; padding: 20px; text-align: center; font-size: 11px; color: #85908c; border-top: 1px solid #e4e9e5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>StayZen</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${toName}</strong>,</p>
      <p>You have been invited to join the <strong>${organizationName}</strong> workspace on StayZen as a <strong>${role}</strong>.</p>
      <p>Click the button below to accept the invitation and set up your account password:</p>
      <a href="${inviteLink}" class="btn" target="_blank">Accept Invitation</a>
      <p style="font-size: 12px; color: #85908c; margin-top: 20px;">If the button doesn't work, you can copy and paste this link into your browser:<br><span style="word-break: break-all; color: #0b4438;">${inviteLink}</span></p>
    </div>
    <div class="footer">
      This invitation was sent by StayZen PG Management.<br>
      If you did not expect this invitation, please ignore this email.
    </div>
  </div>
</body>
</html>`;

  // Always write locally as an HTML file so developers/users can inspect it directly
  const sanitizedEmail = (toEmail || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
  const localFileName = `invite-${sanitizedEmail}-${Date.now()}.html`;
  const localFilePath = path.join(sentEmailsDir, localFileName);
  fs.writeFileSync(localFilePath, emailHtml);
  console.log(`[SMTP SIMULATION] Invitation HTML written to: ${localFilePath}`);

  const isPlaceholder = !process.env.SMTP_USER ||
    process.env.SMTP_USER.includes('your-email') ||
    !process.env.SMTP_PASS ||
    process.env.SMTP_PASS === 'your-gmail-app-password' ||
    process.env.SMTP_PASS === 'abcdefghijklmnop';

  const hasSmtpConfig = process.env.SMTP_HOST && !isPlaceholder;

  if (hasSmtpConfig) {
    try {
      const isGmail = process.env.SMTP_HOST === 'smtp.gmail.com';
      const transportConfig = isGmail
        ? {
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        }
        : {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        };

      const transporter = nodemailer.createTransport(transportConfig);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"StayZen" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `You've been invited to join ${organizationName} on StayZen`,
        html: emailHtml
      });
      console.log(`[SMTP SUCCESS] Invitation email sent to ${toEmail} successfully.`);
      return { success: true, localFilePath };
    } catch (error) {
      console.error('[SMTP ERROR] Failed to send email via configured SMTP:', error);
      // Fall through to Ethereal simulator if configured SMTP fails
    }
  }

  // Fallback to Ethereal developer sandbox for rich email simulation
  try {
    console.log('[SMTP SIMULATION] Creating Ethereal Test Account...');
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const info = await transporter.sendMail({
      from: '"StayZen" <no-reply@stayzen.com>',
      to: toEmail,
      subject: `[SIMULATED] You've been invited to join ${organizationName} on StayZen`,
      html: emailHtml
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[SMTP SIMULATION] Simulated email successfully sent!`);
    console.log(`[SMTP SIMULATION] Preview URL: ${previewUrl}`);
    return { success: true, previewUrl, localFilePath };
  } catch (err) {
    console.error('[SMTP SIMULATION ERROR] Ethereal simulation failed:', err);
    return { success: false, localFilePath };
  }
}
