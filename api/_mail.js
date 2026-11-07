// Sends email through any SMTP account (Gmail, Outlook, Brevo...). No domain of your own is needed.
// For local tests only, SF_MEMORY=1 keeps mails in `outbox` instead of sending them.
const nodemailer = require("nodemailer");

const outbox = [];
const testing = () => process.env.SF_MEMORY === "1" && !process.env.SMTP_USER;

const configured = () => testing() || !!(process.env.SMTP_USER && process.env.SMTP_PASS);

function transport() {
  if (testing()) return nodemailer.createTransport({ jsonTransport: true });
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function send({ to, subject, text }) {
  const from = process.env.MAIL_FROM || `Study Flight <${process.env.SMTP_USER}>`;
  await transport().sendMail({ from, to, subject, text });
  if (testing()) outbox.push({ to, subject, text });
}

module.exports = { configured, send, outbox };
