/**
 * supabase-forms.js
 * Handles Join Application and Suggestions form submissions via Supabase REST API.
 * No npm/bundler required — uses the Supabase REST API directly with fetch().
 *
 * Required env vars (injected at build time or set on window before this script):
 *   window.SUPABASE_URL  — e.g. "https://xxxx.supabase.co"
 *   window.SUPABASE_ANON_KEY — the public anon key
 */
(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  // These can be overridden by setting window.SUPABASE_URL / window.SUPABASE_ANON_KEY
  // before this script loads, or by replacing the placeholder strings below.
  const SUPABASE_URL = window.SUPABASE_URL || 'YOUR_SUPABASE_URL';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function t(key) {
    return window.i18n ? window.i18n.t(key) : key;
  }

  async function insertRow(table, payload) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
  }

  function setStatus(el, type, msg) {
    if (!el) return;
    el.textContent = msg;
    el.className = `form-status form-status--${type}`;
    el.hidden = false;
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? t('forms.sending') : btn.dataset.originalText;
  }

  // ── Join Application Form ────────────────────────────────────────────────────
  function initJoinForm() {
    const form = document.getElementById('join-form');
    if (!form) return;

    const statusEl = document.getElementById('join-form-status');
    const submitBtn = form.querySelector('[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      setLoading(submitBtn, true);
      setStatus(statusEl, 'info', t('forms.sending'));

      try {
        await insertRow('join_applications', {
          full_name: data.fullName,
          student_id: data.studentId || null,
          email: data.email,
          major: data.major || null,
          phone: data.phone || null,
          motivation: data.motivation || null,
        });
        setStatus(statusEl, 'success', t('forms.joinSuccess'));
        form.reset();
      } catch (err) {
        console.error('Join form error:', err);
        setStatus(statusEl, 'error', t('forms.error'));
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ── Suggestions Form ─────────────────────────────────────────────────────────
  function initSuggestionsForm() {
    const form = document.getElementById('suggestions-form');
    if (!form) return;

    const statusEl = document.getElementById('suggestions-form-status');
    const submitBtn = form.querySelector('[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      setLoading(submitBtn, true);
      setStatus(statusEl, 'info', t('forms.sending'));

      try {
        await insertRow('suggestions', {
          name: data.name || null,
          email: data.email || null,
          category: data.category || null,
          message: data.message,
        });
        setStatus(statusEl, 'success', t('forms.suggestionSuccess'));
        form.reset();
      } catch (err) {
        console.error('Suggestions form error:', err);
        setStatus(statusEl, 'error', t('forms.error'));
      } finally {
        setLoading(submitBtn, false);
      }
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────
  function init() {
    initJoinForm();
    initSuggestionsForm();
  }

  // Re-translate button text on language change
  document.addEventListener('languagechange', () => {
    ['join-form', 'suggestions-form'].forEach((id) => {
      const form = document.getElementById(id);
      if (!form) return;
      const btn = form.querySelector('[type="submit"]');
      if (btn && btn.dataset.originalText) {
        // Reset so next setLoading call picks up the new language text
        delete btn.dataset.originalText;
      }
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
