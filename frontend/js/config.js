'use strict';

/* ============================================================
   FRONTEND CONFIGURATION — the ONLY file to edit after deploying.
   ============================================================

   The frontend is hosted on your main domain (Vercel: upworkkenya.co.ke)
   and the backend API on a SUBDOMAIN created in cPanel → "Setup Node.js App"
   (e.g. https://api.cumpusconnect.co.ke).

   AUTO-RESOLUTION — this file now also auto-detects the backend host when the
   frontend is opened from upworkkenya.co.ke / cumpusconnect.co.ke / their
   www variants, so a mismatch between config.js and the live hostname can
   never again produce "Failed to fetch".

   ⚠️ The value below MUST be the public HTTPS URL of the backend SUBDOMAIN,
   with NO trailing slash. Leaving it '' (empty) makes every API call go to the
   frontend's own domain (which has no API) — that is exactly what produced
   "Failed to fetch" before. */

window.UK_API_BASE = 'https://api.cumpusconnect.co.ke';

/* Safety net — if the frontend is served from a KNOWN domain we also know the
   matching backend sub-domain, so override the constant above. This fixes the
   case where the deployed config.js still points at an older backend host. */
(function autoBackend() {
  try {
    if (typeof window === 'undefined' || !window.location) return;
    var host = String(window.location.hostname || '').toLowerCase();
    var map = {
      'upworkkenya.co.ke':     'https://api.cumpusconnect.co.ke',
      'www.upworkkenya.co.ke': 'https://api.cumpusconnect.co.ke',
      'cumpusconnect.co.ke':     'https://api.cumpusconnect.co.ke',
      'www.cumpusconnect.co.ke': 'https://api.cumpusconnect.co.ke'
    };
    if (map[host]) window.UK_API_BASE = map[host];
  } catch (e) { /* keep the hard-coded default on any error */ }
})();
