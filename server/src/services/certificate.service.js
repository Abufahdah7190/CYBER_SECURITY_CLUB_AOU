'use strict';

const crypto = require('crypto');
const QRCode = require('qrcode');
const { pool } = require('../db/pool');
const env = require('../config/env');
const { sendEmail } = require('../utils/email');

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function normalizeLanguage(lang) {
  return lang === 'en' ? 'en' : 'ar';
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function studentFullName(user) {
  const first = user.first_name || user.firstName || '';
  const last = user.last_name || user.lastName || '';
  return `${first} ${last}`.trim() || user.email || 'الطالب';
}

function verificationUrlFor(certificateCode) {
  return `${env.FRONTEND_URL}/certificate-verify.html?code=${encodeURIComponent(certificateCode)}`;
}

function imageUrlFor(certificateCode) {
  return `${env.FRONTEND_URL}/api/learning/certificates/${encodeURIComponent(certificateCode)}/image`;
}

function generateCertificateCode() {
  const year = new Date().getFullYear();
  const random = crypto.randomInt(1000, 9999);
  return `CSC-AOU-${year}-${random}`;
}

// ---------------------------------------------------------------------
// SVG artwork — fixed 1600x900 (16:9) landscape canvas, Light theme.
// ---------------------------------------------------------------------

function circuitFan(x, y, scaleX, scaleY, color) {
  return `<g transform="translate(${x}, ${y}) scale(${scaleX}, ${scaleY})" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 0 0 L 120 0 L 150 30 L 240 30" />
    <circle cx="240" cy="30" r="5" fill="#ffffff" stroke="${color}" stroke-width="2" />
    <path d="M 40 0 L 70 30 L 140 30 L 170 60 L 220 60" />
    <circle cx="220" cy="60" r="5" fill="#ffffff" stroke="${color}" stroke-width="2" />
    <path d="M 80 0 L 100 20 L 180 20 L 210 50 L 280 50" />
    <circle cx="280" cy="50" r="5" fill="#ffffff" stroke="${color}" stroke-width="2" />
    <path d="M 0 40 L 50 40 L 80 70 L 170 70" />
    <circle cx="170" cy="70" r="5" fill="#ffffff" stroke="${color}" stroke-width="2" />
  </g>`;
}

function commonFields(certificate) {
  const language = normalizeLanguage(certificate.language);
  const isEn = language === 'en';
  const issueDate = new Date(certificate.issuedAt).toLocaleDateString(isEn ? 'en-GB' : 'ar-SA');
  return {
    issueDate,
    isEn,
    documentDirection: isEn ? 'ltr' : 'rtl',
    clubSub: isEn ? 'CYBER SECURITY CLUB — ARAB OPEN UNIVERSITY' : 'نادي الأمن السيبراني — الجامعة العربية المفتوحة',
    title: isEn ? 'CERTIFICATE OF COMPLETION' : 'شهادة إتمام وتدريب معتمدة',
    awardedTo: isEn ? 'This is proudly presented to' : 'تُمنح هذه الشهادة بكل فخر واعتزاز إلى المتدرب',
    statementLine1: isEn
      ? 'For successfully completing all rigorous training hours, practical labs, and requirements for:'
      : 'وذلك تقديراً لاجتيازه بنجاح وتفوق كافة الساعات التدريبية والتطبيقات العملية لورشة العمل:',
    statementLine2: isEn
      ? 'Demonstrating exceptional dedication and proficiency in cybersecurity standards.'
      : 'مؤكداً بذلك حرصه على تطوير مهاراته وكفاءته العالية في مجالات الأمن السيبراني وتقنية المعلومات.',
    awardedDay: isEn ? 'Date of Issuance:' : 'تاريخ الإصدار الرسمي:',
    codeLabel: isEn ? 'Certificate ID:' : 'معرف التحقق:',
    qrLabel: isEn ? 'Scan to Verify' : 'امسح الرمز للتحقق',
  };
}

function buildLightSvg(certificate, qrDataUrl) {
  const f = commonFields(certificate);
  const isEn = f.isEn;
  const bodyStack = isEn ? 'Georgia, "Times New Roman", serif' : '"Cairo", "Tahoma", sans-serif';
  const sansStack = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1600" height="900" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" role="img" dir="${f.documentDirection}" lang="${normalizeLanguage(certificate.language)}">
  <title>${escapeXml(f.title)} — ${escapeXml(certificate.studentName)}</title>
  <defs>
    <linearGradient id="frameGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>

  <!-- خلفية بيضاء نقية للشهادة -->
  <rect width="1600" height="900" fill="#ffffff"/>

  <!-- الإطار الخارجي المتدرج -->
  <rect x="30" y="30" width="1540" height="840" rx="12" fill="none" stroke="url(#frameGrad)" stroke-width="5"/>
  <rect x="42" y="42" width="1516" height="816" rx="8" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>

  <!-- الخطوط التقنية البارزة في الزوايا -->
  ${circuitFan(1200, 60, 1, 1, '#4f46e5')}
  ${circuitFan(400, 840, -1, -1, '#4f46e5')}

  <!-- شعار النادي السيبراني الهندسي المفرغ والنظيف -->
  <g transform="translate(755, 60)" fill="none" stroke="#4f46e5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 45 10 C 25 10 10 25 10 45 C 10 65 25 80 45 80 C 65 80 80 65 80 45 C 80 25 65 10 45 10 Z" stroke-dasharray="6,4" />
    <path d="M 35 55 L 35 35 C 35 28 55 28 55 35 L 55 55" stroke-width="3.5"/>
    <circle cx="45" cy="45" r="4" fill="#4f46e5"/>
    <circle cx="35" cy="55" r="3" fill="#4f46e5"/>
    <circle cx="55" cy="55" r="3" fill="#4f46e5"/>
  </g>

  <!-- اسم النادي / الجهة المصدرة -->
  <text x="800" y="180" text-anchor="middle" fill="#475569" font-family='${sansStack}' font-size="15" font-weight="800" letter-spacing="2">${escapeXml(f.clubSub)}</text>

  <!-- عنوان الشهادة الرئيسي -->
  <text x="800" y="235" text-anchor="middle" fill="url(#titleGrad)" font-family='${bodyStack}' font-size="40" font-weight="800" letter-spacing="1">${escapeXml(f.title)}</text>
  <text x="800" y="275" text-anchor="middle" fill="#334155" font-family='${sansStack}' font-size="18" font-weight="600">${escapeXml(f.awardedTo)}</text>

  <!-- اسم الطالب البارز -->
  <text x="800" y="345" text-anchor="middle" fill="#0f172a" font-family='${sansStack}' font-size="46" font-weight="800">${escapeXml(certificate.studentName)}</text>
  <line x1="400" y1="380" x2="1200" y2="380" stroke="url(#frameGrad)" stroke-width="2.5"/>

  <!-- السطر التعريفي الأول -->
  <text x="800" y="430" text-anchor="middle" fill="#1e293b" font-family='${sansStack}' font-size="18" font-weight="600">${escapeXml(f.statementLine1)}</text>

  <!-- اسم الدورة التدريبية -->
  <text x="800" y="495" text-anchor="middle" fill="#1d4ed8" font-family='${sansStack}' font-size="30" font-weight="800">${escapeXml(certificate.courseName)}</text>

  <!-- السطر التعريفي الثاني -->
  <text x="800" y="555" text-anchor="middle" fill="#334155" font-family='${sansStack}' font-size="16" font-weight="600">${escapeXml(f.statementLine2)}</text>

  <!-- تاريخ الإصدار الرسمي -->
  <text x="800" y="615" text-anchor="middle" fill="#475569" font-family='${sansStack}' font-size="16" font-weight="700">${escapeXml(f.awardedDay)} ${escapeXml(f.issueDate)}</text>

  <!-- صندوق الـ QR Code ورمز التحقق في الزاوية السفلى -->
  <g transform="translate(1310, 680)">
    <rect x="0" y="0" width="120" height="120" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
    <image x="10" y="10" width="100" height="100" href="${qrDataUrl}" xlink:href="${qrDataUrl}"/>
    <text x="-15" y="50" text-anchor="end" fill="#1e293b" font-family='${sansStack}' font-size="14" font-weight="800">${escapeXml(f.qrLabel)}</text>
    <text x="-15" y="75" text-anchor="end" fill="#475569" font-family='${sansStack}' font-size="12" font-weight="700">${escapeXml(certificate.certificateCode)}</text>
  </g>
</svg>`;
}

// Only the Light theme ships today (routes/DB already restrict `theme` to
// 'light'), but rendering is still resolved through one place so a future
// Dark theme is a one-line addition here, not a scattered change.
function buildSvg(certificate, qrDataUrl) {
  return buildLightSvg(certificate, qrDataUrl);
}

async function qrDataUrlFor(certificateCode) {
  return QRCode.toDataURL(verificationUrlFor(certificateCode), {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 220,
  });
}

// ---------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------

const CERTIFICATE_COLUMNS = `course_slug AS "courseSlug", course_name AS "courseName", student_name AS "studentName",
  language, theme, certificate_code AS "certificateCode", issued_at AS "issuedAt"`;

async function findByCode(certificateCode) {
  const { rows } = await pool.query(
    `SELECT ${CERTIFICATE_COLUMNS} FROM student_course_certificates WHERE certificate_code = $1`,
    [certificateCode]
  );
  return rows[0] || null;
}

async function findExisting(studentId, courseSlug) {
  const { rows } = await pool.query(
    `SELECT ${CERTIFICATE_COLUMNS} FROM student_course_certificates WHERE student_id = $1 AND course_slug = $2`,
    [studentId, courseSlug]
  );
  return rows[0] || null;
}

async function insertCertificate({ studentId, courseSlug, courseName, studentName, language, theme }) {
  // certificate_code has its own UNIQUE constraint; retry a couple of times
  // on the (astronomically unlikely) collision instead of ever failing the
  // student's completion request.
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const certificateCode = generateCertificateCode();
    try {
      const { rows } = await pool.query(
        `INSERT INTO student_course_certificates (student_id, course_slug, course_name, student_name, language, theme, certificate_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING ${CERTIFICATE_COLUMNS}`,
        [studentId, courseSlug, courseName, studentName, normalizeLanguage(language), theme || 'light', certificateCode]
      );
      return rows[0];
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'student_course_certificates_certificate_code_key') {
        lastError = error;
        continue; // certificate_code collision — try another code
      }
      throw error;
    }
  }
  throw lastError;
}

async function updateCertificate({ studentId, courseSlug, courseName, studentName, language, theme }) {
  const { rows } = await pool.query(
    `UPDATE student_course_certificates
       SET course_name = $3, student_name = $4, language = $5, theme = $6
       WHERE student_id = $1 AND course_slug = $2
       RETURNING ${CERTIFICATE_COLUMNS}`,
    [studentId, courseSlug, courseName, studentName, normalizeLanguage(language), theme || 'light']
  );
  return rows[0];
}

/**
 * Issues (or, with updateExisting, re-issues in a new language/theme) the
 * certificate for one student/course. A student only ever holds one
 * certificate row per course — re-issuing updates that same row and keeps
 * its original certificate_code, so a previously shared verification link
 * or downloaded file never goes stale.
 *
 * Returns { created, certificate }. `created` is true only the first time
 * a certificate row is inserted for that student/course — callers use it
 * to decide whether to send the "certificate issued" email again.
 */
async function issueCertificate({ studentId, courseSlug, courseName, studentName, language, theme, updateExisting }) {
  const existing = await findExisting(studentId, courseSlug);
  if (existing) {
    if (!updateExisting) return { created: false, certificate: existing };
    const certificate = await updateCertificate({ studentId, courseSlug, courseName, studentName, language, theme });
    return { created: false, certificate };
  }
  const certificate = await insertCertificate({ studentId, courseSlug, courseName, studentName, language, theme });
  return { created: true, certificate };
}

// ---------------------------------------------------------------------
// Rendering / delivery
// ---------------------------------------------------------------------

async function renderCertificateSvg(certificate) {
  const qrDataUrl = await qrDataUrlFor(certificate.certificateCode);
  return buildSvg(certificate, qrDataUrl);
}

async function withQrDataUrl(certificate) {
  const qrDataUrl = await qrDataUrlFor(certificate.certificateCode);
  return {
    ...certificate,
    theme: certificate.theme || 'light',
    verificationUrl: verificationUrlFor(certificate.certificateCode),
    imageUrl: imageUrlFor(certificate.certificateCode),
    qrDataUrl,
  };
}

function certificateEmailHtml(certificate) {
  const isEn = normalizeLanguage(certificate.language) === 'en';
  const imageUrl = imageUrlFor(certificate.certificateCode);
  const verifyUrl = verificationUrlFor(certificate.certificateCode);
  if (isEn) {
    return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto">
      <h2>Congratulations, ${escapeXml(certificate.studentName)}!</h2>
      <p>You have successfully completed <strong>${escapeXml(certificate.courseName)}</strong> and your certificate is ready.</p>
      <p><img src="${imageUrl}" alt="Certificate" style="width:100%;max-width:600px;border-radius:8px"></p>
      <p>Certificate ID: <strong>${escapeXml(certificate.certificateCode)}</strong></p>
      <p><a href="${verifyUrl}">Verify this certificate</a></p>
    </div>`;
  }
  return `<div style="font-family:Tahoma,Arial,sans-serif;max-width:640px;margin:auto;text-align:right;direction:rtl">
    <h2>مبروك، ${escapeXml(certificate.studentName)}!</h2>
    <p>لقد أكملت بنجاح دورة <strong>${escapeXml(certificate.courseName)}</strong> وشهادتك جاهزة الآن.</p>
    <p><img src="${imageUrl}" alt="الشهادة" style="width:100%;max-width:600px;border-radius:8px"></p>
    <p>معرف الشهادة: <strong>${escapeXml(certificate.certificateCode)}</strong></p>
    <p><a href="${verifyUrl}">التحقق من هذه الشهادة</a></p>
  </div>`;
}

/**
 * Fire-and-forget: intentionally not awaited by callers, so a slow or
 * unavailable mail transport never delays the completion/response the
 * student is waiting on. All failures are caught and logged here.
 */
function queueCertificateEmail({ certificate, recipientEmail }) {
  (async () => {
    try {
      const svg = await renderCertificateSvg(certificate);
      const isEn = normalizeLanguage(certificate.language) === 'en';
      await sendEmail({
        to: recipientEmail,
        subject: isEn
          ? `Your certificate: ${certificate.courseName}`
          : `شهادتك: ${certificate.courseName}`,
        html: certificateEmailHtml(certificate),
        attachments: [
          { filename: `${certificate.certificateCode}.svg`, content: svg, contentType: 'image/svg+xml' },
        ],
      });
    } catch (error) {
      console.error('Failed to send certificate email:', error.message);
    }
  })();
}

module.exports = {
  studentFullName,
  issueCertificate,
  findByCode,
  renderCertificateSvg,
  withQrDataUrl,
  queueCertificateEmail,
  buildLightSvg,
};
