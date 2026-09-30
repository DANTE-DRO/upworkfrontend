'use strict';

/* Shared helpers for Upwork Kenya frontend */

const UK = {
  get token() { return localStorage.getItem('uk_token') || ''; },
  set token(v) { v ? localStorage.setItem('uk_token', v) : localStorage.removeItem('uk_token'); },
  get user() { try { return JSON.parse(localStorage.getItem('uk_user') || 'null'); } catch { return null; } },
  set user(v) { v ? localStorage.setItem('uk_user', JSON.stringify(v)) : localStorage.removeItem('uk_user'); },

  /* Backend base URL — set in js/config.js (loaded before this script).
     Empty string means "same origin" (frontend served by the backend itself).
     No backend URL is hardcoded anywhere in this file. */
  API_BASE: (typeof window !== 'undefined' && window.UK_API_BASE) || '',

  async api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (UK.token) headers['x-auth-token'] = UK.token;
    const url = /^https?:\/\//i.test(path) ? path : UK.API_BASE + path;
    const res = await fetch(url, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  },

  money(n) { return 'KES ' + Number(n || 0).toLocaleString('en-KE'); },

  toast(msg, isErr) {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 4200);
  },

  applyTheme() {
    const t = localStorage.getItem('uk_theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
  },
  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('uk_theme', cur);
    UK.applyTheme();
  },

  splash(minMs = 900) {
    const s = document.getElementById('splash');
    if (!s) return;
    setTimeout(() => s.classList.add('gone'), minMs);
  },

  initials(name) {
    return String(name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  },

  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  timeAgo(ts) {
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }
};

UK.applyTheme();

/* Anti-inspection deterrent: blocks right-click and common DevTools shortcuts
   (view-source, save-page, element picker). */
(function antiInspect() {
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase();
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].indexOf(k) !== -1) || (e.ctrlKey && ['u', 's'].indexOf(k) !== -1)) {
      e.preventDefault(); e.stopPropagation();
    }
  }, true);
})();

/* Keep-alive: ping the backend every 10 minutes so the free-tier server (and
   the Neon database connection) never sleeps while any page is open. */
(function keepAlive() {
  const ping = () => { try { fetch(UK.API_BASE + '/api/health').catch(() => {}); } catch {} };
  ping();
  setInterval(ping, 10 * 60 * 1000);
})();
