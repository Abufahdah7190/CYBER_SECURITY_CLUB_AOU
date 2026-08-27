/* CyberClub authentication client
 * The backend uses HttpOnly access_token and refresh_token cookies.
 * Keep credentials included and never store tokens in localStorage.
 */
(function () {
  'use strict';

  const API_BASE = (window.CYBERCLUB_API_BASE || '').replace(/\/$/, '');
  const AUTH_URL = `${API_BASE}/api/auth`;
  const $ = (selector) => document.querySelector(selector);

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
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    $('#auth-user-name').textContent = name || user.email || 'المستخدم';
    $('#auth-user').hidden = false;
    $('#login-form').hidden = true;
    $('#register-form').hidden = true;
    document.querySelector('.auth-switcher').hidden = true;
    document.dispatchEvent(new CustomEvent('auth:ready', { detail: { user } }));
  }

  function showForms() {
    lockSite();
    const profileTab = document.querySelector('[data-tab="profile"]');
    if (profileTab) profileTab.hidden = true;
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

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setBusy(form, true);
    setMessage('');
    try {
      const data = await request('/login', { method: 'POST', body: JSON.stringify(formData(form)) });
      showUser(data.user);
      setMessage('تم تسجيل الدخول بنجاح. يمكنك الآن تصفح أقسام الموقع.', 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    } finally {
      setBusy(form, false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
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
      setMessage('تم إنشاء الحساب وتسجيل الدخول بنجاح.', 'success');
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
    const login = $('#login-form');
    const register = $('#register-form');
    const forgot = $('#forgot-form');
    if (!login || !register || !forgot) return;
    login.addEventListener('submit', handleLogin);
    register.addEventListener('submit', handleRegister);
    forgot.addEventListener('submit', handleForgotPassword);
    $('#logout-button').addEventListener('click', handleLogout);
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
