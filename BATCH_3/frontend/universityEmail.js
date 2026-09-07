'use strict';

// Registration accepts personal and university email providers. The server
// still validates the complete address instead of trusting the HTML input.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/**
 * Returns null for an acceptable email or an Arabic validation message.
 */
function validateUniversityEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalized)) {
    return 'البريد الإلكتروني غير صالح. استخدم عنوانًا مثل name@gmail.com أو name@yahoo.com';
  }
  return null;
}

module.exports = { validateUniversityEmail };
