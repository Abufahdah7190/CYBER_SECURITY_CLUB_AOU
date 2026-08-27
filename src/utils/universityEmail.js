'use strict';

const env = require('../config/env');

// Matches: <digits>ksa  e.g. "01345678ksa" — the confirmed AOU Riyadh
// student ID email format. Digit count is intentionally flexible.
const STUDENT_LOCAL_PART_PATTERN = /^\d{5,15}ksa$/i;

/**
 * Returns null if the email is an acceptable university student email,
 * or an Arabic error message string explaining why it was rejected.
 */
function validateUniversityEmail(email) {
  const normalized = String(email).trim().toLowerCase();
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1) return 'البريد الإلكتروني غير صالح';

  const localPart = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);

  if (domain !== env.ALLOWED_EMAIL_DOMAIN) {
    return `التسجيل متاح فقط لطلاب الجامعة العربية المفتوحة (البريد يجب أن ينتهي بـ @${env.ALLOWED_EMAIL_DOMAIN})`;
  }

  if (env.REQUIRE_STUDENT_ID_LOCAL_PART && !STUDENT_LOCAL_PART_PATTERN.test(localPart)) {
    return 'صيغة البريد الجامعي غير صحيحة (مثال: 01345678ksa@aou.edu.sa)';
  }

  return null;
}

module.exports = { validateUniversityEmail };
