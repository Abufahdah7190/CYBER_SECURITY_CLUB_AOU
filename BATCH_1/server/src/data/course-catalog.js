'use strict';

/**
 * Bilingual course names, kept in sync with the `seeds` array in
 * js/lms-data.js (the single source of truth for course content on the
 * frontend). This backend copy exists so a certificate's course name is
 * always resolved server-side from the certificate's own `language`,
 * instead of trusting whatever string the client happened to submit —
 * that was the bug where switching a certificate to English left the
 * course name in Arabic (the client was just replaying the old value).
 *
 * If you add/rename a course in js/lms-data.js, mirror the change here too.
 */
const COURSE_NAMES = {
  'cyber-basics': { ar: 'أساسيات الأمن السيبراني', en: 'Introduction to Cybersecurity' },
  'digital-literacy': { ar: 'الوعي الرقمي الآمن', en: 'Digital Safety Awareness' },
  'network-defense': { ar: 'شبكات وحماية البيانات', en: 'Network Security Fundamentals' },
  'digital-forensics': { ar: 'التحقيق الجنائي الرقمي', en: 'Digital Forensics' },
  'secure-coding': { ar: 'حماية تطبيقات الويب وOWASP Top 10', en: 'Web Application Security and OWASP Top 10' },
  'ethical-hacking': { ar: 'الاختبار الاختراقي الأخلاقي', en: 'Ethical Hacking' },
  'cloud-security': { ar: 'أمن الحوسبة السحابية', en: 'Cloud Security Essentials' },
  'soc-analyst': { ar: 'تحليل التهديدات والاستخبارات الأمنية', en: 'Cyber Threat Intelligence and SOC Analysis' },
};

/**
 * Resolves the course name for a given slug/language. Returns null when the
 * slug isn't in the catalog (e.g. a custom/legacy course), so callers can
 * fall back to whatever the client sent instead of printing "null".
 */
function courseNameFor(courseSlug, language) {
  const entry = COURSE_NAMES[courseSlug];
  if (!entry) return null;
  return language === 'en' ? entry.en : entry.ar;
}

module.exports = { COURSE_NAMES, courseNameFor };
