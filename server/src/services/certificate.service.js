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

  <!-- الشعار الكامل والمركب (الأقواس الخارجية + البوابة والدوائر الداخلية) -->
  <g transform="translate(710, 25)">
    <!-- الأقواس والمسارات الدائرية الخارجية -->
    <g fill="none" stroke="url(#frameGrad)" stroke-width="2.5" stroke-linecap="round">
      <path d="M 90 20 A 75 75 0 1 0 165 95" />
      <path d="M 25 90 A 75 75 0 0 0 95 160" />
      <circle cx="150" cy="50" r="4" fill="#ffffff" stroke="#7c3aed" stroke-width="2"/>
      <circle cx="40" cy="110" r="4" fill="#ffffff" stroke="#4f46e5" stroke-width="2"/>
      <circle cx="110" cy="145" r="4" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
    </g>
    <!-- أيقونة البوابة والدوائر الداخلية -->
    <g transform="translate(48, 25)" fill="none" stroke="url(#frameGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 32 6 C 16 6 6 18 6 36 L 6 48 L 22 48 L 22 30 C 22 24 32 24 32 30 L 32 48 L 48 48 L 48 36 C 48 18 38 6 32 6 Z" />
      <circle cx="18" cy="26" r="3.5" fill="#ffffff"/>
      <circle cx="34" cy="22" r="3.5" fill="#ffffff"/>
    </g>
  </g>

  <!-- اسم النادي تحت الشعار مباشرة -->
  <text x="800" y="180" text-anchor="middle" fill="#0f172a" font-family='${sansStack}' font-size="16" font-weight="800" letter-spacing="1">Cyber Security Club</text>
  <text x="800" y="200" text-anchor="middle" fill="#475569" font-family='${sansStack}' font-size="11" font-weight="600" letter-spacing="0.5">Arab Open University</text>

  <!-- عنوان الشهادة الرئيسي -->
  <text x="800" y="245" text-anchor="middle" fill="url(#titleGrad)" font-family='${bodyStack}' font-size="40" font-weight="800" letter-spacing="1">${escapeXml(f.title)}</text>
  <text x="800" y="285" text-anchor="middle" fill="#334155" font-family='${sansStack}' font-size="18" font-weight="600">${escapeXml(f.awardedTo)}</text>

  <!-- اسم الطالب البارز -->
  <text x="800" y="355" text-anchor="middle" fill="#0f172a" font-family='${sansStack}' font-size="46" font-weight="800">${escapeXml(certificate.studentName)}</text>
  <line x1="400" y1="390" x2="1200" y2="390" stroke="url(#frameGrad)" stroke-width="2.5"/>

  <!-- السطر التعريفي الأول -->
  <text x="800" y="440" text-anchor="middle" fill="#1e293b" font-family='${sansStack}' font-size="18" font-weight="600">${escapeXml(f.statementLine1)}</text>

  <!-- اسم الدورة التدريبية -->
  <text x="800" y="505" text-anchor="middle" fill="#1d4ed8" font-family='${sansStack}' font-size="30" font-weight="800">${escapeXml(certificate.courseName)}</text>

  <!-- السطر التعريفي الثاني -->
  <text x="800" y="565" text-anchor="middle" fill="#334155" font-family='${sansStack}' font-size="16" font-weight="600">${escapeXml(f.statementLine2)}</text>

  <!-- تاريخ الإصدار الرسمي -->
  <text x="800" y="625" text-anchor="middle" fill="#475569" font-family='${sansStack}' font-size="16" font-weight="700">${escapeXml(f.awardedDay)} ${escapeXml(f.issueDate)}</text>

  <!-- صندوق الـ QR Code ورمز التحقق في الزاوية السفلى -->
  <g transform="translate(1310, 680)">
    <rect x="0" y="0" width="120" height="120" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
    <image x="10" y="10" width="100" height="100" href="${qrDataUrl}" xlink:href="${qrDataUrl}"/>
    <text x="-15" y="50" text-anchor="end" fill="#1e293b" font-family='${sansStack}' font-size="14" font-weight="800">${escapeXml(f.qrLabel)}</text>
    <text x="-15" y="75" text-anchor="end" fill="#475569" font-family='${sansStack}' font-size="12" font-weight="700">${escapeXml(certificate.certificateCode)}</text>
  </g>
</svg>`;
}