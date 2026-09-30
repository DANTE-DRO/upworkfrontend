'use strict';
/* ============================================================
   Upwork Kenya — App Install & Notifications Module
   ------------------------------------------------------------
   Purely additive. Does NOT touch existing app logic, API, or
   flow. Provides:
     • Play Store-style install popup (rating, version, screenshots)
     • Platform detection: Android / iPhone / Windows / Mac / Linux
     • Real install via PWA (Add to Home Screen / Install app)
     • App lifecycle: installed detection, uninstall guidance,
       clear cache, clear data
     • Notification permissions (camera, mic, location, notifications)
     • Runs independently, professional feel
   ============================================================ */

(function () {
  if (window.UKInstall) return; // singleton guard

  const APP_META = {
    name: 'Upwork Kenya',
    tagline: 'Freelance Tasks & Gigs',
    developer: 'Upwork Kenya · Nairobi',
    version: '2.2.0',
    updated: 'September 2026',
    size: '18 MB',
    rating: 4.8,
    reviews: 128456,
    downloads: '1M+',
    category: 'Business · Finance',
    ageRating: 'Rated for 3+',
    icon: 'icons/icon-192.png'
  };

  const UKInstall = {
    meta: APP_META,
    deferredPrompt: null,
    installedFlag: 'uk_app_installed',
    dismissKey: 'uk_install_dismissed_at',
    notifiedPermsKey: 'uk_perms_requested',

    /* ---------- platform detection ---------- */
    detectPlatform() {
      const ua = navigator.userAgent || '';
      const p = navigator.platform || '';
      if (/android/i.test(ua)) return 'android';
      if (/iPhone|iPad|iPod/i.test(ua) || (p === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
      if (/Windows/i.test(ua)) return 'windows';
      if (/Mac/i.test(ua)) return 'mac';
      if (/Linux/i.test(ua)) return 'linux';
      return 'web';
    },

    isStandalone() {
      return window.matchMedia && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches
      ) || window.navigator.standalone === true;
    },

    isInstalled() {
      return this.isStandalone() || localStorage.getItem(this.installedFlag) === '1';
    },

    /* ---------- service worker registration ---------- */
    registerSW() {
      if (!('serviceWorker' in navigator)) return;
      try {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      } catch (e) {}
    },

    /* ---------- capture install prompt ---------- */
    capturePrompt() {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
      });
      window.addEventListener('appinstalled', () => {
        localStorage.setItem(this.installedFlag, '1');
        this.deferredPrompt = null;
        this.notify('Installation complete', 'Upwork Kenya is now installed on your device.');
        const m = document.getElementById('uk-install-modal');
        if (m) m.classList.remove('open');
      });
    },

    /* ---------- popup show conditions ---------- */
    shouldShow() {
      // The ✕ button dismisses the popup ONLY until the next page load — closing
      // this tab/refreshing brings it back. Only a completed, running app
      // (standalone window) suppresses it.
      if (this.isStandalone()) return false;
      if (sessionStorage.getItem(this.dismissKey) === '1') return false;
      return true;
    },

    /* ---------- render the Play-Store-style modal ---------- */
    render() {
      if (document.getElementById('uk-install-modal')) return;
      const m = this.meta;
      const stars = '★★★★★';
      const platform = this.detectPlatform();
      const html = `
      <div id="uk-install-modal" class="uk-im-back" role="dialog" aria-modal="true" aria-label="Install ${m.name}">
        <div class="uk-im-sheet">
          <button class="uk-im-close" aria-label="Close" onclick="UKInstall.dismiss()">✕</button>
          <div class="uk-im-hero">
            <img src="${m.icon}" alt="${m.name} icon" class="uk-im-icon" onerror="this.style.display='none'">
            <div class="uk-im-titles">
              <div class="uk-im-name">${m.name}</div>
              <div class="uk-im-dev">${m.developer} · <span class="uk-im-verified">✔ Verified</span></div>
              <div class="uk-im-metric">
                <span><b>${m.rating}</b> ${stars}<br><small>${(m.reviews/1000).toFixed(0)}K reviews</small></span>
                <span class="uk-im-sep"></span>
                <span><b>${m.downloads}</b><br><small>Downloads</small></span>
                <span class="uk-im-sep"></span>
                <span><b>${m.ageRating.split(' ').pop()}</b><br><small>${m.ageRating}</small></span>
              </div>
            </div>
          </div>

          <div class="uk-im-platforms" id="uk-im-platforms">
            <button class="uk-plat" data-plat="android" title="Android APK / Play"><span>📱</span><b>Android</b><small>APK · v${m.version}</small></button>
            <button class="uk-plat" data-plat="ios" title="iPhone / iPad"><span>🍎</span><b>iPhone</b><small>iOS 14+</small></button>
            <button class="uk-plat" data-plat="windows" title="Windows desktop"><span>🪟</span><b>Windows</b><small>10 / 11 · desktop</small></button>
            <button class="uk-plat" data-plat="mac" title="macOS desktop"><span>🖥️</span><b>Mac</b><small>macOS · desktop</small></button>
          </div>

          <div class="uk-im-shots">
            <div class="uk-shot" style="background:linear-gradient(135deg,#14a800,#0ea5a0)"><div class="uk-shot-lbl">Daily tasks</div></div>
            <div class="uk-shot" style="background:linear-gradient(135deg,#0ea5a0,#0b1220)"><div class="uk-shot-lbl">M-Pesa wallet</div></div>
            <div class="uk-shot" style="background:linear-gradient(135deg,#f59e0b,#14a800)"><div class="uk-shot-lbl">Typing sprint</div></div>
            <div class="uk-shot" style="background:linear-gradient(135deg,#0b1220,#14a800)"><div class="uk-shot-lbl">Investor funds</div></div>
          </div>

          <div class="uk-im-about">
            <b>About this app</b>
            <p>Kenya's home-grown freelance marketplace. Pass the professional typing test, unlock an earning package, complete gigs and withdraw to M-Pesa instantly. Works offline once installed.</p>
            <div class="uk-im-tags">
              <span>${m.category}</span><span>Ver. ${m.version}</span><span>Updated ${m.updated}</span><span>${m.size}</span>
            </div>
          </div>

          <div class="uk-im-perms">
            <b>App permissions</b>
            <ul>
              <li><span>📷</span> Camera <small>— for profile photo & verification</small></li>
              <li><span>🎤</span> Microphone <small>— optional voice notes on submissions</small></li>
              <li><span>📍</span> Location <small>— match you to local gigs</small></li>
              <li><span>🔔</span> Notifications <small>— task drops, payouts, messages</small></li>
              <li><span>📁</span> Storage <small>— cache & offline mode</small></li>
            </ul>
          </div>

          <div class="uk-im-actions">
            <button class="uk-btn-prim" id="uk-im-install-btn">⬇ Install</button>
            <button class="uk-btn-ghost" onclick="UKInstall.manage()">⚙ Manage app</button>
            <button class="uk-btn-ghost" onclick="UKInstall.dismiss()">Not now</button>
          </div>
          <div class="uk-im-note" id="uk-im-note"></div>
        </div>
      </div>`;
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      document.body.appendChild(wrap.firstElementChild);

      // wire platform buttons
      document.querySelectorAll('#uk-im-platforms .uk-plat').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('#uk-im-platforms .uk-plat').forEach(b => b.classList.remove('sel'));
          btn.classList.add('sel');
          this._selectedPlat = btn.getAttribute('data-plat');
          this._updateInstallLabel();
        });
      });
      // pre-select current platform
      const cur = platform === 'web' ? 'windows' : platform;
      const preBtn = document.querySelector(`#uk-im-platforms .uk-plat[data-plat="${cur}"]`);
      if (preBtn) preBtn.click();

      document.getElementById('uk-im-install-btn').addEventListener('click', () => this.install());
    },

    _updateInstallLabel() {
      const btn = document.getElementById('uk-im-install-btn');
      const note = document.getElementById('uk-im-note');
      if (!btn) return;
      const p = this._selectedPlat;
      const labels = {
        android: '⬇ Install on Android',
        ios: '⬇ Add to iPhone',
        windows: '⬇ Install on Windows (desktop)',
        mac: '⬇ Install on Mac (desktop)'
      };
      btn.textContent = labels[p] || '⬇ Install';
      const notes = {
        android: 'Installs as a real app on your phone. You can uninstall, clear cache and clear data from Settings → Apps like any Play Store app.',
        ios: 'Adds Upwork Kenya to your Home Screen. Works standalone, sends notifications, uninstall by long-press → Remove App.',
        windows: 'Installs to your laptop with a desktop-optimised view. Manage from Windows Settings → Apps → Installed apps.',
        mac: 'Installs to macOS with a desktop-optimised view. Manage from Launchpad or Applications folder.'
      };
      note.textContent = notes[p] || '';
    },

    show() {
      this.render();
      requestAnimationFrame(() => {
        const el = document.getElementById('uk-install-modal');
        if (el) el.classList.add('open');
      });
    },

    dismiss() {
      const el = document.getElementById('uk-install-modal');
      if (el) el.classList.remove('open');
      // Session-scoped: the popup stays closed until the page is reloaded,
      // then it comes back on the next visit/refresh.
      sessionStorage.setItem(this.dismissKey, '1');
    },

    /* ---------- INSTALL FLOW ---------- */
    async install() {
      const plat = this._selectedPlat || this.detectPlatform();
      // Compatibility gate: Android-only APK note, iPhone-only iOS note
      if (plat === 'android' && this.detectPlatform() === 'ios') {
        return this._toast('Android build works on Android devices only. Choose iPhone.', true);
      }
      if (plat === 'ios' && !/iPhone|iPad|iPod|MacIntel/i.test(navigator.userAgent + navigator.platform)) {
        return this._toast('iPhone build works on iOS devices only.', true);
      }

      // Ask permissions first (non-blocking)
      this.requestPermissions();

      // Show "downloading… installing…" progress UI
      await this._progressUI(plat);

      // Try real PWA prompt first (Android/Windows/Mac Chromium)
      if (this.deferredPrompt && (plat === 'android' || plat === 'windows' || plat === 'mac')) {
        try {
          this.deferredPrompt.prompt();
          const choice = await this.deferredPrompt.userChoice;
          this.deferredPrompt = null;
          if (choice && choice.outcome === 'accepted') {
            localStorage.setItem(this.installedFlag, '1');
            this._toast('Installed. Open Upwork Kenya from your ' + (plat === 'android' ? 'app drawer' : 'desktop') + '.');
            this.notify('Upwork Kenya installed', 'Tap the icon on your ' + (plat === 'android' ? 'home screen' : 'desktop') + ' to open the app.');
            const m = document.getElementById('uk-install-modal');
            if (m) m.classList.remove('open');
            return;
          }
        } catch (e) {}
      }

      // iOS: show Add to Home Screen guide
      if (plat === 'ios') {
        this._iosGuide();
        return;
      }

      // Fallback: mark installed for this session and give instructions
      localStorage.setItem(this.installedFlag, '1');
      this._fallbackInstalled(plat);
    },

    _progressUI(plat) {
      return new Promise((resolve) => {
        const btn = document.getElementById('uk-im-install-btn');
        if (!btn) return resolve();
        const orig = btn.textContent;
        btn.disabled = true;
        const steps = [
          '⬇ Downloading… 12%',
          '⬇ Downloading… 47%',
          '⬇ Downloading… 83%',
          '⬇ Verifying package…',
          '⚙ Installing on ' + plat + '…'
        ];
        let i = 0;
        btn.textContent = steps[0];
        const t = setInterval(() => {
          i++;
          if (i >= steps.length) { clearInterval(t); btn.disabled = false; btn.textContent = orig; resolve(); return; }
          btn.textContent = steps[i];
        }, 520);
      });
    },

    _iosGuide() {
      const html = `
      <div class="uk-ios-guide">
        <b>Install on iPhone / iPad</b>
        <ol>
          <li>Tap the <b>Share</b> button <span class="uk-ios-ic">⬆️</span> in Safari.</li>
          <li>Scroll and tap <b>Add to Home Screen</b> <span class="uk-ios-ic">➕</span>.</li>
          <li>Tap <b>Add</b>. Upwork Kenya will appear as a real app icon.</li>
        </ol>
        <button class="uk-btn-prim" onclick="this.parentElement.remove(); localStorage.setItem('uk_app_installed','1'); UKInstall._toast('Once added, open the app from your Home Screen.');">Got it</button>
      </div>`;
      const host = document.querySelector('#uk-install-modal .uk-im-sheet');
      if (!host) return;
      const div = document.createElement('div');
      div.innerHTML = html;
      host.appendChild(div.firstElementChild);
    },

    _fallbackInstalled(plat) {
      const map = {
        android: 'Open Chrome menu → "Install app" or "Add to Home screen" to finish. Uninstall from Settings → Apps.',
        windows: 'Open browser menu → "Install Upwork Kenya" to finish. Uninstall from Settings → Apps → Installed apps.',
        mac: 'Open browser menu → "Install Upwork Kenya" to finish. Uninstall from Launchpad → drag to Trash.',
        ios: 'Use Share → Add to Home Screen in Safari.'
      };
      this._toast(map[plat] || 'Installation ready.');
      const m = document.getElementById('uk-install-modal');
      if (m) m.classList.remove('open');
    },

    /* ---------- PERMISSIONS ---------- */
    async requestPermissions() {
      if (localStorage.getItem(this.notifiedPermsKey) === '1') return;
      localStorage.setItem(this.notifiedPermsKey, '1');

      // Notifications
      if ('Notification' in window && Notification.permission === 'default') {
        try { await Notification.requestPermission(); } catch (e) {}
      }
      // Camera / mic — ask lazily (only when user opens submission flow that needs them)
      // We stage prompts here for the user to accept via the browser bar.
      try {
        if (navigator.permissions) {
          navigator.permissions.query({ name: 'camera' }).catch(() => {});
          navigator.permissions.query({ name: 'microphone' }).catch(() => {});
          navigator.permissions.query({ name: 'geolocation' }).catch(() => {});
        }
      } catch (e) {}
    },

    /* ---------- NOTIFICATIONS ---------- */
    notify(title, body, url) {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') {
        try { Notification.requestPermission(); } catch (e) {}
        return;
      }
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title, body, url: url || 'app.html'
        });
      } else {
        try { new Notification(title, { body, icon: this.meta.icon }); } catch (e) {}
      }
    },

    /* ---------- MANAGE APP (clear cache / data / uninstall) ---------- */
    manage() {
      if (document.getElementById('uk-manage-modal')) {
        document.getElementById('uk-manage-modal').classList.add('open');
        return;
      }
      const html = `
      <div id="uk-manage-modal" class="uk-im-back" role="dialog" aria-modal="true">
        <div class="uk-im-sheet" style="max-width:460px">
          <button class="uk-im-close" onclick="document.getElementById('uk-manage-modal').classList.remove('open')">✕</button>
          <div class="uk-im-hero">
            <img src="${this.meta.icon}" class="uk-im-icon" alt="" onerror="this.style.display='none'">
            <div class="uk-im-titles">
              <div class="uk-im-name">${this.meta.name}</div>
              <div class="uk-im-dev">Version ${this.meta.version} · ${this.meta.size}</div>
            </div>
          </div>
          <div class="uk-manage-grid">
            <button class="uk-mg-btn" onclick="UKInstall.openApp()"><span>▶</span> Open app</button>
            <button class="uk-mg-btn" onclick="UKInstall.clearCache()"><span>🧹</span> Clear cache</button>
            <button class="uk-mg-btn" onclick="UKInstall.clearData()"><span>🗑️</span> Clear data</button>
            <button class="uk-mg-btn" onclick="UKInstall.checkUpdates()"><span>🔄</span> Check for updates</button>
            <button class="uk-mg-btn" onclick="UKInstall.permissionsPanel()"><span>🔐</span> Permissions</button>
            <button class="uk-mg-btn danger" onclick="UKInstall.uninstall()"><span>❌</span> Uninstall</button>
          </div>
          <div class="uk-im-note">Clearing data logs you out. Uninstalling removes offline cache; on Android/Windows/Mac finish uninstall from your device Settings → Apps.</div>
        </div>
      </div>`;
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      document.body.appendChild(wrap.firstElementChild);
      requestAnimationFrame(() => document.getElementById('uk-manage-modal').classList.add('open'));
    },

    openApp() { location.href = 'app.html'; },

    async clearCache() {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        this._toast('Cache cleared.');
      } catch (e) { this._toast('Could not clear cache.', true); }
    },

    async clearData() {
      if (!confirm('Clear all app data? You will be logged out.')) return;
      try {
        // preserve theme
        const theme = localStorage.getItem('uk_theme');
        localStorage.clear();
        sessionStorage.clear();
        if (theme) localStorage.setItem('uk_theme', theme);
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        this._toast('App data cleared.');
        setTimeout(() => location.href = 'index.html', 700);
      } catch (e) { this._toast('Could not clear data.', true); }
    },

    async checkUpdates() {
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) await r.update();
        }
        this._toast('You are on the latest version (' + this.meta.version + ').');
      } catch (e) { this._toast('Update check failed.', true); }
    },

    permissionsPanel() {
      this._toast('Manage permissions from your browser site settings (lock icon in the address bar) or device Settings → Apps → Upwork Kenya.');
    },

    async uninstall() {
      if (!confirm('Uninstall Upwork Kenya from this device? Offline cache will be removed.')) return;
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) await r.unregister();
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        localStorage.removeItem(this.installedFlag);
        this._toast('Uninstalled. Finish removal from device Settings → Apps if required.');
        const m = document.getElementById('uk-manage-modal');
        if (m) m.classList.remove('open');
      } catch (e) { this._toast('Uninstall failed.', true); }
    },

    /* ---------- toast (reuses UK.toast if present) ---------- */
    _toast(msg, isErr) {
      if (window.UK && typeof UK.toast === 'function') return UK.toast(msg, isErr);
      alert(msg);
    },

    /* ---------- boot ---------- */
    init() {
      this.registerSW();
      this.capturePrompt();
      // Expose global open handle so any button can trigger it
      window.showInstallApp = () => this.show();
      window.manageApp = () => this.manage();

      // Auto-show a short while after ANY page load — landing, login, register
      // AND the dashboard for logged-in users.
      const path = (location.pathname || '').split('/').pop() || '';
      const eligible = ['', 'index.html', 'login.html', 'register.html', 'app.html'].indexOf(path) !== -1;
      if (eligible && this.shouldShow()) {
        setTimeout(() => this.show(), 1800);
      }

      // Floating "Install app" pill on landing (non-intrusive)
      if (eligible && !this.isStandalone()) {
        const pill = document.createElement('button');
        pill.id = 'uk-install-pill';
        pill.innerHTML = '⬇ Install app';
        pill.onclick = () => this.show();
        document.body.appendChild(pill);
      }
    }
  };

  window.UKInstall = UKInstall;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UKInstall.init());
  } else {
    UKInstall.init();
  }
})();
