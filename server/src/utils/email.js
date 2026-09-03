'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');

/**
 * Email sender using Nodemailer over Gmail SMTP.
 *
 * Replaces the previous Resend integration: Resend's free-tier shared
 * sender (onboarding@resend.dev) only delivers to the Resend account
 * owner's own inbox unless a paid/verified custom domain is added —
 * every other recipient gets a 403 Forbidden. A real Gmail account
 * (with an App Password, not the normal account password) has no such
 * restriction and delivers to Gmail, Outlook, Yahoo, and any other
 * provider.
 *
 * In development, or if EMAIL_USER/EMAIL_PASS are not set, emails are
 * logged to the console instead of sent — so the rest of the auth flow
 * can be built and tested without a mailbox configured yet.
 */

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Sends an email and NEVER throws — a bad Gmail App Password, a network
 * blip, or Gmail rate-limiting must never crash a request or hang the
 * page for the user. Callers get a structured { success, error } result
 * back so they can log it and/or return a clear JSON response instead of
 * an unhandled rejection or a stuck request.
 */
async function sendEmail({ to, subject, html }) {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    console.log('--- [DEV EMAIL — not sent, EMAIL_USER/EMAIL_PASS not set] ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('-------------------------------------------------------');
    return { dev: true, success: true };
  }

  try {
    const info = await getTransporter().sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Failed to send email via Gmail SMTP:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
