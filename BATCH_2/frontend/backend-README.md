# Backend README — Virtual Hospital

Steps to run the backend (Node.js + MySQL):

1. Install Node.js (>=16) and MySQL server.
2. Copy `.env.example` to `.env` and set your DB credentials.
3. Create the database and tables using `db/create_tables.sql` (run in MySQL client):

```sql
SOURCE db/create_tables.sql;
```

4. (Optional) Load seed data for departments/doctors/availability to test the flow:

```sql
SOURCE db/seed.sql;
```

4. Install dependencies:

```bash
npm install
```

5. Run the server:

```bash
npm run dev
```

6. Open the site front-end by opening `index.html` or serve the folder with a static server. The backend serves admin panel at `http://localhost:3000/admin` (if server runs on 3000).

Environment variables to set in `.env` (copy from `.env.example`):

- `ADMIN_USER` — اسم مستخدم المشرف (مثال: `admin`)
- `ADMIN_PASS` — كلمة المرور للمشرف (مثال: `change_me`)
- `JWT_SECRET` — مفتاح سري لتوقيع توكنات JWT (ضروري أن يكون قويًا)

Admin account setup:
- بعد إنشاء الجداول، إذا كنت تريد إنشاء حساب مشرف من خلال API المحلي مرة واحدة، أرسل `POST /api/auth/setup` مع JSON يحتوي `username` و`password`. هذا يُنشئ أول حساب مشرف ويُرجع توكن.

مثال (curl):
```bash
curl -X POST http://localhost:3000/api/auth/setup -H "Content-Type: application/json" -d '{"username":"admin","password":"strongpass"}'
```

بعد ذلك استخدم `POST /api/auth/login` للحصول على توكن تسجيل الدخول.


Notes & next steps:
- Add authentication for `/admin` (JWT or session) before production.
- Use migrations (e.g., knex or sequelize) for schema management.
- Harden DB credentials and use connection pooling/monitoring.
