# إعداد Render لتشغيل مسارات الدورات

حتى يعمل الرابط `/learn/cyber-basics` يجب أن تكون خدمة Render التي تعرض الموقع هي خدمة Node/Express نفسها، أو يجب إضافة Rewrite في خدمة الواجهة الثابتة.

## إعداد خدمة Node/Express

إذا كان المستودع يحتوي على الواجهة في الجذر ومجلد الخادم في `server`، استخدم الإعدادات التالية:

- **Root Directory:** اتركه فارغًا، أي جذر المستودع.
- **Build Command:** `cd server && npm install`
- **Start Command:** `node server/src/server.js`

لا تستخدم `server` كـ Root Directory مع هذا الإصدار إلا إذا نسخت ملفات الواجهة إلى خدمة مستقلة؛ لأن `course.html` و`css` و`js` موجودة في جذر المشروع.

بعد نشر النسخة الجديدة، يجب أن يعيد الطلب التالي صفحة HTML وليس `Cannot GET`:

```text
GET /learn/cyber-basics
```

إذا كانت الواجهة منشورة كـ Render Static Site منفصلة عن API، أضف Rewrite من:

```text
/learn/*
```

إلى:

```text
/course.html
```

ثم اترك `course.js` يقرأ اسم الدورة من مسار الرابط كما هو في المشروع.
