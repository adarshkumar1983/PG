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

export async function sendReceiptEmail(toEmail, toName, details) {
  const { amount, purpose, invoiceMonth, method, referenceNumber, paidAt, organizationName } = details;
  const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  const formattedDate = new Date(paidAt || new Date()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const paymentMethodLabel = method ? method.toUpperCase().replace('_', ' ') : 'OFFLINE';

  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt Confirmed</title>
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background-color: #f4f6f3; color: #1b2724; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 40px auto; background: #ffffff; border: 1px solid #e4e9e5; border-radius: 13px; overflow: hidden; box-shadow: 0 4px 12px rgba(27, 39, 36, 0.05); }
    .header { background: #0b4438; padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; font-family: 'Manrope', Arial, sans-serif; }
    .content { padding: 40px 30px; }
    .content p { font-size: 15px; line-height: 1.6; color: #53605c; margin: 0 0 24px; }
    .receipt-box { background-color: #fafbfa; border: 1px solid #e4e9e5; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .receipt-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .receipt-row:last-child { margin-bottom: 0; border-top: 1px solid #e4e9e5; padding-top: 12px; font-weight: bold; }
    .label { color: #85908c; }
    .value { color: #1b2724; text-align: right; }
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
      <p>Your reported offline payment has been verified and marked as <strong>PAID</strong> by the PG management of <strong>${organizationName}</strong>.</p>
      
      <div class="receipt-box">
        <h3 style="margin: 0 0 16px; font-size: 15px; color: #0b4438;">Payment Receipt Details</h3>
        <div class="receipt-row">
          <span class="label">Invoice Purpose</span>
          <span class="value" style="text-transform: capitalize;">${purpose || 'Rent'}</span>
        </div>
        <div class="receipt-row">
          <span class="label">Invoice Month</span>
          <span class="value">${invoiceMonth}</span>
        </div>
        <div class="receipt-row">
          <span class="label">Payment Method</span>
          <span class="value">${paymentMethodLabel}</span>
        </div>
        <div class="receipt-row">
          <span class="label">Reference UTR / ID</span>
          <span class="value" style="font-family: monospace;">${referenceNumber || 'N/A'}</span>
        </div>
        <div class="receipt-row">
          <span class="label">Date Paid</span>
          <span class="value">${formattedDate}</span>
        </div>
        <div class="receipt-row" style="font-size: 16px;">
          <span class="label" style="color: #0b4438;">Amount Paid</span>
          <span class="value" style="color: #10b981;">${formattedAmount}</span>
        </div>
      </div>
      
      <p style="text-align: center; font-size: 14px; color: #53605c;">Thank you for your prompt payment!</p>
    </div>
    <div class="footer">
      This is an automated confirmation email from StayZen.<br>
      Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>`;

  // Always write locally
  const sanitizedEmail = (toEmail || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
  const localFileName = `receipt-${sanitizedEmail}-${Date.now()}.html`;
  const localFilePath = path.join(sentEmailsDir, localFileName);
  fs.writeFileSync(localFilePath, emailHtml);
  console.log(`[SMTP SIMULATION] Receipt HTML written to: ${localFilePath}`);

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
        subject: `Payment Receipt: ${formattedAmount} for ${invoiceMonth} ${purpose || 'Rent'}`,
        html: emailHtml
      });
      console.log(`[SMTP SUCCESS] Receipt email sent to ${toEmail} successfully.`);
      return { success: true, localFilePath };
    } catch (error) {
      console.error('[SMTP ERROR] Failed to send receipt email via SMTP:', error);
    }
  }

  // Fallback to Ethereal
  try {
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
      subject: `[SIMULATED] Payment Receipt: ${formattedAmount} for ${invoiceMonth} ${purpose || 'Rent'}`,
      html: emailHtml
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[SMTP SIMULATION] Simulated receipt sent! Preview URL: ${previewUrl}`);
    return { success: true, previewUrl, localFilePath };
  } catch (err) {
    console.error('[SMTP SIMULATION ERROR] Ethereal receipt failed:', err);
    return { success: false, localFilePath };
  }
}

export async function sendResetPasswordEmail(toEmail, toName, resetLink) {
  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your StayZen Password</title>
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
      <p>We received a request to reset the password for your StayZen account.</p>
      <p>Click the button below to set a new password. This link is valid for 1 hour:</p>
      <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>
      <p style="font-size: 12px; color: #85908c; margin-top: 20px;">If the button doesn't work, you can copy and paste this link into your browser:<br><span style="word-break: break-all; color: #0b4438;">${resetLink}</span></p>
    </div>
    <div class="footer">
      This email was sent by StayZen PG Management.<br>
      If you did not request a password reset, please ignore this email.
    </div>
  </div>
</body>
</html>`;

  // Always write locally as an HTML file so developers/users can inspect it directly
  const sanitizedEmail = (toEmail || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
  const localFileName = `reset-password-${sanitizedEmail}-${Date.now()}.html`;
  const localFilePath = path.join(sentEmailsDir, localFileName);
  fs.writeFileSync(localFilePath, emailHtml);
  console.log(`[SMTP SIMULATION] Password reset HTML written to: ${localFilePath}`);

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
        subject: 'Reset your StayZen password',
        html: emailHtml
      });
      console.log(`[SMTP SUCCESS] Reset password email sent to ${toEmail} successfully.`);
      return { success: true, localFilePath };
    } catch (error) {
      console.error('[SMTP ERROR] Failed to send reset password email via configured SMTP:', error);
    }
  }

  // Fallback to Ethereal developer sandbox for rich email simulation
  try {
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
      subject: `[SIMULATED] Reset your StayZen password`,
      html: emailHtml
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[SMTP SIMULATION] Simulated reset password email successfully sent! Preview URL: ${previewUrl}`);
    return { success: true, previewUrl, localFilePath };
  } catch (err) {
    console.error('[SMTP SIMULATION ERROR] Ethereal reset password simulation failed:', err);
    return { success: false, localFilePath };
  }
}

