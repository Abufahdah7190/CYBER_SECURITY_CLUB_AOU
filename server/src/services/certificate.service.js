function circuitFan(x, y, scaleX, scaleY, color) {
  return `<g transform="translate(${x}, ${y}) scale(${scaleX}, ${scaleY})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 0 0 L 120 0 L 150 30 L 220 30" />
    <circle cx="220" cy="30" r="4" fill="#ffffff" />
    <path d="M 40 0 L 70 30 L 140 30 L 170 60" />
    <circle cx="170" cy="60" r="4" fill="#ffffff" />
    <path d="M 80 0 L 100 20 L 180 20 L 210 50 L 260 50" />
    <circle cx="260" cy="50" r="4" fill="#ffffff" />
    <path d="M 0 40 L 50 40 L 80 70 L 150 70" />
    <circle cx="150" cy="70" r="4" fill="#ffffff" />
  </g>`;
}

function buildLightSvg(certificate, qrDataUrl) {
  const f = commonFields(certificate);
  const isEn = f.isEn;
  const bodyStack = isEn ? 'Georgia, "Times New Roman", serif' : '"Cairo", "Tahoma", sans-serif';
  const sansStack = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const logo = logoDataUrl();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" lang="${normalizeLanguage(certificate.language)}">
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

  <!-- الإطار الأزرق المتدرج النظيف -->
  <rect x="30" y="30" width="1540" height="840" rx="12" fill="none" stroke="url(#frameGrad)" stroke-width="5"/>
  <rect x="42" y="42" width="1516" height="816" rx="8" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>

  <!-- الخطوط التقنية في الزوايا بعيدة عن الشعار وموجهة للخارج -->
  ${circuitFan(1300, 60, 1, 1, '#818cf8')}
  ${circuitFan(300, 840, -1, -1, '#818cf8')}

  <!-- شعار النادي الدائري في الأعلى -->
  <circle cx="800" cy="115" r="45" fill="#ffffff" stroke="#c7d2fe" stroke-width="2.5"/>
  <image x="755" y="70" width="90" height="90" href="${logo}" preserveAspectRatio="xMidYMid meet"/>

  <!-- اسم النادي / الجهة المصدرة -->
  <text x="800" y="185" text-anchor="middle" fill="#64748b" font-family="${sansStack}" font-size="14" font-weight="700" letter-spacing="2">${escapeXml(f.clubSub)}</text>

  <!-- عنوان الشهادة الرئيسي -->
  <text x="800" y="235" text-anchor="middle" fill="url(#titleGrad)" font-family="${bodyStack}" font-size="38" font-weight="800" letter-spacing="1">${escapeXml(f.title)}</text>
  <text x="800" y="270" text-anchor="middle" fill="#64748b" font-family="${sansStack}" font-size="16">${escapeXml(f.awardedTo)}</text>

  <!-- اسم الطالب البارز -->
  <text x="800" y="340" text-anchor="middle" fill="#0f172a" font-family="${sansStack}" font-size="42" font-weight="700">${escapeXml(certificate.studentName)}</text>
  <line x1="420" y1="375" x2="1180" y2="375" stroke="url(#frameGrad)" stroke-width="2"/>

  <!-- السطر التعريفي الأول -->
  <text x="800" y="425" text-anchor="middle" fill="#334155" font-family="${sansStack}" font-size="17">${escapeXml(f.statementLine1)}</text>

  <!-- اسم الدورة التدريبية -->
  <text x="800" y="490" text-anchor="middle" fill="#1e293b" font-family="${sansStack}" font-size="28" font-weight="700">${escapeXml(certificate.courseName)}</text>

  <!-- السطر التعريفي الثاني -->
  <text x="800" y="550" text-anchor="middle" fill="#475569" font-family="${sansStack}" font-size="15">${escapeXml(f.statementLine2)}</text>

  <!-- تاريخ الإصدار الرسمي -->
  <text x="800" y="605" text-anchor="middle" fill="#64748b" font-family="${sansStack}" font-size="15" font-weight="600">${escapeXml(f.awardedDay)} ${escapeXml(f.issueDate)}</text>

  <!-- صندوق الـ QR Code ورمز التحقق في الزاوية السفلى -->
  <g transform="translate(1310, 680)">
    <rect x="0" y="0" width="120" height="120" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <image x="10" y="10" width="100" height="100" href="${qrDataUrl}"/>
    <text x="-15" y="50" text-anchor="end" fill="#334155" font-family="${sansStack}" font-size="13" font-weight="700">${escapeXml(f.qrLabel)}</text>
    <text x="-15" y="75" text-anchor="end" fill="#64748b" font-family="${sansStack}" font-size="11">${escapeXml(certificate.certificateCode)}</text>
  </g>
</svg>`;
}function circuitFan(x, y, scaleX, scaleY, color) {
  return `<g transform="translate(${x}, ${y}) scale(${scaleX}, ${scaleY})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 0 0 L 120 0 L 150 30 L 220 30" />
    <circle cx="220" cy="30" r="4" fill="#ffffff" />
    <path d="M 40 0 L 70 30 L 140 30 L 170 60" />
    <circle cx="170" cy="60" r="4" fill="#ffffff" />
    <path d="M 80 0 L 100 20 L 180 20 L 210 50 L 260 50" />
    <circle cx="260" cy="50" r="4" fill="#ffffff" />
    <path d="M 0 40 L 50 40 L 80 70 L 150 70" />
    <circle cx="150" cy="70" r="4" fill="#ffffff" />
  </g>`;
}

function buildLightSvg(certificate, qrDataUrl) {
  const f = commonFields(certificate);
  const isEn = f.isEn;
  const bodyStack = isEn ? 'Georgia, "Times New Roman", serif' : '"Cairo", "Tahoma", sans-serif';
  const sansStack = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const logo = logoDataUrl();

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" lang="${normalizeLanguage(certificate.language)}">
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

  <!-- الإطار الأزرق المتدرج النظيف -->
  <rect x="30" y="30" width="1540" height="840" rx="12" fill="none" stroke="url(#frameGrad)" stroke-width="5"/>
  <rect x="42" y="42" width="1516" height="816" rx="8" fill="none" stroke="#e2e8f0" stroke-width="1.5"/>

  <!-- الخطوط التقنية في الزوايا بعيدة عن الشعار وموجهة للخارج -->
  ${circuitFan(1300, 60, 1, 1, '#818cf8')}
  ${circuitFan(300, 840, -1, -1, '#818cf8')}

  <!-- شعار النادي الدائري في الأعلى -->
  <circle cx="800" cy="115" r="45" fill="#ffffff" stroke="#c7d2fe" stroke-width="2.5"/>
  <image x="755" y="70" width="90" height="90" href="${logo}" preserveAspectRatio="xMidYMid meet"/>

  <!-- اسم النادي / الجهة المصدرة -->
  <text x="800" y="185" text-anchor="middle" fill="#64748b" font-family="${sansStack}" font-size="14" font-weight="700" letter-spacing="2">${escapeXml(f.clubSub)}</text>

  <!-- عنوان الشهادة الرئيسي -->
  <text x="800" y="235" text-anchor="middle" fill="url(#titleGrad)" font-family="${bodyStack}" font-size="38" font-weight="800" letter-spacing="1">${escapeXml(f.title)}</text>
  <text x="800" y="270" text-anchor="middle" fill="#64748b" font-family="${sansStack}" font-size="16">${escapeXml(f.awardedTo)}</text>

  <!-- اسم الطالب البارز -->
  <text x="800" y="340" text-anchor="middle" fill="#0f172a" font-family="${sansStack}" font-size="42" font-weight="700">${escapeXml(certificate.studentName)}</text>
  <line x1="420" y1="375" x2="1180" y2="375" stroke="url(#frameGrad)" stroke-width="2"/>

  <!-- السطر التعريفي الأول -->
  <text x="800" y="425" text-anchor="middle" fill="#334155" font-family="${sansStack}" font-size="17">${escapeXml(f.statementLine1)}</text>

  <!-- اسم الدورة التدريبية -->
  <text x="800" y="490" text-anchor="middle" fill="#1e293b" font-family="${sansStack}" font-size="28" font-weight="700">${escapeXml(certificate.courseName)}</text>

  <!-- السطر التعريفي الثاني -->
  <text x="800" y="550" text-anchor="middle" fill="#475569" font-family="${sansStack}" font-size="15">${escapeXml(f.statementLine2)}</text>

  <!-- تاريخ الإصدار الرسمي -->
  <text x="800" y="605" text-anchor="middle" fill="#64748b" font-family="${sansStack}" font-size="15" font-weight="600">${escapeXml(f.awardedDay)} ${escapeXml(f.issueDate)}</text>

  <!-- صندوق الـ QR Code ورمز التحقق في الزاوية السفلى -->
  <g transform="translate(1310, 680)">
    <rect x="0" y="0" width="120" height="120" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <image x="10" y="10" width="100" height="100" href="${qrDataUrl}"/>
    <text x="-15" y="50" text-anchor="end" fill="#334155" font-family="${sansStack}" font-size="13" font-weight="700">${escapeXml(f.qrLabel)}</text>
    <text x="-15" y="75" text-anchor="end" fill="#64748b" font-family="${sansStack}" font-size="11">${escapeXml(certificate.certificateCode)}</text>
  </g>
</svg>`;
}