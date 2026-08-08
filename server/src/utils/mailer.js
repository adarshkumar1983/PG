import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure local sent_emails directory exists for simulation
const sentEmailsDir = path.resolve(__dirname, '../../sent_emails');
if (!fs.existsSync(sentEmailsDir)) {
  fs.mkdirSync(sentEmailsDir, { recursive: true });
}

/**
 * Unified email sending helper
 */
async function sendMailHelper(toEmail, subject, emailHtml, localFileNamePrefix) {
  // 1. Unconditionally write locally as an HTML file so users can inspect it
  const sanitizedEmail = (toEmail || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
  const localFileName = `${localFileNamePrefix}-${sanitizedEmail}-${Date.now()}.html`;
  const localFilePath = path.join(sentEmailsDir, localFileName);
  fs.writeFileSync(localFilePath, emailHtml);
  console.log(`[SMTP SIMULATION] Email HTML written to: ${localFilePath}`);

  // 2. Try HTTP API (Resend) - Bypass SMTP blocks on Render completely
  if (process.env.RESEND_API_KEY) {
    try {
      console.log('[RESEND API] Attempting to send email via Resend HTTP API...');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: process.env.SMTP_FROM || 'onboarding@resend.dev',
          to: toEmail,
          subject: subject,
          html: emailHtml
        })
      });
      const result = await response.json();
      if (response.ok) {
        console.log(`[RESEND SUCCESS] Email sent to ${toEmail} successfully. ID: ${result.id}`);
        return { success: true, localFilePath };
      }
      console.error('[RESEND ERROR] Failed to send email via Resend API:', result);
    } catch (error) {
      console.error('[RESEND ERROR] Connection error to Resend API:', error);
    }
  }

  // 3. Try standard SMTP if configured
  const isPlaceholder = !process.env.SMTP_USER ||
    process.env.SMTP_USER.includes('your-email') ||
    !process.env.SMTP_PASS ||
    process.env.SMTP_PASS === 'your-gmail-app-password' ||
    process.env.SMTP_PASS === 'abcdefghijklmnop';

  const hasSmtpConfig = process.env.SMTP_HOST && !isPlaceholder;

  if (hasSmtpConfig) {
    try {
      console.log(`[SMTP] Attempting to connect to ${process.env.SMTP_HOST}...`);
      const transportConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        family: 4, // Force IPv4
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
        lookup: (hostname, options, callback) => {
          options.family = 4;
          return dns.lookup(hostname, options, callback);
        },
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      };

      const transporter = nodemailer.createTransport(transportConfig);
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"StayZen" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: subject,
        html: emailHtml
      });
      console.log(`[SMTP SUCCESS] Email sent to ${toEmail} successfully.`);
      return { success: true, localFilePath };
    } catch (error) {
      console.error('[SMTP ERROR] Failed to send email via SMTP:', error.message);
    }
  }

  // 4. Fallback to Ethereal Sandbox if SMTP fails or is unconfigured
  try {
    console.log('[SMTP SIMULATION] Creating Ethereal Test Account...');
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      family: 4,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      lookup: (hostname, options, callback) => {
        options.family = 4;
        return dns.lookup(hostname, options, callback);
      },
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const info = await transporter.sendMail({
      from: '"StayZen" <no-reply@stayzen.com>',
      to: toEmail,
      subject: `[SIMULATED] ${subject}`,
      html: emailHtml
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[SMTP SIMULATION] Simulated email successfully sent!`);
    console.log(`[SMTP SIMULATION] Preview URL: ${previewUrl}`);
    return { success: true, previewUrl, localFilePath };
  } catch (err) {
    console.error('[SMTP SIMULATION ERROR] Ethereal simulation failed:', err.message);
    return { success: false, localFilePath };
  }
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

  return await sendMailHelper(
    toEmail,
    `You've been invited to join ${organizationName} on StayZen`,
    emailHtml,
    'invite'
  );
}

export async function sendReceiptEmail(toEmail, toName, paymentAmount, purpose, invoiceMonth, organizationName, refNo) {
  const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paymentAmount);
  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt</title>
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background-color: #f4f6f3; color: #1b2724; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 40px auto; background: #ffffff; border: 1px solid #e4e9e5; border-radius: 13px; overflow: hidden; box-shadow: 0 4px 12px rgba(27, 39, 36, 0.05); }
    .header { background: #0b4438; padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; font-family: 'Manrope', Arial, sans-serif; }
    .content { padding: 40px 30px; }
    .content h2 { color: #0b4438; font-size: 20px; font-weight: 700; margin: 0 0 20px 0; text-align: center; }
    .content p { font-size: 15px; line-height: 1.6; color: #53605c; margin: 0 0 24px; text-align: center; }
    .receipt-details { background-color: #fafbfa; border: 1px solid #e4e9e5; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .detail-row:last-child { margin-bottom: 0; border-top: 1px solid #e4e9e5; padding-top: 12px; margin-top: 12px; font-weight: 700; }
    .detail-label { color: #85908c; }
    .detail-value { color: #1b2724; }
    .footer { background: #fafbfa; padding: 20px; text-align: center; font-size: 11px; color: #85908c; border-top: 1px solid #e4e9e5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>StayZen</h1>
    </div>
    <div class="content">
      <h2>Payment Receipt</h2>
      <p>Thank you for your payment. Here are your transaction details:</p>
      
      <div class="receipt-details">
        <div class="detail-row">
          <span class="detail-label">Received From</span>
          <span class="detail-value">${toName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Organization</span>
          <span class="detail-value">${organizationName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Billing Month</span>
          <span class="detail-value">${invoiceMonth}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Purpose</span>
          <span class="detail-value" style="text-transform: capitalize;">${purpose || 'Rent'}</span>
        </div>
        ${refNo ? `
        <div class="detail-row">
          <span class="detail-label">Reference Number</span>
          <span class="detail-value" style="font-family: monospace;">${refNo}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Amount Paid</span>
          <span class="detail-value" style="color: #17644f; font-size: 16px;">${formattedAmount}</span>
        </div>
      </div>
      
      <p style="font-size: 13px; color: #85908c; margin-bottom: 0;">This receipt is generated automatically upon payment verification.</p>
    </div>
    <div class="footer">
      Thank you for staying with us!<br>
      StayZen PG Management.
    </div>
  </div>
</body>
</html>`;

  return await sendMailHelper(
    toEmail,
    `Payment Receipt: ${formattedAmount} for ${invoiceMonth} ${purpose || 'Rent'}`,
    emailHtml,
    'receipt'
  );
}

export async function sendResetPasswordEmail(toEmail, toName, resetLink) {
  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset your StayZen password</title>
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
      <p>We received a request to reset your password. Click the button below to choose a new password. This link is valid for 1 hour:</p>
      <a href="${resetLink}" class="btn" target="_blank">Reset Password</a>
      <p style="font-size: 12px; color: #85908c; margin-top: 20px;">If the button doesn't work, you can copy and paste this link into your browser:<br><span style="word-break: break-all; color: #0b4438;">${resetLink}</span></p>
    </div>
    <div class="footer">
      This password reset link was requested for your StayZen account.<br>
      If you did not request this, you can safely ignore this email.
    </div>
  </div>
</body>
</html>`;

  return await sendMailHelper(
    toEmail,
    'Reset your StayZen password',
    emailHtml,
    'reset-password'
  );
}
