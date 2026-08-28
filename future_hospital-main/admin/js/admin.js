async function api(path, method='GET', body) {
  const token = localStorage.getItem('admin_token');
  const headers = body ? {'Content-Type':'application/json'} : {};
  if(token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch('/api' + path, {method, headers, body: body ? JSON.stringify(body) : undefined});
  if(res.status===401){ throw new Error('unauthenticated') }
  return res.json();
}

function el(tag, props={}, ...children){
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k,v])=>e.setAttribute(k,v));
  children.forEach(c=>{ if(typeof c === 'string') e.appendChild(document.createTextNode(c)); else e.appendChild(c); });
  return e;
}

async function loadAppointments(){
  try{
    const data = await api('/appointments');
    const tbody = document.querySelector('#appointmentsTable tbody');
    tbody.innerHTML='';
    data.forEach(a=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.patient_name}</td><td>${a.phone}</td><td>${a.department||''}</td><td>${a.status}</td><td>${new Date(a.created_at).toLocaleString()}</td>`;
    const actions = document.createElement('td');
    const confirmBtn = el('button',{class:'action confirm'},'تأكيد');
    confirmBtn.onclick = async ()=>{ await api(`/appointments/${a.id}/confirm`, 'PUT'); loadAppointments(); };
    const delBtn = el('button',{class:'action delete'},'حذف');
    delBtn.onclick = async ()=>{ if(confirm('حذف الموعد؟')){ await api(`/appointments/${a.id}`, 'DELETE'); loadAppointments(); }};
    actions.appendChild(confirmBtn); actions.appendChild(delBtn);
    tr.appendChild(actions);
    tbody.appendChild(tr);
    });
  }catch(err){
    if(err.message === 'unauthenticated'){ setAuthenticated(null); }
    console.error(err);
  }
}

async function loadDoctors(){
  try{
    const data = await api('/doctors');
    const tbody = document.querySelector('#doctorsTable tbody');
    tbody.innerHTML='';
    data.forEach(d=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.name}</td><td>${d.specialty||''}</td>`;
    const actions = document.createElement('td');
    const delBtn = el('button',{class:'action delete'},'حذف');
    delBtn.onclick = async ()=>{ if(confirm('حذف الطبيب؟')){ await api(`/doctors/${d.id}`, 'DELETE'); loadDoctors(); }};
    actions.appendChild(delBtn);
    tr.appendChild(actions);
    tbody.appendChild(tr);
    });
  }catch(err){
    if(err.message === 'unauthenticated'){ setAuthenticated(null); }
    console.error(err);
  }
}

async function loadApplications(){
  try{
    const data = await api('/doctor_applications');
    const tbody = document.createElement('tbody');
    const table = document.getElementById('applicationsTable');
    if(!table){
      const sec = document.createElement('section'); sec.className='panel'; sec.innerHTML = '<h2>طلبات الانضمام</h2><table id="applicationsTable"><thead><tr><th>الاسم</th><th>التخصص</th><th>الحالة</th><th>إجراءات</th></tr></thead></table>';
      document.querySelector('.admin-main').appendChild(sec);
    }
    const t = document.getElementById('applicationsTable');
    t.querySelectorAll('tbody').forEach(n=>n.remove());
    const newTbody = document.createElement('tbody');
    data.forEach(a=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${a.name}</td><td>${a.specialty||''}</td><td>${a.status}</td>`;
      const actions = document.createElement('td');
      const approve = el('button',{class:'action confirm'},'الموافقة'); approve.onclick = async ()=>{ await api(`/doctor_applications/${a.id}/approve`, 'POST'); loadApplications(); loadDoctors(); };
      const reject = el('button',{class:'action delete'},'رفض'); reject.onclick = async ()=>{ if(confirm('رفض الطلب؟')){ await api(`/doctor_applications/${a.id}`, 'DELETE'); loadApplications(); }};
      actions.appendChild(approve); actions.appendChild(reject); tr.appendChild(actions); newTbody.appendChild(tr);
    });
    t.appendChild(newTbody);
  }catch(err){ if(err.message === 'unauthenticated'){ setAuthenticated(null); } console.error(err); }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const loginPanel = document.getElementById('loginPanel');
  const loginForm = document.getElementById('loginForm');
  const loginMsg = document.getElementById('loginMsg');
  const btnLogout = document.getElementById('btnLogout');

  function setAuthenticated(token){
    if(token){ localStorage.setItem('admin_token', token); loginPanel.classList.add('hidden'); btnLogout.classList.remove('hidden'); }
    else{ localStorage.removeItem('admin_token'); loginPanel.classList.remove('hidden'); btnLogout.classList.add('hidden'); }
  }

  // init auth state
  if(localStorage.getItem('admin_token')) setAuthenticated(localStorage.getItem('admin_token'));

  loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault(); loginMsg.textContent='';
    const fd = new FormData(e.target); const username = fd.get('username'); const password = fd.get('password');
    try{
      const res = await fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password})});
      const json = await res.json();
      if(json && json.token){ setAuthenticated(json.token); loadAppointments(); } else { loginMsg.textContent = json.error || 'فشل تسجيل الدخول'; }
    }catch(err){ loginMsg.textContent='خطأ في الاتصال'; }
  });

  btnLogout.addEventListener('click', ()=>{ setAuthenticated(null); });

  document.getElementById('showAppointments').addEventListener('click', ()=>{
    document.getElementById('appointmentsSection').classList.remove('hidden');
    document.getElementById('doctorsSection').classList.add('hidden');
    loadAppointments();
  });
  document.getElementById('showDoctors').addEventListener('click', ()=>{
    document.getElementById('appointmentsSection').classList.add('hidden');
    document.getElementById('doctorsSection').classList.remove('hidden');
    loadDoctors();
  });
  document.getElementById('showApplications').addEventListener('click', ()=>{
    document.getElementById('appointmentsSection').classList.add('hidden');
    document.getElementById('doctorsSection').classList.add('hidden');
    loadApplications();
  });

  document.getElementById('doctorForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {name: fd.get('name'), specialty: fd.get('specialty'), bio: fd.get('bio')};
    await api('/doctors', 'POST', obj);
    e.target.reset();
    loadDoctors();
  });

  // initial load
  loadAppointments();
});
