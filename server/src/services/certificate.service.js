const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { pool } = require('../db/pool');
const env = require('../config/env');
const { sendEmail } = require('../utils/email');

const VALID_LANGUAGES = ['ar', 'en'];

function normalizeLanguage(language) {
  return VALID_LANGUAGES.includes(language) ? language : 'ar';
}

const logoCache = new Map();

function logoCandidates() {
  const genericName = 'cyberclub-logo-light.png';
  return [
    path.join(__dirname, '..', '..', 'public', 'assets', 'branding', genericName),
    path.join(__dirname, '..', '..', '..', 'assets', 'branding', genericName),
  ];
}

function logoDataUrl() {
  const key = 'light';
  if (logoCache.has(key)) return logoCache.get(key);
  let dataUrl = '';
  try {
    const logoPath = logoCandidates().find((candidate) => fs.existsSync(candidate));
    if (!logoPath) throw new Error('no logo asset found');
    const buffer = fs.readFileSync(logoPath);
    dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Certificate logo asset missing:', error.message);
    dataUrl = '';
  }
  logoCache.set(key, dataUrl);
  return dataUrl;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function escapeXml(value) {
  return escapeHtml(value);
}

function studentFullName(user) {
  return [user?.first_name, user?.last_name]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function verificationUrl(certificateCode) {
  return `${env.FRONTEND_URL}/certificate-verify.html?code=${encodeURIComponent(certificateCode)}`;
}

function certificateVersion(row) {
  return crypto
    .createHash('md5')
    .update(`${row.language}|${row.student_name}|${row.course_name}`)
    .digest('hex')
    .slice(0, 10);
}

function publicCertificate(row) {
  const version = certificateVersion(row);
  return {
    courseSlug: row.course_slug,
    courseName: row.course_name,
    studentName: row.student_name,
    language: normalizeLanguage(row.language),
    theme: 'light',
    certificateCode: row.certificate_code,
    issuedAt: row.issued_at,
    status: 'valid',
    verificationUrl: verificationUrl(row.certificate_code),
    imageUrl: `${env.FRONTEND_URL}/api/learning/certificates/${encodeURIComponent(row.certificate_code)}/image?v=${version}`,
  };
}

async function issueCertificate({ studentId, courseSlug, courseName, studentName, language, updateExisting = false }) {
  const safeLanguage = normalizeLanguage(language);
  const existingResult = await pool.query(
    `SELECT course_slug, course_name, student_name, language, certificate_code, issued_at
       FROM student_course_certificates
      WHERE student_id = $1 AND course_slug = $2`,
    [studentId, courseSlug]
  );
  const existing = existingResult.rows[0];

  if (existing) {
    const alreadyUpToDate = existing.language === safeLanguage;
    if (!updateExisting && alreadyUpToDate) {
      return { certificate: publicCertificate(existing), created: false };
    }
    const updatedResult = await pool.query(
      `UPDATE student_course_certificates
          SET course_name = $3, student_name = $4, language = $5, theme = 'light'
        WHERE student_id = $1 AND course_slug = $2
        RETURNING course_slug, course_name, student_name, language, 'light' AS theme, certificate_code, issued_at`,
      [studentId, courseSlug, courseName, studentName, safeLanguage]
    );
    return { certificate: publicCertificate(updatedResult.rows[0]), created: false };
  }

  const certificateCode = `CERT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const insertedResult = await pool.query(
    `INSERT INTO student_course_certificates (student_id, course_slug, course_name, student_name, language, theme, certificate_code)
     VALUES ($1, $2, $3, $4, $5, 'light', $6)
     ON CONFLICT (student_id, course_slug) DO NOTHING
     RETURNING course_slug, course_name, student_name, language, 'light' AS theme, certificate_code, issued_at`,
    [studentId, courseSlug, courseName, studentName, safeLanguage, certificateCode]
  );

  if (insertedResult.rows[0]) {
    return { certificate: publicCertificate(insertedResult.rows[0]), created: true };
  }

  const concurrentResult = await pool.query(
    `SELECT course_slug, course_name, student_name, language, 'light' AS theme, certificate_code, issued_at
       FROM student_course_certificates
      WHERE student_id = $1 AND course_slug = $2`,
    [studentId, courseSlug]
  );
  return { certificate: publicCertificate(concurrentResult.rows[0]), created: false };
}

async function findByCode(certificateCode) {
  const { rows } = await pool.query(
    `SELECT course_slug, course_name, student_name, language, 'light' AS theme, certificate_code, issued_at
       FROM student_course_certificates
      WHERE certificate_code = $1`,
    [certificateCode]
  );
  return rows[0] ? publicCertificate(rows[0]) : null;
}

function commonFields(certificate) {
  const language = normalizeLanguage(certificate.language);
  const isEn = language === 'en';
  const issueDate = new Date(certificate.issuedAt).toLocaleDateString(isEn ? 'en-GB' : 'ar-SA');
  return {
    issueDate,
    isEn,
    documentDirection: isEn ? 'ltr' : 'rtl',
    title: isEn ? 'CERTIFICATE OF APPRECIATION' : 'شهادة تقدير',
    awardedTo: isEn ? 'This certificate is awarded to' : 'تمنح هذه الشهادة فخراً إلى',
    statement: isEn ? 'In recognition of outstanding contribution, dedication, and exemplary performance to the Cyber Security Club - Arab Open University.' : 'تقديراً للجهود المتميزة والعطاء المستمر في نادي الأمن السيبراني - الجامعة العربية المفتوحة.',
    awardedDay: isEn ? 'Awarded this day,' : 'تاريخ الإصدار:',
    codeLabel: isEn ? 'ID:' : 'الرمز:',
    qrLabel: isEn ? 'Scan to Verify Certificate' : 'امسح للتحقق',
  };
}

function circuitFan(x, y, dx, dy, color) {
  const seg = 35;
  const lines = [];
  const nodes = [];
  for (let i = 0; i < 4; i += 1) {
    const x1 = x;
    const y1 = y + dy * i * seg;
    const x2 = x + dx * (90 + i * 20);
    lines.push(`M${x1} ${y1} H${x2}`);
    nodes.push(`<circle cx="${x2}" cy="${y1}" r="2.5"/>`);
  }
  return `<g stroke="${color}" stroke-width="1.2" fill="none" opacity="0.35">${lines.map((d) => `<path d="${d}"/>`).join('')}</g><g fill="${color}" opacity="0.6">${nodes.join('')}</g>`;
}

function buildLightSvg(certificate, qrDataUrl) {
  const f = commonFields(certificate);
  const bodyStack = 'Arial, Tahoma, sans-serif';
  const logo = logoDataUrl();
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" lang="${normalizeLanguage(certificate.language)}">
  <defs>
    <linearGradient id="frameGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3730a3"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="#ffffff"/>
  <rect x="30" y="30" width="1540" height="840" rx="12" fill="none" stroke="url(#frameGradient)" stroke-width="5"/>
  <rect x="44" y="44" width="1512" height="812" rx="8" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>
  ${circuitFan(1530, 70, -1, 1, '#93c5fd')}
  ${circuitFan(70, 830, 1, -1, '#93c5fd')}

  <circle cx="800" cy="115" r="45" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <image x="760" y="75" width="80" height="80" href="${logo}" preserveAspectRatio="xMidYMid meet"/>

  <text x="800" y="200" text-anchor="middle" fill="url(#titleGrad)" font-family="${bodyStack}" font-size="36" font-weight="800" letter-spacing="1.5">${escapeXml(f.title)}</text>
  <text x="800" y="245" text-anchor="middle" fill="#64748b" font-family="${bodyStack}" font-size="18">${escapeXml(f.awardedTo)}</text>
  <text x="800" y="320" text-anchor="middle" fill="#0f172a" font-family="${bodyStack}" font-size="42" font-weight="700">${escapeXml(certificate.studentName)}</text>
  <line x1="450" y1="360" x2="1150" y2="360" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="800" y="420" text-anchor="middle" font-family="${bodyStack}" font-size="19" fill="#334155">${escapeXml(f.statement)}</text>
  <text x="800" y="475" text-anchor="middle" fill="#1e293b" font-family="${bodyStack}" font-size="24" font-weight="700">${escapeXml(certificate.courseName)}</text>
  <text x="800" y="535" text-anchor="middle" fill="#64748b" font-family="${bodyStack}" font-size="16">${escapeXml(f.awardedDay)} ${escapeXml(f.issueDate)}</text>

  <g transform="translate(1300, 710)">
    <rect x="0" y="0" width="100" height="100" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <image x="6" y="6" width="88" height="88" href="${qrDataUrl}"/>
    <text x="-15" y="45" text-anchor="end" fill="#334155" font-family="${bodyStack}" font-size="12" font-weight="700">${escapeXml(f.qrLabel)}</text>
    <text x="-15" y="68" text-anchor="end" fill="#64748b" font-family="${bodyStack}" font-size="11">${escapeXml(certificate.certificateCode)}</text>
  </g>
</svg>`;
}

async function renderCertificateSvg(certificate) {
  const normalized = {
    ...certificate,
    theme: 'light',
    language: normalizeLanguage(certificate.language),
  };
  const qrDataUrl = await QRCode.toDataURL(normalized.verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
  });
  return buildLightSvg(normalized, qrDataUrl);
}

async function createCertificateAttachment(certificate) {
  const svg = await renderCertificateSvg(certificate);
  return {
    filename: `${certificate.certificateCode}.svg`,
    content: Buffer.from(svg, 'utf8'),
    contentType: 'image/svg+xml',
  };
}

async function sendCertificateEmail({ certificate, recipientEmail }) {
  const attachment = await createCertificateAttachment(certificate);
  const studentName = escapeHtml(certificate.studentName);
  const courseName = escapeHtml(certificate.courseName);
  const verificationLink = escapeHtml(certificate.verificationUrl);
  return sendEmail({
    to: recipientEmail,
    subject: `شهادة تقدير — ${certificate.courseName}`,
    html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#17233b"><h2>مبروك يا ${studentName}</h2><p>تم منحك شهادة تقدير لدورة <strong>${courseName}</strong>.</p><p>أرفقنا شهادتك بصيغة صورة متجهية عالية الجودة.</p><p>رمز الشهادة: <strong>${escapeHtml(certificate.certificateCode)}</strong></p><p><a href="${verificationLink}">فتح صفحة التحقق من الشهادة</a></p></div>`,
    attachments: [attachment],
  });
}

function queueCertificateEmail({ certificate, recipientEmail }) {
  setImmediate(() => {
    sendCertificateEmail({ certificate, recipientEmail }).catch(() => {});
  });
}

async function withQrDataUrl(certificate) {
  const qrDataUrl = await QRCode.toDataURL(certificate.verificationUrl, {
    errorCorrectionLevel: 'M', margin: 1, width: 220,
  });
  return { ...certificate, qrDataUrl };
}

module.exports = {
  normalizeLanguage,
  studentFullName,
  issueCertificate,
  findByCode,
  renderCertificateSvg,
  createCertificateAttachment,
  queueCertificateEmail,
  withQrDataUrl,
};