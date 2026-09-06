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

  <!-- الشعار المركب الحقيقي (الأقواس الخارجية مع الأيقونة والدوائر المتصلة بمنتصف الصدارة) -->
  <g transform="translate(800, 95)">
    <!-- القوس العلوي الأيمن والمسارات الدائرية -->
    <path d="M 35 -45 A 55 55 0 0 1 75 15 L 75 35" fill="none" stroke="url(#frameGrad)" stroke-width="3" stroke-linecap="round"/>
    <!-- القوس السفلي الأيسر والمسارات الدائرية -->
    <path d="M -35 45 A 55 55 0 0 1 -75 -15 L -75 -35" fill="none" stroke="url(#frameGrad)" stroke-width="3" stroke-linecap="round"/>
    <!-- نقاط دوائر التوصيل التقنية الخارجية للشعار -->
    <circle cx="65" cy="-25" r="4.5" fill="#ffffff" stroke="#7c3aed" stroke-width="2"/>
    <circle cx="-65" cy="25" r="4.5" fill="#ffffff" stroke="#4f46e5" stroke-width="2"/>
    <circle cx="25" cy="62" r="4.5" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
    <circle cx="-25" cy="-62" r="4.5" fill="#ffffff" stroke="#7c3aed" stroke-width="2"/>

    <!-- أيقونة البوابة الأمنية في المركز تماماً -->
    <g transform="translate(-20, -22)" fill="none" stroke="url(#frameGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M 20 5 C 10 5 4 13 4 27 L 4 38 L 16 38 L 16 24 C 16 20 24 20 24 24 L 24 38 L 36 38 L 36 27 C 36 13 30 5 20 5 Z" />
      <circle cx="12" cy="21" r="3" fill="#ffffff"/>
      <circle cx="28" cy="18" r="3" fill="#ffffff"/>
    </g>
  </g>

  <!-- اسم النادي تحت الشعار مباشرة -->
  <text x="800" y="185" text-anchor="middle" fill="#0f172a" font-family='${sansStack}' font-size="16" font-weight="800" letter-spacing="1">Cyber Security Club</text>
  <text x="800" y="205" text-anchor="middle" fill="#475569" font-family='${sansStack}' font-size="11" font-weight="600" letter-spacing="0.5">Arab Open University</text>

  <!-- عنوان الشهادة الرئيسي -->
  <text x="800" y="250" text-anchor="middle" fill="url(#titleGrad)" font-family='${bodyStack}' font-size="40" font-weight="800" letter-spacing="1">${escapeXml(f.title)}</text>
  <text x="800" y="290" text-anchor="middle" fill="#334155" font-family='${sansStack}' font-size="18" font-weight="600">${escapeXml(f.awardedTo)}</text>

  <!-- اسم الطالب البارز -->
  <text x="800" y="360" text-anchor="middle" fill="#0f172a" font-family='${sansStack}' font-size="46" font-weight="800">${escapeXml(certificate.studentName)}</text>
  <line x1="400" y1="395" x2="1200" y2="395" stroke="url(#frameGrad)" stroke-width="2.5"/>

  <!-- السطر التعريفي الأول -->
  <text x="800" y="445" text-anchor="middle" fill="#1e293b" font-family='${sansStack}' font-size="18" font-weight="600">${escapeXml(f.statementLine1)}</text>

  <!-- اسم الدورة التدريبية -->
  <text x="800" y="510" text-anchor="middle" fill="#1d4ed8" font-family='${sansStack}' font-size="30" font-weight="800">${escapeXml(certificate.courseName)}</text>

  <!-- السطر التعريفي الثاني -->
  <text x="800" y="570" text-anchor="middle" fill="#334155" font-family='${sansStack}' font-size="16" font-weight="600">${escapeXml(f.statementLine2)}</text>

  <!-- تاريخ الإصدار الرسمي -->
  <text x="800" y="630" text-anchor="middle" fill="#475569" font-family='${sansStack}' font-size="16" font-weight="700">${escapeXml(f.awardedDay)} ${escapeXml(f.issueDate)}</text>

  <!-- صندوق الـ QR Code ورمز التحقق في الزاوية السفلى -->
  <g transform="translate(1310, 680)">
    <rect x="0" y="0" width="120" height="120" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
    <image x="10" y="10" width="100" height="100" href="${qrDataUrl}" xlink:href="${qrDataUrl}"/>
    <text x="-15" y="50" text-anchor="end" fill="#1e293b" font-family='${sansStack}' font-size="14" font-weight="800">${escapeXml(f.qrLabel)}</text>
    <text x="-15" y="75" text-anchor="end" fill="#475569" font-family='${sansStack}' font-size="12" font-weight="700">${escapeXml(certificate.certificateCode)}</text>
  </g>
</svg>`;
}
