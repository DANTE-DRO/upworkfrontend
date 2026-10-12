'use strict';

/* ============================================================
   FRONTEND CONFIGURATION — the ONLY file to edit after deploying.
   ============================================================

   The frontend is hosted on your main domain (cPanel public_html or Vercel)
   and the backend API on a SUBDOMAIN of the same domain created in
   cPanel → "Setup Node.js App", e.g.  https://api.cumpusconnect.co.ke

   ⚠️ This value MUST be the public URL of the backend SUBDOMAIN, with NO
   trailing slash. Leaving it '' (empty) makes the browser send every
   API call to the frontend's own domain (e.g. https://upwork.co.ke/api/...),
   which has no API — that is exactly what produced "Failed to fetch".

   If you create the backend under a DIFFERENT sub-domain (for example
   https://server.upwork.co.ke), change ONLY the value below. */

window.UK_API_BASE = 'https://api.cumpusconnect.co.ke';
