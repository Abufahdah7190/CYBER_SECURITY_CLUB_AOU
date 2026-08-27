(() => {
  'use strict';
  const API_BASE = (window.CYBERCLUB_API_BASE || '').replace(/\/$/, '');
  const AUTH_URL = `${API_BASE}/api/auth`;
  const LEARNING_URL = `${API_BASE}/api/learning`;
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));

  async function request(url, options = {}) {
    const response = await fetch(url, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(data.error || 'تعذر تحميل بيانات الملف الشخصي.');
    return data;
  }

  function setMessage(text, type = '') {
    const box = $('#profile-message');
    if (!box) return;
    box.textContent = text;
    box.className = `profile-message${type ? ` ${type}` : ''}`;
  }

  function fillUser(user) {
    if (!user) return;
    $('#profile-first-name').value = user.firstName || '';
    $('#profile-last-name').value = user.lastName || '';
    $('#profile-email').value = user.email || '';
    $('#profile-phone').value = user.phone || '';
    $('#profile-major').value = user.major || '';
    $('#profile-gender').value = user.gender || '';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    $('#profile-avatar').textContent = (fullName || user.email || 'ط').slice(0, 1);
  }

  function renderCertificates(certificates = []) {
    const list = $('#profile-certificates-list');
    const summary = $('#profile-certificates-summary');
    if (!list || !summary) return;
    summary.textContent = certificates.length ? `${certificates.length} شهادة محفوظة في حسابك` : 'لم تصدر لك شهادات بعد';
    if (!certificates.length) {
      list.innerHTML = '<div class="profile-empty">أكمل الدورات بنسبة 80% أو أكثر لتظهر شهاداتك هنا.</div>';
      return;
    }
    list.innerHTML = certificates.map((certificate) => {
      const verifyUrl = `${window.location.origin}/certificate-verify.html?code=${encodeURIComponent(certificate.certificateCode)}`;
      return `<article class="profile-certificate-item"><div class="profile-certificate-mark">✓</div><div class="profile-certificate-info"><h4>${escapeHtml(certificate.courseName)}</h4><p>رمز الشهادة: <strong>${escapeHtml(certificate.certificateCode)}</strong></p><small>تاريخ الإصدار: ${new Date(certificate.issuedAt).toLocaleDateString('ar-SA')}</small></div><div class="profile-certificate-actions"><a class="btn small" href="${verifyUrl}" target="_blank" rel="noopener">عرض والتحقق</a><button class="btn small ghost" type="button" data-copy-certificate="${escapeHtml(certificate.certificateCode)}">نسخ الرمز</button></div></article>`;
    }).join('');
    list.querySelectorAll('[data-copy-certificate]').forEach((button) => button.addEventListener('click', async () => {
      await navigator.clipboard?.writeText(button.dataset.copyCertificate);
      const old = button.textContent;
      button.textContent = 'تم النسخ';
      setTimeout(() => { button.textContent = old; }, 1400);
    }));
  }

  async function loadProfile() {
    try {
      const [userData, learningData] = await Promise.all([request(`${AUTH_URL}/me`), request(`${LEARNING_URL}/progress`)]);
      fillUser(userData.user);
      renderCertificates(learningData.certificates || []);
      setMessage('');
    } catch (error) {
      setMessage(error.message, 'error');
    }
  }

  async function updateProfile(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = 'جارٍ الحفظ...';
    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const data = await request(`${AUTH_URL}/profile`, { method: 'PATCH', body: JSON.stringify(payload) });
      fillUser(data.user);
      setMessage('تم تحديث بيانات ملفك بنجاح.', 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  document.addEventListener('auth:ready', (event) => { fillUser(event.detail?.user); loadProfile(); });
  document.addEventListener('DOMContentLoaded', () => { $('#profile-form')?.addEventListener('submit', updateProfile); document.querySelector('[data-tab="profile"]')?.addEventListener('click', loadProfile); });
})();
