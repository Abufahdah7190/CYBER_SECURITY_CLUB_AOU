(() => {
  'use strict';
  const lessonTypes = ['video', 'article', 'lab'];
  const seeds = [
    { slug: 'cyber-basics', ar: 'أساسيات الأمن السيبراني', en: 'Introduction to Cybersecurity', level: 'سهل · مبتدئ', desc: 'مدخل عملي إلى التهديدات والهوية الرقمية وحماية الحسابات.', modules: ['مفاهيم الأمن السيبراني', 'حماية الهوية والأجهزة', 'الوعي والاستجابة اليومية'] },
    { slug: 'digital-literacy', ar: 'الوعي الرقمي الآمن', en: 'Digital Safety Awareness', level: 'سهل · مبتدئ', desc: 'مهارات الخصوصية والمعلومات المضللة والسلوك الرقمي الآمن.', modules: ['الهوية والخصوصية', 'الأجهزة والبيانات', 'التفكير النقدي الرقمي'] },
    { slug: 'network-defense', ar: 'شبكات وحماية البيانات', en: 'Network Security Fundamentals', level: 'متوسط', desc: 'مسار بأسلوب Cisco لفهم الشبكات والجدران النارية ومراقبة السجلات.', modules: ['أساسيات الشبكات', 'التحكم في الوصول', 'المراقبة والاستجابة'] },
    { slug: 'digital-forensics', ar: 'التحقيق الجنائي الرقمي', en: 'Digital Forensics', level: 'متوسط', desc: 'جمع الأدلة الرقمية وحفظ سلامتها وبناء الخط الزمني للحوادث.', modules: ['الدليل الرقمي', 'الجمع والحفظ', 'التحليل والتقرير'] },
    { slug: 'secure-coding', ar: 'حماية تطبيقات الويب وOWASP Top 10', en: 'Web Application Security and OWASP Top 10', level: 'متوسط', desc: 'تطوير تطبيقات ويب آمنة عبر التحقق والجلسات ومعالجة الثغرات.', modules: ['نمذجة التهديدات', 'ثغرات التطبيقات', 'الاختبار والمعالجة'] },
    { slug: 'ethical-hacking', ar: 'الاختبار الاختراقي الأخلاقي', en: 'Ethical Hacking', level: 'صعب · متقدم', desc: 'منهجية اختبار مصرح بها تبدأ بالنطاق وتنتهي بتقرير احترافي.', modules: ['التصريح والاستطلاع', 'التقييم الآمن', 'التقرير وإعادة الاختبار'] },
    { slug: 'cloud-security', ar: 'أمن الحوسبة السحابية', en: 'Cloud Security Essentials', level: 'صعب · متقدم', desc: 'الهوية السحابية والمسؤولية المشتركة وحماية الموارد والمراقبة.', modules: ['المسؤولية والهوية', 'الموارد والشبكات', 'المراقبة والتعافي'] },
    { slug: 'soc-analyst', ar: 'تحليل التهديدات والاستخبارات الأمنية', en: 'Cyber Threat Intelligence and SOC Analysis', level: 'صعب · متقدم', desc: 'تحليل التنبيهات والمؤشرات وبناء استخبارات قابلة للتنفيذ بأسلوب IBM.', modules: ['دور المحلل والفرز', 'المؤشرات والسياق', 'التواصل والتحسين'] },
  ];
  const topics = [
    ['المفاهيم الأساسية', 'قراءة المخاطر', 'تمرين تحديد الأصول'],
    ['المنهجية العملية', 'تحليل حالة تدريبية', 'مختبر تطبيقي'],
    ['المراجعة والقياس', 'بناء قائمة تحقق', 'اختبار الوحدة'],
  ];
  const topicsEn = [
    ['Core concepts', 'Risk reading', 'Asset identification exercise'],
    ['Practical methodology', 'Case study analysis', 'Hands-on lab'],
    ['Review and measurement', 'Checklist building', 'Module assessment'],
  ];
  const moduleNamesEn = ['Core Concepts', 'Practical Application', 'Review and Assessment'];
  const levelsEn = { 'سهل · مبتدئ': 'Easy · Beginner', 'متوسط': 'Intermediate', 'صعب · متقدم': 'Hard · Advanced' };
  const typeLabels = { video: 'فيديو تعليمي', article: 'قراءة ومقال', lab: 'مختبر عملي' };
  function buildLesson(course, moduleName, moduleIndex, lessonIndex) {
    const topic = topics[moduleIndex][lessonIndex];
    const topicEn = topicsEn[moduleIndex][lessonIndex];
    const moduleNameEn = moduleNamesEn[moduleIndex];
    const type = lessonTypes[(moduleIndex + lessonIndex) % lessonTypes.length];
    const title = `${moduleName}: ${topic}`;
    return {
      id: `${course.slug}-m${moduleIndex + 1}-l${lessonIndex + 1}`,
      title: { ar: title, en: `${course.en} — ${moduleNameEn}: ${topicEn}` },
      type,
      typeLabel: { ar: typeLabels[type], en: type === 'video' ? 'Instructional video' : type === 'article' ? 'Reading article' : 'Hands-on lab' },
      body: { ar: `في هذا الدرس من دورة «${course.ar}» ستتعلم ${topic.toLowerCase()} ضمن سياق ${moduleName}. ركّز على فهم السبب والنتيجة، ثم طبّق الخطوات في بيئة تدريبية مصرح بها. سجّل ملاحظاتك وراجعها قبل الانتقال إلى الاختبار.`, en: `In this lesson of ${course.en}, you will study ${topicEn} within ${moduleNameEn}. Focus on cause and effect, then apply the steps in an authorized training environment. Take notes before the unit quiz.` },
      steps: { ar: ['حدد الهدف والأصول المتأثرة.', 'حلل المخاطر والبيانات المتاحة.', 'وثّق النتيجة والخطوة التالية.'], en: ['Define the objective and affected assets.', 'Analyze the available risks and evidence.', 'Document the outcome and next action.'] },
      quiz: { ar: { question: `ما الممارسة الصحيحة أثناء درس «${topic}»؟`, options: ['التوثيق والعمل ضمن نطاق مصرح', 'تجربة أي إجراء على نظام عام', 'مشاركة بيانات حساسة'], correct: 0 }, en: { question: `What is the correct practice during “${topicEn}”?`, options: ['Document work within an authorized scope', 'Try any action on a public system', 'Share sensitive data'], correct: 0 } },
    };
  }
  window.CYBERCLUB_LMS = seeds.map((course) => ({ ...course, level: { ar: course.level, en: levelsEn[course.level] || course.level }, desc: { ar: course.desc, en: `A structured learning path for ${course.en}, with guided lessons, practice, and assessment.` }, image: `assets/courses/${course.slug === 'cyber-basics' || course.slug === 'digital-literacy' ? 'cyber-basics' : course.slug === 'ethical-hacking' || course.slug === 'cloud-security' || course.slug === 'soc-analyst' ? 'ethical-hacking' : 'network-defense'}.svg`, modules: course.modules.map((name, moduleIndex) => ({ id: `${course.slug}-m${moduleIndex + 1}`, title: { ar: `الوحدة ${moduleIndex + 1}: ${name}`, en: `Module ${moduleIndex + 1}: ${moduleNamesEn[moduleIndex]}` }, lessons: topics[moduleIndex].map((_, lessonIndex) => buildLesson(course, name, moduleIndex, lessonIndex)) })) })) ;
  window.CYBERCLUB_LMS_BY_SLUG = Object.fromEntries(window.CYBERCLUB_LMS.map((course) => [course.slug, course]));
})();
