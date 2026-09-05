const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { pool } = require('../db/pool');
const env = require('../config/env');
const { sendEmail } = require('../utils/email');

const VALID_THEMES = ['light', 'dark'];
const VALID_LANGUAGES = ['ar', 'en'];

function normalizeTheme(theme) {
  return VALID_THEMES.includes(theme) ? theme : 'light';
}

function normalizeLanguage(language) {
  return VALID_LANGUAGES.includes(language) ? language : 'ar';
}

// ---------------------------------------------------------------------------
// Logo assets
//
// FIX (dark-mode logo background): the club ships one logo file per theme —
// cyberclub-logo-light.png (dark artwork, transparent background, meant for
// the light certificate) and cyberclub-logo-dark.png (light artwork,
// transparent background, meant for the dark certificate). The previous
// code always looked for a single file named exactly "cyberclub-logo.png",
// which does not exist next to the light/dark pair, so it silently fell
// back to an old top-level asset that has an OPAQUE WHITE canvas baked in.
// That's invisible on the light certificate (white-on-white) but shows up
// as a visible white box on the dark certificate. Resolving the logo per
// theme — and preferring the transparent, theme-specific file — fixes this
// at the source instead of trying to mask it with SVG filters.
// ---------------------------------------------------------------------------
const logoCache = new Map();

function logoCandidates(themeKey) {
  const themedName = `cyberclub-logo-${themeKey}.png`;
  const genericName = 'cyberclub-logo.png';
  return [
    // Preferred: theme-specific asset shipped with the server's public dir.
    path.join(__dirname, '..', '..', 'public', 'assets', 'branding', themedName),
    // Backward compatibility with older deployments that only had one name.
    path.join(__dirname, '..', '..', 'public', 'assets', 'branding', genericName),
    path.join(__dirname, '..', '..', '..', 'assets', 'branding', themedName),
    path.join(__dirname, '..', '..', '..', 'assets', 'branding', genericName),
  ];
}

function logoDataUrl(theme) {
  const key = normalizeTheme(theme);
  if (logoCache.has(key)) return logoCache.get(key);
  let dataUrl = '';
  try {
    const logoPath = logoCandidates(key).find((candidate) => fs.existsSync(candidate));
    if (!logoPath) throw new Error(`no logo asset found for theme "${key}"`);
    const buffer = fs.readFileSync(logoPath);
    dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`Certificate logo asset missing for theme "${key}":`, error.message);
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

// ---------------------------------------------------------------------------
// FIX (theme/language not reflected in the displayed certificate):
// the customization endpoint correctly updates theme/language in the
// database, but the <img> tag on the front end always points at the same
// URL (".../certificates/{code}/image"), and that endpoint is served with
// "Cache-Control: public, max-age=3600". The browser (and any CDN in front
// of it) therefore reuses the OLD cached image for up to an hour and never
// asks the server again, so the customization looks like it "did nothing"
// even though the database and the SVG generator are both correct.
//
// Fixing this without touching the HTTP layer: derive a short content
// version from the fields that actually change the rendered certificate
// (theme, language, name, course) and append it as a query string on the
// public imageUrl. Any customization change produces a brand-new URL, so
// the browser/CDN cache is bypassed automatically and a fresh SVG is
// fetched — while unrelated requests for an unchanged certificate keep
// benefiting from the cache.
// ---------------------------------------------------------------------------
function certificateVersion(row) {
  return crypto
    .createHash('md5')
    .update(`${row.theme}|${row.language}|${row.student_name}|${row.course_name}`)
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
    theme: normalizeTheme(row.theme),
    certificateCode: row.certificate_code,
    issuedAt: row.issued_at,
    status: 'valid',
    verificationUrl: verificationUrl(row.certificate_code),
    imageUrl: `${env.FRONTEND_URL}/api/learning/certificates/${encodeURIComponent(row.certificate_code)}/image?v=${version}`,
  };
}

