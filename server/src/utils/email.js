'use strict';

const env = require('../config/env');

/**
 * Minimal Resend (https://resend.com) email sender.
 *
 * Resend was chosen because it has a generous free tier (3,000 emails/mo,
 * 100/day), a simple HTTP API (no SMTP setup), and first-class support for
 * both Arabic (UTF-8 HTML) and plain transactional email — a good fit for
 * a student-run club with no budget.
 *
 * In development, or if RESEND_API_KEY is not set, emails are logged to
 * the console instead of sent — so the rest of the auth flow (registration,
 * password reset) can be built and tested without an email account yet,
 * exactly as scoped for this phase.
 */
async function sendEmail({ to, subject, html }) {
  if (!env.RESEND_API_KEY) {
    console.log('--- [DEV EMAIL — not sent, RESEND_API_KEY not set] ---');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('-------------------------------------------------------');
    return { dev: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }
  return res.json();
}

module.exports = { sendEmail };
