const { pool } = require('../db/pool');
const QRCode = require('qrcode');

function studentFullName(user) {
  if (!user) return '';
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
}

async function findByCode(certificateCode) {
  const { rows } = await pool.query(
    `SELECT certificate_code AS "certificateCode", course_slug AS "courseSlug", course_name AS "courseName", 
            student_name AS "studentName", language, theme, issued_at AS "issuedAt"
     FROM student_course_certificates
     WHERE certificate_code = $1`,
    [certificateCode]
  );
  return rows[0] || null;
}

async function withQrDataUrl(certificate) {
  if (!certificate || !certificate.certificateCode) return certificate;
  const verifyUrl = `${process.env.FRONTEND_URL || 'https://cyberclub-aou.onrender.com'}/verify/${certificate.certificateCode}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 150, margin: 1 });
    return { ...certificate, qrDataUrl };
  } catch (e) {
    return { ...certificate, qrDataUrl: '' };
  }
}

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

function commonFields(certificate) {
  const isEn = normalizeLanguage(certificate.language) === 'en';
  return {
    isEn,
    documentDirection: isEn ? 'ltr' : 'rtl',
    title: isEn ? 'Certificate of Completion' : 'شهادة إتمام دورة تدريبية',
    awardedTo: isEn ? 'This certificate is proudly presented to' : 'تمنح هذه الشهادة بكل فخر إلى',
    statementLine1: isEn 
      ? 'For successfully completing all requirements of the training course' 
      : 'لاختياره واجتيازه بنجاح متطلبات الدورة التدريبية',
    statementLine2: isEn 
      ? 'Demonstrating dedication and technical excellence in cybersecurity' 
      : 'مؤكداً تفوقه وحرصه على تطوير مهاراته الأمنية والتقنية',
    awardedDay: isEn ? 'Issued on:' : 'تاريخ الإصدار:',
    issueDate: certificate.issuedAt ? new Date(certificate.issuedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    qrLabel: isEn ? 'Verify Certificate' : 'التحقق من الشهادة',
  };
}

function circuitFan(cx, cy, scaleX, scaleY, color) {
  return `
    <g transform="translate(${cx}, ${cy}) scale(${scaleX}, ${scaleY})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round">
      <path d="M 0 0 L 40 0 L 60 -20 L 100 -20" />
      <circle cx="100" cy="-20" r="4" fill="${color}" />
      <path d="M 20 0 L 30 15 L 70 15" />
      <circle cx="70" cy="15" r="3" fill="${color}" />
    </g>
  `;
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

  <rect width="1600" height="900" fill="#ffffff"/>

  <rect x="30" y="30" width="1540" height="840" rx="12" fill="none" stroke="url(#frameGrad)" stroke-width="5"/>
  <rect x="42" y="42" width="1516" height="816" rx="8" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>

  ${circuitFan(1200, 60, 1, 1, '#4f46e5')}
  ${circuitFan(400, 840, -1, -1, '#4f46e5')}

  <g transform="translate(800, 95)">
    <g fill="none" stroke="url(#frameGrad)" stroke-width="2.5" stroke-linecap="round">
      <path d="M 35 -35 A 45 45 0 1 0 35 35" />
      <path d="M -35 35 A 45 45 0 1 0 -35 -35" />
      <circle cx="35" cy="-25" r="3.5" fill="#ffffff" stroke="#7c3aed" stroke-width="2"/>
      <circle cx="-35" cy="25" r="3.5" fill="#ffffff" stroke="#4f46e5" stroke-width="2"/>
    </g>
    <g transform="translate(-18, -19)" fill="none" stroke="url(#frameGrad)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 18 4 C 10 4 5 10 5 22 L 5 32 L 15 32 L 15 20 C 15 16 21 16 21 20 L 21 32 L 31 32 L 31 22 C 31 10 26 4 18 4 Z" />
      <circle cx="10" cy="15" r="2.5" fill="#ffffff"/>
      <circle cx="26" cy="13" r="2.5" fill="#ffffff"/>
    </g>
  </g>

  <text x="800" y="180" text-anchor="middle" fill="#0f172a" font-family='${sansStack}' font-size="16" font-weight="800" letter-spacing="1">Cyber Security Club</text>
  <text x="800" y="200" text-anchor="middle" fill="#475569" font-family='${sansStack}' font-size="11" font-weight="600" letter-spacing="0.5">Arab Open University</text>

  <text x="800" y="245" text-anchor="middle" fill="url(#titleGrad)" font-family='${bodyStack}' font-size="40" font-weight="800" letter-spacing="1">${escapeXml(f.title)}</text>
  <text x="800" y="285" text-anchor="middle" fill="#334155" font-family='${sansStack}' font-size="18" font-weight="600">${escapeXml(f.awardedTo)}</text>

  <text x="800" y="355" text-anchor="middle" fill="#0f172a" font-family='${sansStack}' font-size="46" font-weight="800">${escapeXml(certificate.studentName)}</text>
  <line x1="400" y1="390" x2="1200" y2="390" stroke="url(#frameGrad)" stroke-width="2.5"/>

  <text x="800" y="440" text-anchor="middle" fill="#1e293b" font-family='${sansStack}' font-size="18" font-weight="600">${escapeXml(f.statementLine1)}</text>
  <text x="800" y="505" text-anchor="middle" fill="#1d4ed8" font-family='${sansStack}' font-size="30" font-weight="800">${escapeXml(certificate.courseName)}</text>
  <text x="800" y="565" text-anchor="middle" fill="#334155" font-family='${sansStack}' font-size="16" font-weight="600">${escapeXml(f.statementLine2)}</text>
  <text x="800" y="625" text-anchor="middle" fill="#475569" font-family='${sansStack}' font-size="16" font-weight="700">${escapeXml(f.awardedDay)} ${escapeXml(f.issueDate)}</text>

  <g transform="translate(1310, 680)">
    <rect x="0" y="0" width="120" height="120" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
    <image x="10" y="10" width="100" height="100" href="${qrDataUrl}" xlink:href="${qrDataUrl}"/>
    <text x="-15" y="50" text-anchor="end" fill="#1e293b" font-family='${sansStack}' font-size="14" font-weight="800">${escapeXml(f.qrLabel)}</text>
    <text x="-15" y="75" text-anchor="end" fill="#475569" font-family='${sansStack}' font-size="12" font-weight="700">${escapeXml(certificate.certificateCode)}</text>
  </g>
</svg>`;
}

async function renderCertificateSvg(certificate) {
  const withQr = await withQrDataUrl(certificate);
  return buildLightSvg(withQr, withQr.qrDataUrl || '');
}

async function issueCertificate({ studentId, courseSlug, courseName, studentName, language, theme, updateExisting = false }) {
  // Logic of issuing certificate...
  return { created: true, certificate: {} };
}

function queueCertificateEmail({ certificate, recipientEmail }) {
  // Email queue logic...
}

module.exports = {
  studentFullName,
  findByCode,
  issueCertificate,
  renderCertificateSvg,
  queueCertificateEmail,
  withQrDataUrl,
};
