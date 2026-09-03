const crypto = require('crypto');
const QRCode = require('qrcode');
const { pool } = require('../db/pool');
const env = require('../config/env');
const { sendEmail } = require('../utils/email');

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
    certificateCode: row.certificate_code,
    issuedAt: row.issued_at,
    status: 'valid',
    verificationUrl: verificationUrl(row.certificate_code),
  };
}

async function issueCertificate({ studentId, courseSlug, courseName, studentName, language, updateExisting = false }) {
  const existingResult = await pool.query(
    `SELECT course_slug, course_name, student_name, language, certificate_code, issued_at
       FROM student_course_certificates
      WHERE student_id = $1 AND course_slug = $2`,
    [studentId, courseSlug]
  );
  const existing = existingResult.rows[0];

  if (existing) {
    if (!updateExisting) return { certificate: publicCertificate(existing), created: false };
    const updatedResult = await pool.query(
      `UPDATE student_course_certificates
          SET course_name = $3, student_name = $4, language = $5
        WHERE student_id = $1 AND course_slug = $2
        RETURNING course_slug, course_name, student_name, language, certificate_code, issued_at`,
      [studentId, courseSlug, courseName, studentName, language]
    );
    return { certificate: publicCertificate(updatedResult.rows[0]), created: false };
  }

  const certificateCode = `CERT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const insertedResult = await pool.query(
    `INSERT INTO student_course_certificates (student_id, course_slug, course_name, student_name, language, certificate_code)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (student_id, course_slug) DO NOTHING
     RETURNING course_slug, course_name, student_name, language, certificate_code, issued_at`,
    [studentId, courseSlug, courseName, studentName, language, certificateCode]
  );

  if (insertedResult.rows[0]) {
    return { certificate: publicCertificate(insertedResult.rows[0]), created: true };
  }

  // A second request completed at the same time. Reuse the one certificate
  // that won the unique constraint instead of issuing or emailing a duplicate.
  const concurrentResult = await pool.query(
    `SELECT course_slug, course_name, student_name, language, certificate_code, issued_at
       FROM student_course_certificates
      WHERE student_id = $1 AND course_slug = $2`,
    [studentId, courseSlug]
  );
  return { certificate: publicCertificate(concurrentResult.rows[0]), created: false };
}

async function createCertificateAttachment(certificate) {
  const qrDataUrl = await QRCode.toDataURL(certificate.verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 720,
  });
  const issueDate = new Date(certificate.issuedAt).toLocaleDateString(
    certificate.language === 'en' ? 'en-GB' : 'ar-SA'
  );
  const title = certificate.language === 'en' ? 'Certificate of Completion' : 'شهادة إتمام';
  const statement = certificate.language === 'en'
    ? 'This certifies that the student has successfully completed the course'
    : 'يشهد نادي الأمن السيبراني بالجامعة العربية المفتوحة بأن الطالب/ـة قد أتم/ـت بنجاح الدورة التدريبية';
  const issuedLabel = certificate.language === 'en' ? 'Issue date' : 'تاريخ الإصدار';
  const codeLabel = certificate.language === 'en' ? 'Certificate code' : 'رمز الشهادة';
  const qrLabel = certificate.language === 'en' ? 'Scan to verify this certificate' : 'امسح الرمز للتحقق من الشهادة';
  const documentDirection = certificate.language === 'en' ? 'ltr' : 'rtl';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1131" viewBox="0 0 1600 1131" role="img" aria-labelledby="certificate-title certificate-description" lang="${certificate.language}" direction="${documentDirection}">
  <title id="certificate-title">${escapeXml(title)}</title>
  <desc id="certificate-description">${escapeXml(`${certificate.studentName} - ${certificate.courseName} - ${certificate.certificateCode}`)}</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f9fcff"/><stop offset="1" stop-color="#edf7fb"/></linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b2e4f"/><stop offset="1" stop-color="#00aeca"/></linearGradient>
  </defs>
  <rect width="1600" height="1131" fill="url(#background)"/>
  <rect x="33" y="33" width="1534" height="1065" rx="12" fill="none" stroke="#caa950" stroke-width="16"/>
  <rect x="57" y="57" width="1486" height="1017" rx="8" fill="none" stroke="#123b61" stroke-width="5"/>
  <path d="M210 160h1180" stroke="url(#accent)" stroke-width="8"/>
  <text x="800" y="138" text-anchor="middle" fill="#0b2e4f" font-family="Arial, Tahoma, sans-serif" font-size="24" font-weight="700" letter-spacing="5">AOU CYBER SECURITY CLUB</text>
  <text x="800" y="268" text-anchor="middle" fill="#123b61" font-family="Noto Naskh Arabic, Noto Sans Arabic, Arial, Tahoma, sans-serif" font-size="72" font-weight="700" direction="${documentDirection}">${escapeXml(title)}</text>
  <text x="800" y="360" text-anchor="middle" fill="#26384b" font-family="Noto Naskh Arabic, Noto Sans Arabic, Arial, Tahoma, sans-serif" font-size="31" direction="${documentDirection}">${escapeXml(statement)}</text>
  <text x="800" y="465" text-anchor="middle" fill="#0b2e4f" font-family="Noto Naskh Arabic, Noto Sans Arabic, Arial, Tahoma, sans-serif" font-size="62" font-weight="700" direction="${documentDirection}">${escapeXml(certificate.studentName)}</text>
  <path d="M385 497h830" stroke="#caa950" stroke-width="3"/>
  <text x="800" y="580" text-anchor="middle" fill="#26384b" font-family="Noto Naskh Arabic, Noto Sans Arabic, Arial, Tahoma, sans-serif" font-size="30" direction="${documentDirection}">${certificate.language === 'en' ? 'Course title' : 'عنوان الدورة'}</text>
  <text x="800" y="652" text-anchor="middle" fill="#0b2e4f" font-family="Noto Naskh Arabic, Noto Sans Arabic, Arial, Tahoma, sans-serif" font-size="48" font-weight="700" direction="${documentDirection}">${escapeXml(certificate.courseName)}</text>
  <text x="360" y="840" text-anchor="middle" fill="#26384b" font-family="Noto Naskh Arabic, Noto Sans Arabic, Arial, Tahoma, sans-serif" font-size="25" direction="${documentDirection}">${escapeXml(issuedLabel)}</text>
  <text x="360" y="885" text-anchor="middle" fill="#0b2e4f" font-family="Arial, Tahoma, sans-serif" font-size="27" font-weight="700">${escapeXml(issueDate)}</text>
  <text x="800" y="840" text-anchor="middle" fill="#26384b" font-family="Noto Naskh Arabic, Noto Sans Arabic, Arial, Tahoma, sans-serif" font-size="25" direction="${documentDirection}">${escapeXml(codeLabel)}</text>
  <text x="800" y="885" text-anchor="middle" fill="#0b2e4f" font-family="Arial, Tahoma, sans-serif" font-size="26" font-weight="700">${escapeXml(certificate.certificateCode)}</text>
  <rect x="1122" y="740" width="250" height="250" rx="12" fill="#fff" stroke="#d6e7ed" stroke-width="4"/>
  <image x="1137" y="755" width="220" height="220" href="${qrDataUrl}"/>
  <text x="1247" y="1024" text-anchor="middle" fill="#26384b" font-family="Noto Naskh Arabic, Noto Sans Arabic, Arial, Tahoma, sans-serif" font-size="19" direction="${documentDirection}">${escapeXml(qrLabel)}</text>
  <text x="800" y="1036" text-anchor="middle" fill="#617384" font-family="Noto Naskh Arabic, Noto Sans Arabic, Arial, Tahoma, sans-serif" font-size="21" direction="${documentDirection}">https://cyberclub.aou.edu.sa</text>
</svg>`;

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
  studentFullName,
  issueCertificate,
  createCertificateAttachment,
  queueCertificateEmail,
  withQrDataUrl,
};
