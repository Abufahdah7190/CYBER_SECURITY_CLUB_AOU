const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { pool } = require('../db/pool');
const env = require('../config/env');
const { sendEmail } = require('../utils/email');

const VALID_THEMES = ['light', 'dark'];
function normalizeTheme(theme) {
  return VALID_THEMES.includes(theme) ? theme : 'light';
}

let cachedLogoDataUrl = null;
function logoDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const candidates = [
      path.join(__dirname, '..', '..', 'public', 'assets', 'branding', 'cyberclub-logo.png'),
      path.join(__dirname, '..', '..', '..', 'assets', 'branding', 'cyberclub-logo.png'),
    ];
    const logoPath = candidates.find((candidate) => fs.existsSync(candidate));
    if (!logoPath) throw new Error('cyberclub-logo.png not found');
    const buffer = fs.readFileSync(logoPath);
    cachedLogoDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error('Certificate logo asset missing:', error.message);
    cachedLogoDataUrl = '';
  }
  return cachedLogoDataUrl;
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

function publicCertificate(row) {
  return {
    courseSlug: row.course_slug,
    courseName: row.course_name,
    studentName: row.student_name,
    language: row.language,
    theme: normalizeTheme(row.theme),
    certificateCode: row.certificate_code,
    issuedAt: row.issued_at,
    status: 'valid',
    verificationUrl: verificationUrl(row.certificate_code),
    imageUrl: `${env.FRONTEND_URL}/api/learning/certificates/${encodeURIComponent(row.certificate_code)}/image`,
  };
}

