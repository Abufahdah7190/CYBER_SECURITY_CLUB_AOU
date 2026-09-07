'use strict';
const express = require('express');
const { body, param } = require('express-validator');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/errors');
const crypto = require('crypto');
const QRCode = require('qrcode');
const env = require('../config/env');
const { sendEmail } = require('../utils/email');

const router = express.Router();
const courseParam = param('courseSlug').trim().isSlug().isLength({ max: 80 });

// Public verification endpoint: exposes only certificate verification data.
router.get('/verify/:certificateCode', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT certificate_code AS "certificateCode", course_name AS "courseName", student_name AS "studentName",
              language, issued_at AS "issuedAt"
       FROM student_course_certificates
       WHERE certificate_code = $1`,
      [req.params.certificateCode]
    );
    if (!rows[0]) return res.status(404).json({ valid: false, error: 'الشهادة غير موجودة أو غير صالحة' });
    res.json({ valid: true, certificate: rows[0] });
  } catch (error) { next(error); }
});

router.use(requireAuth);

router.get('/progress', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT course_slug AS "courseSlug", percent, last_section AS "lastSection",
              last_accessed_at AS "lastAccessedAt", quiz_scores AS "quizScores",
              certificate_language AS language, completed_at AS "completedAt"
       FROM student_course_progress WHERE student_id = $1 ORDER BY last_accessed_at DESC`,
      [req.user.id]
    );
    const certificates = await pool.query(
      `SELECT course_slug AS "courseSlug", course_name AS "courseName", language,
              certificate_code AS "certificateCode", issued_at AS "issuedAt"
       FROM student_course_certificates WHERE student_id = $1 ORDER BY issued_at DESC`,
      [req.user.id]
    );
    res.json({ progress: rows, certificates: certificates.rows });
  } catch (error) { next(error); }
});

router.put('/progress/:courseSlug', [courseParam, body('percent').isInt({ min: 0, max: 100 }), body('lastSection').optional().isInt({ min: 0, max: 30 }), body('quizScores').optional().isObject(), body('language').optional().isIn(['ar', 'en']), body('courseName').optional().trim().isLength({ min: 2, max: 200 })], handleValidation, async (req, res, next) => {
  try {
    const { courseSlug } = req.params;
    const percent = Number(req.body.percent);
    const lastSection = Number(req.body.lastSection || 0);
    const quizScores = req.body.quizScores || {};
    const language = req.body.language || 'ar';
    const completedAt = percent >= 80 ? new Date() : null;
    const { rows } = await pool.query(
      `INSERT INTO student_course_progress (student_id, course_slug, percent, last_section, last_accessed_at, quiz_scores, certificate_language, completed_at)
       VALUES ($1,$2,$3,$4,now(),$5,$6,$7)
       ON CONFLICT (student_id, course_slug) DO UPDATE SET percent=EXCLUDED.percent,
         last_section=EXCLUDED.last_section, last_accessed_at=now(), quiz_scores=EXCLUDED.quiz_scores,
         certificate_language=EXCLUDED.certificate_language,
         completed_at=CASE WHEN EXCLUDED.percent >= 80 THEN COALESCE(student_course_progress.completed_at, now()) ELSE NULL END,
         updated_at=now()
       RETURNING course_slug AS "courseSlug", percent, last_section AS "lastSection", last_accessed_at AS "lastAccessedAt", quiz_scores AS "quizScores", certificate_language AS language, completed_at AS "completedAt"`,
      [req.user.id, courseSlug, percent, lastSection, quizScores, language, completedAt]
    );
    let certificate = null;
    if (percent >= 100) {
      const user = await pool.query('SELECT first_name, last_name FROM users WHERE id=$1', [req.user.id]);
      const studentName = `${user.rows[0]?.first_name || ''} ${user.rows[0]?.last_name || ''}`.trim();
      const courseName = String(req.body.courseName || courseSlug).trim();
      const certificateCode = `CSC-AOU-${new Date().getFullYear()}-${String(crypto.randomInt(1000, 10000))}`;
      const issued = await pool.query(
        `INSERT INTO student_course_certificates (student_id, course_slug, course_name, student_name, language, certificate_code)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (student_id, course_slug) DO UPDATE SET course_name=EXCLUDED.course_name, student_name=EXCLUDED.student_name, language=EXCLUDED.language
         RETURNING course_slug AS "courseSlug", course_name AS "courseName", student_name AS "studentName", language, certificate_code AS "certificateCode", issued_at AS "issuedAt"`,
        [req.user.id, courseSlug, courseName, studentName, language, certificateCode]
      );
      certificate = issued.rows[0];
    }
    res.json({ progress: rows[0], certificate });
  } catch (error) { next(error); }
});

