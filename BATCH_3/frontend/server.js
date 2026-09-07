require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
// file uploads
const uploadDir = path.join(__dirname, 'uploads');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({ destination: uploadDir, filename: (req,file,cb)=>{
  const name = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-\u0600-\u06FF]/g,'_'); cb(null, name);
}});
const upload = multer({storage});
app.use('/uploads', express.static(uploadDir));

const PORT = process.env.PORT || 3000;

async function getPool(){
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'virtual_hospital',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  return pool;
}

function makeSlug(name){
  return String(name).toLowerCase().trim()
    .replace(/\s+/g,'-')
    .replace(/[^\w\-\u0600-\u06FF]+/g,'')
    .replace(/\-+/g,'-');
}

function authMiddleware(req,res,next){
  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith('Bearer ')) return res.status(401).json({error:'unauthenticated'});
  const token = auth.slice(7);
  try{
    const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    // set admin or user context
    if(data.user) req.admin = data.user;
    if(data.userId) req.userId = data.userId;
    next();
  }catch(e){return res.status(401).json({error:'invalid token'})}
}

function userAuth(req,res,next){
  const auth = req.headers.authorization; if(!auth || !auth.startsWith('Bearer ')) return res.status(401).json({error:'unauthenticated'});
  const token = auth.slice(7);
  try{ const data = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret'); if(!data.userId) return res.status(401).json({error:'user token required'}); req.userId = data.userId; next(); }catch(e){return res.status(401).json({error:'invalid token'})}
}

// Health
app.get('/api/health', (req,res)=>res.json({ok:true, ts:Date.now()}));

// Create appointment
app.post('/api/appointments', async (req,res)=>{
  try{
    const {name, phone, email, department, notes, doctor_id, appointment_time} = req.body;
    if(!name || !phone) return res.status(400).json({error:'name and phone required'});
    const pool = await getPool();
    // if appointment_time provided, verify slot and conflicts
    if(doctor_id && appointment_time){
      const [slotRows] = await pool.execute('SELECT COUNT(*) AS c FROM availability_slots WHERE doctor_id = ? AND start_time = ? LIMIT 1', [doctor_id, appointment_time]);
      if(slotRows[0].c === 0) return res.status(400).json({error:'selected slot is not available'});
      const [conf] = await pool.execute('SELECT COUNT(*) AS c FROM appointments WHERE doctor_id = ? AND appointment_time = ? AND status <> "cancelled"', [doctor_id, appointment_time]);
      if(conf[0].c > 0) return res.status(409).json({error:'slot already booked'});
    }
    const [result] = await pool.execute(
      `INSERT INTO appointments (patient_name, phone, email, department, doctor_id, appointment_time, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [name, phone, email||'', department||'', doctor_id || null, appointment_time || null, notes||'']
    );
    res.json({ok:true,id: result.insertId});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'server error'});
  }
});

// List appointments
app.get('/api/appointments', async (req,res)=>{
  try{
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM appointments ORDER BY created_at DESC');
    res.json(rows);
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Confirm appointment
app.put('/api/appointments/:id/confirm', authMiddleware, async (req,res)=>{
  try{
    const id = req.params.id;
    const pool = await getPool();
    await pool.execute('UPDATE appointments SET status = ? WHERE id = ?', ['confirmed', id]);
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Delete appointment
app.delete('/api/appointments/:id', authMiddleware, async (req,res)=>{
  try{
    const id = req.params.id;
    const pool = await getPool();
    await pool.execute('DELETE FROM appointments WHERE id = ?', [id]);
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Payments: create (mock) payment for an appointment
app.post('/api/payments', async (req,res)=>{
  try{
    const {appointment_id, amount, provider} = req.body;
    if(!appointment_id) return res.status(400).json({error:'appointment_id required'});
    const pool = await getPool();
    // create payment record
    const [r] = await pool.execute('INSERT INTO payments (appointment_id, amount, provider, status, created_at) VALUES (?, ?, ?, ?, NOW())', [appointment_id, amount || 0.00, provider||'mock', 'completed']);
    // mark appointment as paid/confirmed
    await pool.execute('UPDATE appointments SET status = ? WHERE id = ?', ['confirmed', appointment_id]);
    res.json({ok:true, paymentId: r.insertId});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

app.get('/api/payments/:id', async (req,res)=>{
  try{
    const id = req.params.id; const pool = await getPool();
    const [rows] = await pool.execute('SELECT * FROM payments WHERE id = ? LIMIT 1', [id]);
    if(rows.length===0) return res.status(404).json({error:'not found'});
    res.json(rows[0]);
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Patients (simple list inferred from appointments)
app.get('/api/patients', async (req,res)=>{
  try{
    const pool = await getPool();
    const [rows] = await pool.query('SELECT DISTINCT patient_name AS name, phone, email FROM appointments ORDER BY patient_name');
    res.json(rows);
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Doctors endpoints
app.get('/api/doctors', async (req,res)=>{
  try{
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM doctors ORDER BY name');
    res.json(rows);
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

app.post('/api/doctors', authMiddleware, async (req,res)=>{
  try{
    const {name, specialty, bio} = req.body;
    if(!name) return res.status(400).json({error:'name required'});
    const slug = makeSlug(name);
    const pool = await getPool();
    const [result] = await pool.execute('INSERT INTO doctors (name, specialty, bio, slug) VALUES (?, ?, ?, ?)', [name, specialty||'', bio||'', slug]);
    res.json({ok:true,id: result.insertId});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

app.put('/api/doctors/:id', authMiddleware, async (req,res)=>{
  try{
    const id = req.params.id; const {name, specialty, bio} = req.body;
    const slug = name ? makeSlug(name) : undefined;
    const pool = await getPool();
    await pool.execute('UPDATE doctors SET name=?, specialty=?, bio=?, slug=? WHERE id=?', [name, specialty, bio, slug, id]);
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

app.delete('/api/doctors/:id', authMiddleware, async (req,res)=>{
  try{
    const id = req.params.id;
    const pool = await getPool();
    await pool.execute('DELETE FROM doctors WHERE id=?', [id]);
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Get doctor by slug
app.get('/api/doctors/slug/:slug', async (req,res)=>{
  try{
    const slug = req.params.slug;
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT * FROM doctors WHERE slug = ? LIMIT 1', [slug]);
    if(rows.length===0) return res.status(404).json({error:'not found'});
    res.json(rows[0]);
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Departments (static for now)
app.get('/api/departments', async (req,res)=>{
  const deps = [
    {key:'emergency', name:'الطوارئ'},
    {key:'cardiology', name:'أمراض القلب'},
    {key:'pediatrics', name:'الأطفال'},
    {key:'psychiatry', name:'الطب النفسي'}
  ];
  res.json(deps);
});

// Department detail by key
app.get('/api/departments/:key', async (req,res)=>{
  try{
    const key = req.params.key;
    const deps = {
      emergency:{key:'emergency', name:'الطوارئ', description:'خدمة طوارئ متاحة على مدار الساعة.'},
      cardiology:{key:'cardiology', name:'أمراض القلب', description:'فحص تشخيصي متكامل ورعاية ما بعد العملية.'},
      pediatrics:{key:'pediatrics', name:'الأطفال', description:'حملات تطعيم واستشارات عائلية.'},
      psychiatry:{key:'psychiatry', name:'الطب النفسي', description:'دعم نفسي وعلاجات سلوكية معرفية عن بُعد.'}
    };
    const dept = deps[key];
    if(!dept) return res.status(404).json({error:'not found'});
    // include doctors in this department
    const pool = await getPool();
    const [docs] = await pool.execute('SELECT id,name,specialty,slug FROM doctors WHERE specialty LIKE ? OR specialty LIKE ? LIMIT 50', [`%${dept.name}%`, `%${key}%`]);
    dept.doctors = docs;
    res.json(dept);
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Auth: login (simple admin creds from .env)
app.post('/api/auth/login', async (req,res)=>{
  try{
    const {username, password} = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'change_me';
    if(username !== adminUser || password !== adminPass) return res.status(401).json({error:'invalid credentials'});
    const token = jwt.sign({user: username}, process.env.JWT_SECRET || 'dev_secret', {expiresIn: '4h'});
    res.json({ok:true, token});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Serve admin static files
// Serve frontend static files
app.use(express.static(__dirname));
app.use('/admin', express.static(__dirname + '/admin'));

// Setup admin account if none exists
app.post('/api/auth/setup', async (req,res)=>{
  try{
    const {username, password} = req.body;
    if(!username || !password) return res.status(400).json({error:'username and password required'});
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT COUNT(*) AS c FROM admins');
    if(rows[0].c > 0) return res.status(403).json({error:'setup already completed'});
    const hash = await bcrypt.hash(password, 10);
    await pool.execute('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [username, hash]);
    const token = jwt.sign({user: username}, process.env.JWT_SECRET || 'dev_secret', {expiresIn: '4h'});
    res.json({ok:true, token});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Auth: login (check admins table first, fallback to env for backward compat)
app.post('/api/auth/login', async (req,res)=>{
  try{
    const {username, password} = req.body;
    if(!username || !password) return res.status(400).json({error:'username and password required'});
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT * FROM admins WHERE username = ? LIMIT 1', [username]);
    if(rows && rows[0]){
      const admin = rows[0];
      const ok = await bcrypt.compare(password, admin.password_hash);
      if(!ok) return res.status(401).json({error:'invalid credentials'});
      const token = jwt.sign({user: username}, process.env.JWT_SECRET || 'dev_secret', {expiresIn: '4h'});
      return res.json({ok:true, token});
    }
    // fallback to env-based admin (legacy)
    const adminUser = process.env.ADMIN_USER || null;
    const adminPass = process.env.ADMIN_PASS || null;
    if(adminUser && adminPass && username === adminUser && password === adminPass){
      const token = jwt.sign({user: username}, process.env.JWT_SECRET || 'dev_secret', {expiresIn: '4h'});
      return res.json({ok:true, token});
    }
    return res.status(401).json({error:'invalid credentials'});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Patient register/login (users)
app.post('/api/users/register', async (req,res)=>{
  try{
    const {name, phone, email, password} = req.body;
    if(!name || !phone) return res.status(400).json({error:'name and phone required'});
    const pool = await getPool();
    const hash = password ? await bcrypt.hash(password, 10) : null;
    const [r] = await pool.execute('INSERT INTO users (name, phone, email, password_hash) VALUES (?, ?, ?, ?)', [name, phone||null, email||null, hash]);
    const userId = r.insertId;
    const token = jwt.sign({userId}, process.env.JWT_SECRET || 'dev_secret', {expiresIn:'7d'});
    res.json({ok:true, userId, token});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

app.post('/api/users/login', async (req,res)=>{
  try{
    const {phone, password} = req.body;
    if(!phone) return res.status(400).json({error:'phone required'});
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone]);
    if(!rows || !rows[0]) return res.status(401).json({error:'not found'});
    const u = rows[0];
    if(u.password_hash){
      const ok = await bcrypt.compare(password||'', u.password_hash);
      if(!ok) return res.status(401).json({error:'invalid credentials'});
    }
    const token = jwt.sign({userId: u.id}, process.env.JWT_SECRET || 'dev_secret', {expiresIn:'7d'});
    res.json({ok:true, token, user: {id:u.id, name:u.name, phone:u.phone, email:u.email}});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// user: list own appointments
app.get('/api/users/me/appointments', userAuth, async (req,res)=>{
  try{
    const pool = await getPool();
    const [rows] = await pool.execute('SELECT * FROM appointments WHERE phone = (SELECT phone FROM users WHERE id = ?) OR (user_id = ?) ORDER BY created_at DESC', [req.userId, req.userId]);
    res.json(rows);
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// user cancels own appointment
app.post('/api/appointments/:id/cancel', userAuth, async (req,res)=>{
  try{
    const id = req.params.id; const pool = await getPool();
    const [rows] = await pool.execute('SELECT * FROM appointments WHERE id = ? LIMIT 1', [id]);
    if(!rows || !rows[0]) return res.status(404).json({error:'not found'});
    const ap = rows[0];
    // allow if user owns it by user_id or phone matches
    const [urows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [req.userId]);
    const user = urows && urows[0];
    if(!user) return res.status(403).json({error:'forbidden'});
    if(ap.user_id && ap.user_id !== req.userId && ap.phone !== user.phone) return res.status(403).json({error:'forbidden'});
    await pool.execute('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', id]);
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Doctor application endpoint
app.post('/api/doctor_applications', async (req,res)=>{
  try{
    const {name, specialty, bio, certificates, image_url, price, availability} = req.body;
    if(!name) return res.status(400).json({error:'name required'});
    const pool = await getPool();
    const [r] = await pool.execute('INSERT INTO doctor_applications (name, specialty, bio, certificates, image_url, price, availability) VALUES (?,?,?,?,?,?,?)', [name, specialty||'', bio||'', certificates||'', image_url||'', price||0, availability||'']);
    res.json({ok:true, id: r.insertId});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// upload endpoint for images/files (used by join-as-doctor form)
app.post('/api/uploads', upload.single('file'), (req,res)=>{
  if(!req.file) return res.status(400).json({error:'no file'});
  const url = `/uploads/${req.file.filename}`;
  res.json({ok:true,url});
});

// Admin: list doctor applications
app.get('/api/doctor_applications', authMiddleware, async (req,res)=>{
  try{ const pool = await getPool(); const [rows] = await pool.query('SELECT * FROM doctor_applications ORDER BY created_at DESC'); res.json(rows);}catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Admin: approve application -> create doctor
app.post('/api/doctor_applications/:id/approve', authMiddleware, async (req,res)=>{
  try{
    const id = req.params.id; const pool = await getPool();
    const [rows] = await pool.execute('SELECT * FROM doctor_applications WHERE id = ? LIMIT 1', [id]);
    if(!rows || !rows[0]) return res.status(404).json({error:'not found'});
    const appRow = rows[0];
    const slug = makeSlug(appRow.name);
    const [r] = await pool.execute('INSERT INTO doctors (name, specialty, bio, slug) VALUES (?,?,?,?)', [appRow.name, appRow.specialty, appRow.bio, slug]);
    await pool.execute('UPDATE doctor_applications SET status = ? WHERE id = ?', ['approved', id]);
    res.json({ok:true, doctorId: r.insertId});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Delete application
app.delete('/api/doctor_applications/:id', authMiddleware, async (req,res)=>{
  try{
    const id = req.params.id; const pool = await getPool();
    await pool.execute('DELETE FROM doctor_applications WHERE id = ?', [id]);
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Slots: list available slots for doctor on a date
app.get('/api/doctors/:id/slots', async (req,res)=>{
  try{
    const id = req.params.id; const date = req.query.date; // YYYY-MM-DD
    const pool = await getPool();
    let start = null; let end = null;
    if(date){ start = new Date(date + 'T00:00:00'); end = new Date(date + 'T23:59:59'); }
    const q = date ? 'SELECT * FROM availability_slots WHERE doctor_id = ? AND start_time BETWEEN ? AND ? ORDER BY start_time' : 'SELECT * FROM availability_slots WHERE doctor_id = ? ORDER BY start_time';
    const params = date ? [id, start, end] : [id];
    const [slots] = await pool.execute(q, params);
    // filter out slots that already have appointments
    const available = [];
    for(const s of slots){
      const [ap] = await pool.execute('SELECT COUNT(*) AS c FROM appointments WHERE doctor_id = ? AND appointment_time = ? AND status <> "cancelled"', [id, s.start_time]);
      if(ap[0].c === 0) available.push(s);
    }
    res.json(available);
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Admin/Doctor can create availability slots
app.post('/api/slots', authMiddleware, async (req,res)=>{
  try{
    const {doctor_id, start_time, end_time} = req.body;
    if(!doctor_id || !start_time || !end_time) return res.status(400).json({error:'missing fields'});
    const pool = await getPool();
    await pool.execute('INSERT INTO availability_slots (doctor_id, start_time, end_time) VALUES (?,?,?)', [doctor_id, start_time, end_time]);
    res.json({ok:true});
  }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Delete slot
app.delete('/api/slots/:id', authMiddleware, async (req,res)=>{
  try{ const id = req.params.id; const pool = await getPool(); await pool.execute('DELETE FROM availability_slots WHERE id = ?', [id]); res.json({ok:true}); }catch(err){console.error(err);res.status(500).json({error:'server error'})}
});

// Serve doctor and department pages (frontend templates)
app.get('/doctors/:slug', (req,res)=>{
  res.sendFile(__dirname + '/doctor.html');
});
app.get('/departments/:key', (req,res)=>{
  res.sendFile(__dirname + '/department.html');
});

// Friendly routes for pages without .html extension
app.get('/booking', (req,res)=>{ res.sendFile(__dirname + '/booking.html'); });
app.get('/payment', (req,res)=>{ res.sendFile(__dirname + '/payment.html'); });
app.get('/doctor', (req,res)=>{ res.sendFile(__dirname + '/doctor.html'); });
app.get('/register', (req,res)=>{ res.sendFile(__dirname + '/register.html'); });
app.get('/login', (req,res)=>{ res.sendFile(__dirname + '/login.html'); });
app.get('/patient', (req,res)=>{ res.sendFile(__dirname + '/patient.html'); });
app.get('/mockpay', (req,res)=>{ res.sendFile(__dirname + '/mockpay.html'); });
app.get('/join', (req,res)=>{ res.sendFile(__dirname + '/join.html'); });
app.get('/admin', (req,res)=>{ res.sendFile(__dirname + '/admin/index.html'); });

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