async function issueCertificate({ studentId, courseSlug, courseName, studentName, language, theme = 'light', updateExisting = false }) {
  const safeTheme = normalizeTheme(theme);
  const existingResult = await pool.query(
    `SELECT course_slug, course_name, student_name, language, theme, certificate_code, issued_at
       FROM student_course_certificates
      WHERE student_id = $1 AND course_slug = $2`,
    [studentId, courseSlug]
  );
  const existing = existingResult.rows[0];

  if (existing) {
    if (!updateExisting) return { certificate: publicCertificate(existing), created: false };
    const updatedResult = await pool.query(
      `UPDATE student_course_certificates
          SET course_name = $3, student_name = $4, language = $5, theme = $6
        WHERE student_id = $1 AND course_slug = $2
        RETURNING course_slug, course_name, student_name, language, theme, certificate_code, issued_at`,
      [studentId, courseSlug, courseName, studentName, language, safeTheme]
    );
    return { certificate: publicCertificate(updatedResult.rows[0]), created: false };
  }

  const certificateCode = `CERT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const insertedResult = await pool.query(
    `INSERT INTO student_course_certificates (student_id, course_slug, course_name, student_name, language, theme, certificate_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (student_id, course_slug) DO NOTHING
     RETURNING course_slug, course_name, student_name, language, theme, certificate_code, issued_at`,
    [studentId, courseSlug, courseName, studentName, language, safeTheme, certificateCode]
  );

  if (insertedResult.rows[0]) {
    return { certificate: publicCertificate(insertedResult.rows[0]), created: true };
  }

  const concurrentResult = await pool.query(
    `SELECT course_slug, course_name, student_name, language, theme, certificate_code, issued_at
       FROM student_course_certificates
      WHERE student_id = $1 AND course_slug = $2`,
    [studentId, courseSlug]
  );
  return { certificate: publicCertificate(concurrentResult.rows[0]), created: false };
}

async function findByCode(certificateCode) {
  const { rows } = await pool.query(
    `SELECT course_slug, course_name, student_name, language, theme, certificate_code, issued_at
       FROM student_course_certificates
      WHERE certificate_code = $1`,
    [certificateCode]
  );
  return rows[0] ? publicCertificate(rows[0]) : null;
}

// -- SVG rendering (Frame Only / بدون نصوص داخلية) --------------------------

function circuitFan(x, y, dx, dy, color) {
  const seg = 46;
  const lines = [];
  const nodes = [];
  for (let i = 0; i < 6; i += 1) {
    const x1 = x;
    const y1 = y + dy * i * seg;
    const x2 = x + dx * (140 + i * 30);
    lines.push(`M${x1} ${y1} H${x2}`);
    nodes.push(`<circle cx="${x2}" cy="${y1}" r="4"/>`);
  }
  return `<g stroke="${color}" stroke-width="2" fill="none" opacity="0.5">${lines.map((d) => `<path d="${d}"/>`).join('')}</g><g fill="${color}" opacity="0.8">${nodes.join('')}</g>`;
}

function badgeGroup({ cx, cy, size, plate, logo }) {
  const r = size / 2;
  const plateCircle = plate
    ? `<circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="#ffffff"/>`
    : '';
  return `<g>${plateCircle}<image x="${cx - r}" y="${cy - r}" width="${size}" height="${size}" href="${logo}" preserveAspectRatio="xMidYMid meet"/></g>`;
}

function buildLightSvg(certificate, qrDataUrl) {
  const logo = logoDataUrl();
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" lang="${certificate.language}">
  <defs>
    <linearGradient id="frameGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b3fe4"/><stop offset="1" stop-color="#1fa8f2"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="#ffffff"/>
  <rect x="10" y="10" width="1580" height="880" rx="18" fill="none" stroke="url(#frameGradient)" stroke-width="10"/>
  <rect x="26" y="26" width="1548" height="848" rx="10" fill="none" stroke="#dfe3ea" stroke-width="2"/>
  ${circuitFan(1580, 40, -1, 1, '#b9c3ea')}
  ${circuitFan(20, 860, 1, -1, '#b9c3ea')}
  ${badgeGroup({ cx: 800, cy: 118, size: 150, plate: false, logo })}
</svg>`;
}

function buildDarkSvg(certificate, qrDataUrl) {
  const logo = logoDataUrl();
  const dots = `
    <pattern id="dotGrid" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="#123044"/>
    </pattern>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" lang="${certificate.language}">
  <defs>
    <linearGradient id="neonFrame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00e5ff"/><stop offset="1" stop-color="#5b6bff"/></linearGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    ${dots}
  </defs>
  <rect width="1600" height="900" fill="#050914"/>
  <rect width="1600" height="900" fill="url(#dotGrid)"/>
  ${circuitFan(1580, 40, -1, 1, '#3fd2ff')}
  ${circuitFan(1580, 860, -1, -1, '#3fd2ff')}
  ${circuitFan(20, 40, 1, 1, '#3fd2ff')}
  ${circuitFan(20, 860, 1, -1, '#3fd2ff')}
  <rect x="12" y="12" width="1576" height="876" rx="16" fill="none" stroke="url(#neonFrame)" stroke-width="4" filter="url(#glow)"/>
  <rect x="30" y="30" width="1540" height="840" rx="10" fill="none" stroke="#123044" stroke-width="2"/>
  ${badgeGroup({ cx: 800, cy: 118, size: 150, plate: true, logo })}
</svg>`;
}

async function renderCertificateSvg(certificate) {
  const qrDataUrl = await QRCode.toDataURL(certificate.verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 640,
  });
  return normalizeTheme(certificate.theme) === 'dark'
    ? buildDarkSvg(certificate, qrDataUrl)
    : buildLightSvg(certificate, qrDataUrl);
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
    subject: `شهادة إتمام الدورة — ${certificate.courseName}`,
    html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#17233b"><h2>مبروك يا ${studentName}</h2><p>لقد أتممت متطلبات دورة <strong>${courseName}</strong> بنجاح.</p><p>أرفقنا شهادتك بصيغة صورة متجهية عالية الجودة، ويمكنك حفظها أو طباعتها بأي دقة.</p><p>رمز الشهادة: <strong>${escapeHtml(certificate.certificateCode)}</strong></p><p><a href="${verificationLink}">فتح صفحة التحقق من الشهادة</a></p><p style="color:#617384;font-size:12px">هذه رسالة آلية من نادي الأمن السيبراني بالجامعة العربية المفتوحة.</p></div>`,
    attachments: [attachment],
  });
}

function queueCertificateEmail({ certificate, recipientEmail }) {
  setImmediate(() => {
    sendCertificateEmail({ certificate, recipientEmail })
      .then((result) => {
        if (!result.success) {
          console.error(`Certificate email failed for ${certificate.certificateCode}:`, result.error || 'unknown error');
        }
      })
      .catch((error) => {
        console.error(`Certificate delivery task failed for ${certificate.certificateCode}:`, error.message);
      });
  });
}

async function withQrDataUrl(certificate) {
  const qrDataUrl = await QRCode.toDataURL(certificate.verificationUrl, {
    errorCorrectionLevel: 'M', margin: 1, width: 220,
  });
  return { ...certificate, qrDataUrl };
}

module.exports = {
  VALID_THEMES,
  normalizeTheme,
  studentFullName,
  issueCertificate,
  findByCode,
  renderCertificateSvg,
  createCertificateAttachment,
  queueCertificateEmail,
  withQrDataUrl,
};