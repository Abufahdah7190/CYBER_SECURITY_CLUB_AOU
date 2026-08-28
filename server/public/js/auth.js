/* CyberClub authentication client
 * The backend uses HttpOnly access_token and refresh_token cookies.
 * Keep credentials included and never store tokens in localStorage.
 */
(function () {
  'use strict';

  const API_BASE = (window.CYBERCLUB_API_BASE || '').replace(/\/$/, '');
  const AUTH_URL = `${API_BASE}/api/auth`;
  const $ = (selector) => document.querySelector(selector);

  // Authentication credentials must never be kept in Web Storage. Remove
  // legacy keys from older builds in case the site was upgraded in-place.
  function clearLegacyAuthStorage() {
    const keys = ['access_token', 'refresh_token', 'cc_access_session', 'cc_refresh_session', 'auth_token', 'authToken', 'cyberclub_token'];
    ['localStorage', 'sessionStorage'].forEach((name) => {
      try {
        const storage = window[name];
        keys.forEach((key) => storage.removeItem(key));
      } catch (_) { /* storage may be blocked */ }
    });
  }

  function setMessage(text, type) {
    const box = $('#auth-message');
    if (!box) return;
    box.textContent = text || '';
    box.className = `auth-message${type ? ` ${type}` : ''}`;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${AUTH_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    let data = {};
    try { data = await response.json(); } catch (_) { /* empty response */ }
    if (!response.ok) {
      const details = Array.isArray(data.details) ? ` ${data.details.join(' ')}` : '';
      throw new Error((data.error || 'تعذر تنفيذ الطلب.') + details);
    }
    return data;
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function setBusy(form, busy) {
    const button = form && form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.dataset.originalText ||= button.textContent;
    button.textContent = busy ? 'جارٍ التنفيذ...' : button.dataset.originalText;
  }

  function unlockSite() {
    document.body.classList.remove('auth-locked');
    document.querySelectorAll('.panel').forEach((panel) => { panel.style.display = panel.id === 'tab-home' ? 'block' : 'none'; });
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === 'home'));
    const authPanel = $('#tab-auth');
    if (authPanel) authPanel.style.display = 'none';
    const authTab = document.querySelector('[data-tab="auth"]');
    if (authTab) authTab.hidden = true;
    const profileTab = document.querySelector('[data-tab="profile"]');
    if (profileTab) profileTab.hidden = false;
    const profileLink = document.querySelector('[data-profile-link]');
    if (profileLink) profileLink.hidden = false;
    const accountMenu = document.querySelector('[data-account-menu]');
    if (accountMenu) accountMenu.hidden = false;
  }

  function lockSite() {
    document.body.classList.add('auth-locked');
    document.querySelectorAll('.panel').forEach((panel) => { panel.style.display = panel.id === 'tab-auth' ? 'block' : 'none'; });
    document.querySelectorAll('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === 'auth'));
    const authTab = document.querySelector('[data-tab="auth"]');
    if (authTab) authTab.hidden = false;
  }

  function showUser(user) {
    unlockSite();
    const authPanel = $('#tab-auth');
    const authTab = document.querySelector('[data-tab="auth"]');
    const profileTab = document.querySelector('[data-tab="profile"]');
    if (authPanel) { authPanel.style.display = 'none'; authPanel.hidden = true; authPanel.setAttribute('aria-hidden', 'true'); }
    if (authTab) { authTab.hidden = true; authTab.setAttribute('aria-hidden', 'true'); }
    if (profileTab) { profileTab.hidden = false; profileTab.removeAttribute('aria-hidden'); }
    const profileLink = document.querySelector('[data-profile-link]');
    if (profileLink) { profileLink.hidden = false; profileLink.removeAttribute('aria-hidden'); }
    const accountMenu = document.querySelector('[data-account-menu]');
    if (accountMenu) { accountMenu.hidden = false; accountMenu.removeAttribute('aria-hidden'); }
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const headerName = $('#header-profile-name');
    const headerAvatar = $('#header-profile-avatar');
    if (headerName) headerName.textContent = name || user.email || 'ملف الطالب';
    if (headerAvatar) headerAvatar.textContent = (name || user.email || 'ط').trim().slice(0, 1);
    $('#auth-user-name').textContent = name || user.email || 'المستخدم';
    $('#auth-user').hidden = false;
    $('#login-form').hidden = true;
    $('#register-form').hidden = true;
    document.querySelector('.auth-switcher').hidden = true;
    document.dispatchEvent(new CustomEvent('auth:ready', { detail: { user } }));
  }

  function showForms() {
    lockSite();
    const authPanel = $('#tab-auth');
    const authTab = document.querySelector('[data-tab="auth"]');
    const profileTab = document.querySelector('[data-tab="profile"]');
    if (authPanel) { authPanel.hidden = false; authPanel.removeAttribute('aria-hidden'); }
    if (authTab) { authTab.hidden = false; authTab.removeAttribute('aria-hidden'); }
    if (profileTab) { profileTab.hidden = true; profileTab.setAttribute('aria-hidden', 'true'); }
    const profileLink = document.querySelector('[data-profile-link]');
    if (profileLink) { profileLink.hidden = true; profileLink.setAttribute('aria-hidden', 'true'); }
    const accountMenu = document.querySelector('[data-account-menu]');
    if (accountMenu) { accountMenu.hidden = true; accountMenu.setAttribute('aria-hidden', 'true'); }
    const accountPanel = $('#account-menu-panel');
    if (accountPanel) accountPanel.hidden = true;
    const accountTrigger = $('#account-menu-trigger');
    if (accountTrigger) accountTrigger.setAttribute('aria-expanded', 'false');
    $('#auth-user').hidden = true;
    document.querySelector('.auth-switcher').hidden = false;
    switchView('login');
  }

  function switchView(view) {
    const login = view === 'login';
    $('#login-form').hidden = !login;
    $('#register-form').hidden = login;
    $('#forgot-form').hidden = true;
    document.querySelectorAll('[data-auth-view]').forEach((button) => {
      button.classList.toggle('active', button.dataset.authView === view);
    });
    setMessage('');
  }

  function showForgotForm() {
    $('#login-form').hidden = true;
    $('#register-form').hidden = true;
    $('#forgot-form').hidden = false;
    document.querySelector('.auth-switcher').hidden = true;
    setMessage('');
    $('#forgot-email').focus();
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setBusy(form, true);
    setMessage('');
    try {
      const data = await request('/forgot-password', { method: 'POST', body: JSON.stringify(formData(form)) });
      setMessage(data.message || 'إذا كان البريد مسجلًا لدينا، فستصلك رسالة لإعادة تعيين كلمة المرور.', 'success');
      form.reset();
    } catch (error) {
      setMessage(error.message, 'error');
    } finally {
      setBusy(form, false);
    }
  }

  async function loadCurrentUser() {
    try {
      const data = await request('/me');
      showUser(data.user);
      return;
    } catch (error) {
      // Try rotating the refresh token when the short-lived access token expired.
      try {
        const data = await request('/refresh', { method: 'POST', body: '{}' });
        showUser(data.user);
        return;
      } catch (_) {
        showForms();
      }
    }
  }

  function redirectToProfile() {
    if (window.location.pathname.endsWith('/index.html') || window.location.pathname === '/') {
      window.location.assign('profile.html');
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setBusy(form, true);
    setMessage('');
    try {
      const data = await request('/login', { method: 'POST', body: JSON.stringify(formData(form)) });
      showUser(data.user);
      setMessage('تم تسجيل الدخول بنجاح. جارٍ فتح ملفك الشخصي...', 'success');
      window.setTimeout(redirectToProfile, 120);
    } catch (error) {
      setMessage(error.message, 'error');
    } finally {
      setBusy(form, false);
    }
  }

  function validateRegisterFields(form) {
    form.querySelectorAll('.field-invalid').forEach((field) => field.classList.remove('field-invalid'));
    const requiredFields = [...form.querySelectorAll('[required]')];
    const emptyFields = requiredFields.filter((field) => !String(field.value || '').trim());
    emptyFields.forEach((field) => field.closest('.auth-field')?.classList.add('field-invalid'));
    if (emptyFields.length) {
      setMessage('يرجى تعبئة جميع الحقول المطلوبة قبل إنشاء الحساب.', 'error');
      emptyFields[0].focus();
      return false;
    }
    return form.reportValidity();
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validateRegisterFields(form)) return;
    const values = formData(form);
    if (values.password !== values.passwordConfirm) {
      setMessage('تأكيد كلمة المرور غير مطابق.', 'error');
      $('#register-password-confirm').focus();
      return;
    }
    delete values.passwordConfirm;
    setBusy(form, true);
    setMessage('');
    try {
      const data = await request('/register', { method: 'POST', body: JSON.stringify(values) });
      showUser(data.user);
      setMessage('تم إنشاء الحساب وتسجيل الدخول بنجاح. جارٍ فتح ملفك الشخصي...', 'success');
      window.setTimeout(redirectToProfile, 120);
    } catch (error) {
      setMessage(error.message, 'error');
    } finally {
      setBusy(form, false);
    }
  }

  async function handleLogout() {
    const button = $('#logout-button');
    button.disabled = true;
    try {
      await request('/logout', { method: 'POST', body: '{}' });
      showForms();
      setMessage('تم تسجيل الخروج بنجاح.', 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }

  function initAuth() {
    clearLegacyAuthStorage();
    const login = $('#login-form');
    const register = $('#register-form');
    const forgot = $('#forgot-form');
    if (!login || !register || !forgot) return;
    login.addEventListener('submit', handleLogin);
    register.addEventListener('submit', handleRegister);
    register.querySelectorAll('[required]').forEach((field) => {
      field.addEventListener('input', () => field.closest('.auth-field')?.classList.remove('field-invalid'));
      field.addEventListener('change', () => field.closest('.auth-field')?.classList.remove('field-invalid'));
      field.addEventListener('invalid', () => field.closest('.auth-field')?.classList.add('field-invalid'), true);
    });
    forgot.addEventListener('submit', handleForgotPassword);
    $('#logout-button').addEventListener('click', handleLogout);
    $('#header-logout-button')?.addEventListener('click', handleLogout);
    $('#account-menu-trigger')?.addEventListener('click', () => {
      const panel = $('#account-menu-panel');
      const trigger = $('#account-menu-trigger');
      if (!panel || !trigger) return;
      panel.hidden = !panel.hidden;
      trigger.setAttribute('aria-expanded', String(!panel.hidden));
    });
    document.addEventListener('click', (event) => {
      const menu = document.querySelector('[data-account-menu]');
      if (menu && !menu.contains(event.target)) {
        $('#account-menu-panel') && ($('#account-menu-panel').hidden = true);
        $('#account-menu-trigger')?.setAttribute('aria-expanded', 'false');
      }
    });
    lockSite();
    document.querySelectorAll('[data-auth-view]').forEach((button) => {
      button.addEventListener('click', () => switchView(button.dataset.authView));
    });
    document.querySelector('[data-auth-forgot-open]').addEventListener('click', showForgotForm);
    document.querySelector('[data-auth-forgot-back]').addEventListener('click', () => {
      document.querySelector('.auth-switcher').hidden = false;
      switchView('login');
    });
    loadCurrentUser();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAuth);
  else initAuth();
})();