router.post('/certificates/:courseSlug', [courseParam, body('courseName').trim().isLength({ min: 2, max: 200 }), body('language').isIn(['ar', 'en'])], handleValidation, async (req, res, next) => {
  try {
    const check = await pool.query('SELECT percent FROM student_course_progress WHERE student_id=$1 AND course_slug=$2', [req.user.id, req.params.courseSlug]);
    const completionPercent = Number(check.rows[0]?.percent || 0);
    if (completionPercent < 100) return res.status(400).json({ error: 'يجب إكمال جميع دروس الدورة بنسبة 100% للحصول على الشهادة' });
    const user = await pool.query('SELECT email, first_name, last_name FROM users WHERE id=$1', [req.user.id]);
    const studentName = `${user.rows[0].first_name} ${user.rows[0].last_name}`;
    const code = `CSC-AOU-${new Date().getFullYear()}-${String(crypto.randomInt(1000, 10000))}`;
    const { rows } = await pool.query(
      `INSERT INTO student_course_certificates (student_id, course_slug, course_name, student_name, language, certificate_code)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (student_id, course_slug) DO UPDATE SET language=EXCLUDED.language
       RETURNING course_slug AS "courseSlug", course_name AS "courseName", student_name AS "studentName", language, certificate_code AS "certificateCode", issued_at AS "issuedAt"`,
      [req.user.id, req.params.courseSlug, req.body.courseName, studentName, req.body.language, code]
    );
    const certificate = rows[0];
    const verificationUrl = `${env.FRONTEND_URL}/certificate-verify.html?code=${encodeURIComponent(certificate.certificateCode)}`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { errorCorrectionLevel: 'M', margin: 1, width: 220 });
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
    const certificateEmail = `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#071426;color:#eaf7ff;font-family:Arial,Tahoma,sans-serif;padding:24px"><div style="max-width:680px;margin:auto;background:#0d1d33;border:1px solid #1d5870;border-radius:18px;padding:30px"><p style="color:#00e5ff;font-weight:700;letter-spacing:1px">CYBERCLUB ACADEMY</p><h1 style="margin:8px 0;color:#ffffff">مبروك! تم إصدار شهادتك</h1><p>مرحبًا <strong>${escapeHtml(certificate.studentName)}</strong>، لقد أتممت متطلبات دورة <strong>${escapeHtml(certificate.courseName)}</strong> بنجاح.</p><div style="margin:22px 0;padding:18px;border-radius:12px;background:#081426"><p style="margin:0 0 8px">نسبة الاجتياز</p><strong style="font-size:28px;color:#00ff9d">${completionPercent}%</strong><p style="margin:16px 0 8px">رمز الشهادة</p><strong style="font-size:22px;color:#00e5ff;letter-spacing:1px">${escapeHtml(certificate.certificateCode)}</strong><p style="margin:16px 0 0">تاريخ الإصدار: ${new Date(certificate.issuedAt).toLocaleDateString('ar-SA')}</p></div><p>يمكنك التحقق من الشهادة عبر الرابط التالي أو مسح رمز QR الموجود في صفحة الشهادة:</p><p><a href="${verificationUrl}" style="display:inline-block;padding:13px 20px;border-radius:9px;background:#00d8ff;color:#001219;text-decoration:none;font-weight:700">فتح صفحة التحقق</a></p><p style="font-size:12px;color:#9bb2c8;line-height:1.8">هذه الشهادة صُدرت إلكترونيًا من موقع نادي الأمن السيبراني بالجامعة العربية المفتوحة ولا تحتاج إلى توقيع أو ختم. للتحقق من صحة البيانات يرجى استخدام رابط التحقق.</p><img src="${qrDataUrl}" alt="QR Code" width="180" height="180" style="display:block;margin:18px auto;background:#fff;padding:8px;border-radius:8px"></div></body></html>`;
    const emailTask = sendEmail({ to: user.rows[0].email, subject: `شهادة إتمام الدورة — ${certificate.courseName}`, html: certificateEmail })
      .then(() => ({ sent: true }))
      .catch((emailError) => { console.error('Certificate email failed:', emailError.message); return { sent: false, error: 'email_delivery_failed' }; });
    const emailStatus = await emailTask;
    res.status(201).json({ certificate: { ...certificate, verificationUrl, qrDataUrl, completionPercent }, email: emailStatus });
  } catch (error) { next(error); }
});
module.exports = router;