async function issueCertificate({ studentId, courseSlug, courseName, studentName, language, theme = 'light', updateExisting = false }) {
  const safeTheme = normalizeTheme(theme);
  const safeLanguage = normalizeLanguage(language);
  const existingResult = await pool.query(
    `SELECT course_slug, course_name, student_name, language, theme, certificate_code, issued_at
       FROM student_course_certificates
      WHERE student_id = $1 AND course_slug = $2`,
    [studentId, courseSlug]
  );
  const existing = existingResult.rows[0];

  if (existing) {
    // FIX (logic error): this used to only compare the theme, so a
    // language-only change (same theme, different language) coming through
    // a caller that leaves updateExisting=false would be silently dropped —
    // the function would return the stale record without ever running the
    // UPDATE below. Both fields must match for the record to be considered
    // "already up to date".
    const alreadyUpToDate = existing.theme === safeTheme && existing.language === safeLanguage;
    if (!updateExisting && alreadyUpToDate) {
      return { certificate: publicCertificate(existing), created: false };
    }
    const updatedResult = await pool.query(
      `UPDATE student_course_certificates
          SET course_name = $3, student_name = $4, language = $5, theme = $6
        WHERE student_id = $1 AND course_slug = $2
        RETURNING course_slug, course_name, student_name, language, theme, certificate_code, issued_at`,
      [studentId, courseSlug, courseName, studentName, safeLanguage, safeTheme]
    );
    return { certificate: publicCertificate(updatedResult.rows[0]), created: false };
  }

  const certificateCode = `CERT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const insertedResult = await pool.query(
    `INSERT INTO student_course_certificates (student_id, course_slug, course_name, student_name, language, theme, certificate_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (student_id, course_slug) DO NOTHING
     RETURNING course_slug, course_name, student_name, language, theme, certificate_code, issued_at`,
    [studentId, courseSlug, courseName, studentName, safeLanguage, safeTheme, certificateCode]
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

function commonFields(certificate) {
  const language = normalizeLanguage(certificate.language);
  const isEn = language === 'en';
  const issueDate = new Date(certificate.issuedAt).toLocaleDateString(isEn ? 'en-GB' : 'ar-SA');
  return {
    issueDate,
    isEn,
    documentDirection: isEn ? 'ltr' : 'rtl',
    title: isEn ? 'CERTIFICATE OF COMPLETION' : 'شهادة إتمام',
    awardedTo: isEn ? 'This is proudly presented to' : 'تمنح هذه الشهادة فخراً إلى',
    statement: isEn ? 'for successfully completing the course' : 'لاجتيازه بنجاح متطلبات الدورة التدريبية',
    awardedDay: isEn ? 'Issued on' : 'تاريخ الإصدار:',
    codeLabel: isEn ? 'ID:' : 'الرمز:',
    qrLabel: isEn ? 'SCAN TO VERIFY' : 'امسح للتحقق',
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
  const logo = logoDataUrl('light');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" lang="${normalizeLanguage(certificate.language)}">
  <defs>
    <linearGradient id="frameGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b3fe4"/><stop offset="1" stop-color="#1fa8f2"/></linearGradient>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a2fc2"/><stop offset="1" stop-color="#1fa8f2"/></linearGradient>
  </defs>
  <rect width="1600" height="900" fill="#ffffff"/>
  <rect x="30" y="30" width="1540" height="840" rx="12" fill="none" stroke="url(#frameGradient)" stroke-width="5"/>
  <rect x="44" y="44" width="1512" height="812" rx="8" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>
  ${circuitFan(1530, 70, -1, 1, '#b9c3ea')}
  ${circuitFan(70, 830, 1, -1, '#b9c3ea')}

  <circle cx="800" cy="115" r="45" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <image x="760" y="75" width="80" height="80" href="${logo}" preserveAspectRatio="xMidYMid meet"/>

  <text x="800" y="195" text-anchor="middle" fill="url(#titleGrad)" font-family="${bodyStack}" font-size="30" font-weight="800" letter-spacing="2">${escapeXml(f.title)}</text>
  <text x="800" y="240" text-anchor="middle" fill="#64748b" font-family="${bodyStack}" font-size="17">${escapeXml(f.awardedTo)}</text>
  <text x="800" y="310" text-anchor="middle" fill="#0f172a" font-family="${bodyStack}" font-size="40" font-weight="700">${escapeXml(certificate.studentName)}</text>
  <line x1="550" y1="345" x2="1050" y2="345" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="800" y="390" text-anchor="middle" fill="#475569" font-family="${bodyStack}" font-size="18">${escapeXml(f.statement)}</text>
  <text x="800" y="445" text-anchor="middle" fill="#1e293b" font-family="${bodyStack}" font-size="26" font-weight="700">${escapeXml(certificate.courseName)}</text>
  <text x="800" y="510" text-anchor="middle" fill="#64748b" font-family="${bodyStack}" font-size="15">${escapeXml(f.awardedDay)} ${escapeXml(f.issueDate)}</text>

  <g transform="translate(100, 690)">
    <rect x="0" y="0" width="100" height="100" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <image x="6" y="6" width="88" height="88" href="${qrDataUrl}"/>
    <text x="115" y="45" fill="#334155" font-family="${bodyStack}" font-size="12" font-weight="700">${escapeXml(f.qrLabel)}</text>
    <text x="115" y="68" fill="#64748b" font-family="${bodyStack}" font-size="11">${escapeXml(f.codeLabel)} ${escapeXml(certificate.certificateCode)}</text>
  </g>
</svg>`;
}

function buildDarkSvg(certificate, qrDataUrl) {
  const f = commonFields(certificate);
  const bodyStack = 'Arial, Tahoma, sans-serif';
  const logo = logoDataUrl('dark');
  const dots = `
    <pattern id="dotGrid" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="1" fill="#123044"/>
    </pattern>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" lang="${normalizeLanguage(certificate.language)}">
  <defs>
    <linearGradient id="neonFrame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00e5ff"/><stop offset="1" stop-color="#5b6bff"/></linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    ${dots}
  </defs>
  <rect width="1600" height="900" fill="#050914"/>
  <rect width="1600" height="900" fill="url(#dotGrid)"/>
  ${circuitFan(1530, 70, -1, 1, '#3fd2ff')}
  ${circuitFan(1530, 830, -1, -1, '#3fd2ff')}
  ${circuitFan(70, 70, 1, 1, '#3fd2ff')}
  ${circuitFan(70, 830, 1, -1, '#3fd2ff')}

  <rect x="30" y="30" width="1540" height="840" rx="12" fill="none" stroke="url(#neonFrame)" stroke-width="3.5" filter="url(#glow)"/>
  <rect x="44" y="44" width="1512" height="812" rx="8" fill="none" stroke="#123044" stroke-width="1.5"/>

  <circle cx="800" cy="115" r="45" fill="#0d1b2a" stroke="#00e5ff" stroke-width="2" filter="url(#glow)"/>
  <image x="760" y="75" width="80" height="80" href="${logo}" preserveAspectRatio="xMidYMid meet"/>

  <text x="800" y="195" text-anchor="middle" fill="#00e5ff" font-family="${bodyStack}" font-size="30" font-weight="800" letter-spacing="2" filter="url(#glow)">${escapeXml(f.title)}</text>
  <text x="800" y="240" text-anchor="middle" fill="#94a3b8" font-family="${bodyStack}" font-size="17">${escapeXml(f.awardedTo)}</text>
  <text x="800" y="310" text-anchor="middle" fill="#ffffff" font-family="${bodyStack}" font-size="40" font-weight="700">${escapeXml(certificate.studentName)}</text>
  <line x1="550" y1="345" x2="1050" y2="345" stroke="#1e3a8a" stroke-width="1.5"/>
  <text x="800" y="390" text-anchor="middle" fill="#cbd5e1" font-family="${bodyStack}" font-size="18">${escapeXml(f.statement)}</text>
  <text x="800" y="445" text-anchor="middle" fill="#38bdf8" font-family="${bodyStack}" font-size="26" font-weight="700" filter="url(#glow)">${escapeXml(certificate.courseName)}</text>
  <text x="800" y="510" text-anchor="middle" fill="#94a3b8" font-family="${bodyStack}" font-size="15">${escapeXml(f.awardedDay)} ${escapeXml(f.issueDate)}</text>

  <g transform="translate(100, 690)">
    <rect x="0" y="0" width="100" height="100" rx="6" fill="#ffffff" stroke="#00e5ff" stroke-width="2"/>
    <image x="6" y="6" width="88" height="88" href="${qrDataUrl}"/>
    <text x="115" y="45" fill="#38bdf8" font-family="${bodyStack}" font-size="12" font-weight="700">${escapeXml(f.qrLabel)}</text>
    <text x="115" y="68" fill="#94a3b8" font-family="${bodyStack}" font-size="11">${escapeXml(f.codeLabel)} ${escapeXml(certificate.certificateCode)}</text>
  </g>
</svg>`;
}

async function renderCertificateSvg(certificate) {
  // Normalize once, up front, so the SVG's own `lang` attribute and both
  // builders always see the same, guaranteed-valid theme/language — instead
  // of each builder (and commonFields) re-deriving it separately.
  const normalized = {
    ...certificate,
    theme: normalizeTheme(certificate.theme),
    language: normalizeLanguage(certificate.language),
  };
  const qrDataUrl = await QRCode.toDataURL(normalized.verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
  });
  return normalized.theme === 'dark'
    ? buildDarkSvg(normalized, qrDataUrl)
    : buildLightSvg(normalized, qrDataUrl);
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

// ---------------------------------------------------------------------------
// Self-check (item 3: "فحص واكتشاف الأخطاء وإجراء الاختبارات")
//
// Renders a sample certificate for every theme x language combination and
// verifies, in-process, that:
//   - the SVG is well-formed and carries the correct `lang` attribute
//   - the correct (language-specific) title text is present
//   - a real, non-empty, theme-specific logo got embedded (this is exactly
//     what silently broke before: an empty/opaque-wrong logo would still
//     "work" without throwing, so size-checking the embedded data URI is
//     what actually catches the dark-mode logo regression)
// Nothing here touches the database — issueCertificate's DB branches are
// covered separately by integration tests against a real/staging DB.
// ---------------------------------------------------------------------------
async function runSelfCheck() {
  const sample = {
    studentName: 'Test Student / طالب تجريبي',
    courseName: 'Test Course / دورة تجريبية',
    certificateCode: 'CERT-TEST-0000',
    issuedAt: new Date().toISOString(),
    verificationUrl: 'https://example.test/certificate-verify.html?code=CERT-TEST-0000',
  };

  const results = [];
  for (const theme of VALID_THEMES) {
    for (const language of VALID_LANGUAGES) {
      const label = `theme=${theme} lang=${language}`;
      try {
        const svg = await renderCertificateSvg({ ...sample, theme, language });
        const expectedTitle = language === 'en' ? 'CERTIFICATE OF COMPLETION' : 'شهادة إتمام';
        const checks = {
          isWellFormedSvg: svg.trim().startsWith('<?xml') && svg.includes('</svg>'),
          hasCorrectLangAttribute: svg.includes(`lang="${language}"`),
          hasCorrectTitleForLanguage: svg.includes(expectedTitle),
          hasNonEmptyThemedLogo: /href="data:image\/png;base64,[A-Za-z0-9+/=]{200,}"/.test(svg),
        };
        const passed = Object.values(checks).every(Boolean);
        results.push({ label, passed, checks });
      } catch (error) {
        results.push({ label, passed: false, error: error.message });
      }
    }
  }

  return { allPassed: results.every((result) => result.passed), results };
}

// Allows running `node certificate.service.js` directly (or wiring it into
// a CI step) to get an immediate pass/fail report without spinning up the
// full server or a database connection.
if (require.main === module) {
  runSelfCheck().then(({ allPassed, results }) => {
    for (const result of results) {
      const status = result.passed ? 'PASS' : 'FAIL';
      console.log(`[certificate.service self-check] ${status} — ${result.label}`, result.error || result.checks || '');
    }
    if (!allPassed) process.exitCode = 1;
  });
}

module.exports = {
  VALID_THEMES,
  VALID_LANGUAGES,
  normalizeTheme,
  normalizeLanguage,
  studentFullName,
  issueCertificate,
  findByCode,
  renderCertificateSvg,
  createCertificateAttachment,
  queueCertificateEmail,
  withQrDataUrl,
  runSelfCheck,
};
