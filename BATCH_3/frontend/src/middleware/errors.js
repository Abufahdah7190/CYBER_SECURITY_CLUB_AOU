'use strict';

const { validationResult } = require('express-validator');

/**
 * Run after express-validator check(...) chains. Returns a single, clear
 * 400 response instead of letting each route hand-roll its own validation
 * error shape.
 */
function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ error: 'بيانات غير صالحة', details: result.array().map((e) => e.msg) });
  }
  return next();
}

/**
 * Centralized error handler. Deliberately never leaks stack traces,
 * SQL text, or internal error messages to the client (req #18: "عدم كشف
 * معلومات حساسة في responses") — those go to the server log only.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);

  // Postgres unique_violation (duplicate email etc.) surfaced generically
  if (err && err.code === '23505') {
    return res.status(409).json({ error: 'هذا البريد الإلكتروني مستخدم بالفعل' });
  }

  res.status(500).json({ error: 'حدث خطأ في الخادم، الرجاء المحاولة لاحقًا' });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'المسار غير موجود' });
}

module.exports = { handleValidation, errorHandler, notFoundHandler };
