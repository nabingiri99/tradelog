const crypto = require('crypto');

const IS_PROD = process.env.NODE_ENV === 'production';

function sendMail({ to, subject, html }) {
  const hasSmtp =
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

  if (IS_PROD && !hasSmtp) {
    console.warn(`[mail] SMTP not configured, skipping email to ${to}`);
    return Promise.resolve();
  }

  if (!hasSmtp) {
    console.log(
      `\n[mail] ----- ${subject} -----\n[mail] To: ${to}\n${html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')}\n[mail] -------------------------\n`
    );
    return Promise.resolve();
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'TradeLog <no-reply@tradelog.local>',
    to,
    subject,
    html,
  });
}

function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { sendMail, randomToken, hashToken };
