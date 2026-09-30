'use strict';

/* Upwork Kenya — dashboard SPA
   v3: paid package unlocks via M-Pesa STK PIN prompt, professional typing test,
   free starter gig on test-pass, package-gated daily tasks. */

if (!UK.token) { location.href = 'login.html'; }

const MAIN = () => document.getElementById('main');
let ME = UK.user || null;

const GIG_TYPES = ['Assignments', 'Article Writing', 'Poster Design', 'Data Entry', 'Copywriting', 'Academic Writing', 'Mail Merging', 'Excel Cleanup', 'Data Analysis'];

/* ---------- boot ---------- */
UK.splash(900);

function go(view) {
  const b = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (b) b.click();
}

document.querySelectorAll('.nav-item[data-view]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    // Remember the current view so a page refresh returns to the SAME screen
    // instead of always landing back on the dashboard.
    try { sessionStorage.setItem('uk_view', b.dataset.view); } catch {}
    render(b.dataset.view);
  });
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try { await UK.api('/api/logout', { method: 'POST' }); } catch {}
  UK.token = ''; UK.user = null; location.href = 'index.html';
});

document.getElementById('avatarBtn').addEventListener('click', () => go('profile'));
document.getElementById('walletPill').addEventListener('click', () => go('wallet'));

document.getElementById('notifBtn').addEventListener('click', async () => {
  const drop = document.getElementById('notifDrop');
  drop.classList.toggle('open');
  if (drop.classList.contains('open')) {
    const r = await UK.api('/api/notifications');
    drop.innerHTML = r.notifications.length
      ? r.notifications.map(n => `<div class="dd-item"><div>${UK.esc(n.text)}</div><div style="color:var(--muted);font-size:12px;margin-top:4px">${UK.timeAgo(n.at)}</div></div>`).join('')
      : '<div class="dd-item" style="color:var(--muted)">No notifications yet.</div>';
    UK.api('/api/notifications/read', { method: 'POST' }).then(() => refreshNotifDot());
  }
});

function paintWalletPill(v) {
  const el = document.getElementById('walletPillAmt');
  if (el) el.textContent = UK.money(v);
}

async function refreshMe() {
  try {
    const r = await UK.api('/api/me');
    ME = r.user; UK.user = ME;
    ME.announcements = r.announcements || []; // admin announcements shown on the profile
    paintAvatar(); paintWalletPill(ME.wallet);
  } catch (e) {
    /* Only a REAL auth failure (invalid/expired token) logs the user out. A
       network blip, a cold-starting server or a poisoned cache must never
       kick a logged-in user back to the login page. */
    if (/log in first/i.test(e.message || '')) { UK.token = ''; location.href = 'login.html'; }
    else UK.toast('Connection problem — you are still logged in. Retrying shortly.', true);
  }
}
async function refreshNotifDot() {
  try {
    const r = await UK.api('/api/notifications');
    const d = document.getElementById('notifCount');
    if (r.unread > 0) { d.textContent = r.unread; d.style.display = 'grid'; } else d.style.display = 'none';
  } catch {}
}
function paintAvatar() {
  const el = document.getElementById('avatarBtn');
  el.innerHTML = ME && ME.avatar ? `<img src="${UK.esc(ME.avatar)}">` : UK.initials(ME && ME.name);
}

(async () => {
  await refreshMe();
  refreshNotifDot();
  // On refresh, re-open the view the user was on (dashboard only on first entry).
  let startView = 'dashboard';
  try { startView = sessionStorage.getItem('uk_view') || 'dashboard'; } catch {}
  const startBtn = document.querySelector(`.nav-item[data-view="${startView}"]`);
  if (startBtn && startView !== 'dashboard') {
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    startBtn.classList.add('active');
    render(startView);
  } else {
    startView = 'dashboard';
    render('dashboard');
  }
  try { sessionStorage.setItem('uk_view', startView); } catch {}
  setInterval(refreshNotifDot, 45000);
  // near-real-time wallet balance
  setInterval(async () => {
    try { const e = await UK.api('/api/earnings'); ME.wallet = e.wallet; paintWalletPill(e.wallet); } catch {}
  }, 30000);
})();

/* ---------- views ---------- */
function render(view) {
  const fn = ({
    dashboard: viewDashboard, packages: viewPackages, tasks: viewTasks, test: viewTest,
    wallet: viewWallet, invest: viewInvest, market: viewMarket, orders: viewOrders,
    profile: viewProfile, verify: viewVerify, settings: viewSettings
  })[view] || viewDashboard;
  fn();
}

/* -- dashboard -- */
async function viewDashboard() {
  MAIN().innerHTML = `
    <div class="view-head">
      <div>
        <h1 style="font-size:28px;letter-spacing:-1px">Karibu, ${UK.esc((ME.name || '').split(' ')[0])} 👋</h1>
        <p style="color:var(--muted);margin-top:6px">${new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — here's your snapshot.</p>
      </div>
      ${ME.verified ? '<span class="pill pill-blue">✓ Verified freelancer</span>' : ''}
    </div>

    <div class="grid grid-4">
      <div class="card stat"><span class="ico">💰</span><div class="num" id="sWallet">…</div><div class="lbl">Earnings wallet</div></div>
      <div class="card stat"><span class="ico">📈</span><div class="num" id="sInvest">…</div><div class="lbl">Investor wallet</div></div>
      <div class="card stat"><span class="ico">⚡</span><div class="num" id="sToday">…</div><div class="lbl">Tasks done today</div></div>
      <div class="card stat"><span class="ico">💎</span><div class="num" id="sTier">…</div><div class="lbl">Active package</div></div>
    </div>

    <div class="hire-banner" style="margin-top:22px">
      <h2>Your path to earning 🇰🇪</h2>
      <p style="margin-top:8px">Follow three quick steps: pass the professional typing test to earn a free starter gig, unlock an earning package via M-Pesa STK push, then complete your daily tasks — money reflects straight to your wallet the moment work is approved.</p>
      <div class="steps">
        <div class="step"><span class="n">1</span><b>Pass the typing test</b><span>30+ WPM at 90% accuracy — get a free KES 150 starter gig</span></div>
        <div class="step"><span class="n">2</span><b>Unlock a package</b><span>Pay via M-Pesa PIN prompt — Basic to Advanced Pro</span></div>
        <div class="step"><span class="n">3</span><b>Do your daily tasks</b><span>Work on your computer, upload the file, get verified</span></div>
        <div class="step"><span class="n">4</span><b>Withdraw to M-Pesa</b><span>Live wallet updates — cash out every 7 days</span></div>
      </div>
      <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;position:relative">
        <button class="btn btn-primary btn-sm" onclick="go('packages')">View earning packages →</button>
        <button class="btn btn-ghost btn-sm" style="background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.25)" onclick="go('test')">Take typing test</button>
      </div>
    </div>

    <div class="card" style="margin-top:22px" id="pkgCard"><div class="skel" style="min-height:90px"></div></div>

    <div class="card" style="margin-top:22px">
      <h3 style="margin-bottom:10px">Recent activity</h3>
      <div id="recentList" class="skel" style="min-height:110px"></div>
    </div>
  `;
  try {
    const [e, inv, pk] = await Promise.all([
      UK.api('/api/earnings'),
      UK.api('/api/invest').catch(() => null),
      UK.api('/api/packages').catch(() => null)
    ]);
    document.getElementById('sWallet').textContent = UK.money(e.wallet);
    document.getElementById('sInvest').textContent = UK.money(inv ? inv.investBalance : 0);
    document.getElementById('sToday').textContent = e.todayCount;
    const cur = pk && pk.packages.find(p => p.current);
    if (pk) {
      document.getElementById('sTier').textContent = cur ? cur.name.toUpperCase() : 'NONE';
      const nextLocked = pk.packages.find(p => !p.unlocked);
      const pc = document.getElementById('pkgCard');
      if (cur) {
        pc.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div>
              <h3>Your active package: <span style="color:${cur.color}">${cur.name}</span></h3>
              <p style="color:var(--muted);font-size:13.5px;margin-top:4px">
                ${cur.tasksPerDay} tasks/day × KES ${cur.payPerTask} = <b style="color:var(--text)">KES ${cur.daily}/day</b>
                ${pk.verified ? ' · ✓ Verified: +1 task &amp; +15% pay' : ''}
              </p>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="go('packages')">All packages →</button>
          </div>
          ${nextLocked ? `
            <div style="margin-top:14px">
              <div style="font-size:13px;color:var(--muted);margin-bottom:6px">
                Next up: <b style="color:${nextLocked.color}">${nextLocked.name}</b> — unlock for <b style="color:var(--text)">${UK.money(nextLocked.price)}</b> via M-Pesa STK push.
              </div>
              <button class="btn btn-primary btn-sm" onclick="go('packages')">Unlock ${nextLocked.name} →</button>
            </div>` : `
            <p style="color:var(--muted);font-size:13.5px;margin-top:12px">🏆 You've unlocked every package — maximum daily earnings enabled!</p>`}
        `;
      } else {
        pc.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <div>
              <h3>You have no active package yet</h3>
              <p style="color:var(--muted);font-size:13.5px;margin-top:4px">
                Unlock a package via M-Pesa STK push to receive your daily tasks. Basic is <b style="color:var(--text)">${UK.money(500)}</b> — the fastest way to start earning.
              </p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="go('packages')">Unlock a package →</button>
          </div>`;
      }
    } else {
      document.getElementById('sTier').textContent = 'NONE';
      document.getElementById('pkgCard').innerHTML = '<p style="color:var(--muted)">Package info unavailable.</p>';
    }
    const list = document.getElementById('recentList');
    list.classList.remove('skel');
    if (!e.recent.length) list.innerHTML = '<p style="color:var(--muted)">No tasks yet — pass the <b>typing test</b> first (free starter gig), then unlock a <b>package</b> to receive daily tasks.</p>';
    else list.innerHTML = '<table><thead><tr><th>Task</th><th>Category</th><th>Earned</th><th>When</th></tr></thead><tbody>' +
      e.recent.slice(0, 8).map(a => `<tr><td>${UK.esc(a.title)}</td><td><span class="pill pill-blue">${UK.esc(a.category)}</span></td><td><b>${UK.money(a.net)}</b></td><td>${UK.timeAgo(a.at)}</td></tr>`).join('') + '</tbody></table>';
  } catch (err) { UK.toast(err.message, true); }
}

/* -- packages (PAID unlocks via M-Pesa STK push) -- */
async function viewPackages() {
  MAIN().innerHTML = `
    <div class="view-head">
      <div>
        <h1 style="font-size:28px">Earning packages 💎</h1>
        <p style="color:var(--muted);margin-top:6px">Each package is a one-off unlock via M-Pesa. Enter your number, then your M-Pesa PIN — the package unlocks automatically and its daily tasks appear in your task drop.</p>
      </div>
    </div>
    <div class="hire-banner" style="padding:24px 26px">
      <h2 style="font-size:22px">How the M-Pesa PIN prompt works</h2>
      <p style="margin-top:6px;font-size:14px">Choose a package, enter your Safaricom number. You'll receive an M-Pesa PIN prompt on your phone — enter your PIN to confirm the payment. On success, the package unlocks instantly, and today's tasks (${GIG_TYPES.join(', ')}) start dropping at that package's rate.</p>
    </div>
    <div id="pkgBody" style="margin-top:20px"><div class="skel" style="min-height:320px"></div></div>
  `;
  try {
    const r = await UK.api('/api/packages');
    document.getElementById('pkgBody').innerHTML = `
      <div class="pkg-grid">
        ${r.packages.map(p => `
          <div class="card pkg-card ${p.unlocked ? '' : 'locked'} ${p.current ? 'current' : ''}">
            <span class="pkg-top" style="background:${p.color}"></span>
            ${p.current ? '<span class="current-tag pill pill-green">Active</span>'
              : p.unlocked ? '<span class="lock-tag pill pill-blue">Unlocked</span>'
              : '<span class="lock-tag pill pill-amber">🔒 Locked</span>'}
            <div style="font-weight:900;font-size:19px;margin-top:6px;color:${p.color}">${p.name}</div>
            <div style="color:var(--muted);font-size:12.5px">${p.tagline}</div>
            <div class="pkg-price">${UK.money(p.price)}<span style="font-size:13px;color:var(--muted);font-weight:600"> one-off</span></div>
            <div style="font-size:13.5px;color:var(--muted);line-height:1.8">
              ⚡ ${p.tasksPerDay} gigs per day<br>
              💵 KES ${p.payPerTask} per gig<br>
              🎯 Daily earning potential: <b style="color:var(--text)">${UK.money(p.daily)}/day</b>
            </div>
            <div>${GIG_TYPES.slice(0, 4).map(g => `<span class="chip">${g}</span>`).join('')}<span class="chip">+${GIG_TYPES.length - 4} more</span></div>
            ${p.current
              ? '<div class="form-msg ok" style="display:block;margin-top:4px">Active package — gigs at this rate are in your daily drop.</div>'
              : p.unlocked
                ? `<button class="btn btn-ghost btn-sm" data-activate="${p.key}" style="margin-top:6px">Set as active package</button>`
                : `<button class="btn btn-primary btn-sm" data-unlock="${p.key}" data-price="${p.price}" data-name="${UK.esc(p.name)}" style="margin-top:6px">Unlock for ${UK.money(p.price)} via M-Pesa →</button>`}
          </div>`).join('')}
        <div class="card pkg-card" style="border-style:dashed">
          <span class="pkg-top" style="background:#1d9bf0"></span>
          <span class="lock-tag" style="color:#1d9bf0;font-size:22px">✓</span>
          <div style="font-weight:900;font-size:19px;margin-top:6px;color:#1d9bf0">Verified Badge</div>
          <div style="color:var(--muted);font-size:12.5px">One-off identity verification (KES ${r.verificationPrice || 450} via M-Pesa STK push)</div>
          <div style="font-size:13.5px;color:var(--muted);line-height:1.8;margin-top:6px">
            ✓ Blue badge on profile &amp; gigs<br>
            ⚡ +1 extra task every day<br>
            💵 +15% pay boost on all gigs<br>
            🔝 Priority in marketplace search
          </div>
          ${r.verified
            ? '<div class="form-msg ok" style="display:block;margin-top:8px">You are verified. Asante!</div>'
            : `<button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="go('verify')">Get verified for KES ${r.verificationPrice || 450} →</button>`}
        </div>
      </div>
      <div class="card" style="margin-top:20px">
        <h3 style="margin-bottom:8px">How unlocking works</h3>
        <p style="color:var(--muted);font-size:14px;line-height:1.8">
          Click <b>Unlock</b> on any package. You'll enter your M-Pesa number, then a payment prompt appears on your phone. Enter your M-Pesa PIN to confirm. After a successful transaction, the package is unlocked instantly — its daily gigs start appearing in your task drop and the higher pay rate applies immediately.
          ${r.verified ? ' As a verified member you earn 15% more on every gig.' : ' Tip: the ✓ Verified badge adds +15% pay on every gig — even faster earnings.'}
        </p>
      </div>`;

    // Wire unlock buttons → open M-Pesa PIN prompt modal
    document.querySelectorAll('button[data-unlock]').forEach(b => {
      b.onclick = () => openPayModal({
        purpose: 'package',
        packageKey: b.dataset.unlock,
        name: b.dataset.name,
        price: Number(b.dataset.price),
        onSuccess: viewPackages
      });
    });
    // Activate (switch active among unlocked)
    document.querySelectorAll('button[data-activate]').forEach(b => {
      b.onclick = async () => {
        b.disabled = true;
        try {
          await UK.api('/api/packages/activate', { method: 'POST', body: JSON.stringify({ key: b.dataset.activate }) });
          UK.toast('✅ Active package updated.');
          await refreshMe();
          viewPackages();
        } catch (err) { UK.toast(err.message, true); b.disabled = false; }
      };
    });
  } catch (err) { UK.toast(err.message, true); }
}

/* -- Universal M-Pesa STK PIN prompt modal (packages, verification, deposit) -- */
function openPayModal({ purpose, packageKey, name, price, onSuccess }) {
  const isFixed = purpose === 'package' || purpose === 'verify';
  const label = purpose === 'package'
    ? `Unlock ${name} package`
    : purpose === 'verify' ? 'Activate Verified badge' : 'Deposit to wallet';

  const html = `
    <div class="modal-back open" id="payM">
      <div class="modal">
        <h3>💳 ${label}</h3>
        <p style="color:var(--muted);font-size:13.5px;margin:6px 0 12px">
          ${purpose === 'package'
            ? `Pay <b>${UK.money(price)}</b> to unlock the <b>${UK.esc(name)}</b> package. Enter your Safaricom M-Pesa number below — we'll send a PIN prompt to your phone. Enter your PIN to confirm. On success, the package unlocks instantly and its daily gigs appear in your task drop.`
            : purpose === 'verify'
              ? `Pay the one-off KES ${price} verification fee. Enter your Safaricom M-Pesa number below — a PIN prompt lands on your phone; enter your PIN to confirm and the ✓ Verified badge activates instantly.`
              : `Enter the amount and your M-Pesa number — a PIN prompt lands on your phone.`}
        </p>
        ${!isFixed ? `<label>Amount (KES)</label><input id="pmAmt" type="number" min="1" placeholder="Amount">` : ''}
        <label>M-Pesa number</label>
        <input id="pmPhone" placeholder="0712345678" autocomplete="tel">
        <div id="pmStage" style="margin-top:14px"></div>
        <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
          <button class="btn btn-primary" id="pmGo">Send M-Pesa PIN prompt →</button>
          <button class="btn btn-primary" id="pmComplete" style="display:none">✅ Complete Transaction</button>
          <button class="btn btn-ghost" id="pmManual">Pay manually</button>
          <button class="btn btn-ghost" id="pmClose">Cancel</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  let closed = false;
  let pushActive = false; // a PIN prompt already on the phone can never be duplicated by extra taps
  const closeM = () => { closed = true; const m = document.getElementById('payM'); if (m) m.remove(); };
  document.getElementById('pmClose').onclick = closeM;

  /* Pay manually — its own panel. Use it when the STK push was refused or
     never arrived: send the money yourself in the M-Pesa app, then enter the
     confirmation code from the SMS. This NEVER sends another STK push. */
  document.getElementById('pmManual').onclick = () => {
    const phoneEl = document.getElementById('pmPhone');
    const amtEl = document.getElementById('pmAmt');
    document.getElementById('pmStage').innerHTML = `
      <div class="card" style="border:1.5px solid var(--accent);padding:14px">
        <b>🏧 Pay manually via M-Pesa</b>
        <div style="color:var(--muted);font-size:13px;margin-top:6px">Send <b>${amtEl && amtEl.value ? UK.money(amtEl.value) : 'the amount'}</b> from <b>${UK.esc(phoneEl ? phoneEl.value.trim() : 'your M-Pesa number')}</b> to the Upwork Kenya M-Pesa till in your M-Pesa app, then enter the <b>10-character confirmation code</b> from the SMS below (e.g. QGH1ABC2XY). The payment completes instantly.</div>
        <div id="pmCodeBox" style="display:flex;gap:8px;margin-top:10px">
          <input id="pmReceipt" placeholder="M-Pesa confirmation code" style="text-transform:uppercase;flex:1" autocomplete="off" maxlength="12">
          <button class="btn btn-primary btn-sm" id="pmConfirm">Confirm payment →</button>
        </div>
        <div id="pmRecMsg" style="margin-top:8px"></div>
      </div>`;
    document.getElementById('pmConfirm').onclick = () => {
      UK.toast('⚠️ Click "Send M-Pesa PIN prompt" first — your payment must be registered before its code can be confirmed.', true);
    };
  };

  document.getElementById('pmGo').onclick = async () => {
    if (closed) return;
    const goBtn0 = document.getElementById('pmGo');
    if (goBtn0.disabled) return; // after a successful payment the button stays disabled — a click can never re-send an STK push
    if (pushActive) return; // an STK push is already in flight — extra taps are ignored entirely, so no duplicate push can ever be sent
    const phone = document.getElementById('pmPhone').value.trim();
    if (!/^(?:254|0|\+254)\d{9}$/.test(phone.replace(/[\s]/g, ''))) { UK.toast('Enter a valid M-Pesa phone number (e.g. 0712345678).', true); return; }
    let amount;
    if (isFixed) amount = price;
    else {
      amount = Number(document.getElementById('pmAmt').value);
      if (!amount || amount < 1) { UK.toast('Enter a valid amount (minimum KES 1).', true); return; }
    }

    const goBtn = document.getElementById('pmGo');
    const manualBtn = document.getElementById('pmManual');
    const stage = document.getElementById('pmStage');
    goBtn.disabled = true; goBtn.textContent = 'Contacting M-Pesa…';
    stage.innerHTML = `
      <div class="card" style="border:1.5px solid var(--primary);padding:14px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="skel" style="width:18px;height:18px;border-radius:50%;min-height:18px"></span>
          <b>Sending PIN prompt to ${UK.esc(phone)}…</b>
        </div>
        <div style="color:var(--muted);font-size:13px;margin-top:6px">Requesting M-Pesa STK push for ${UK.money(amount)}.</div>
      </div>`;

    let paymentId;
    try {
      const payload = { phone, purpose };
      if (purpose === 'package') payload.packageKey = packageKey;
      else if (purpose === 'deposit') payload.amount = amount;
      const r = await UK.api('/api/pay/kcb/stkpush', { method: 'POST', body: JSON.stringify(payload) });
      paymentId = r.paymentId;
      pushActive = true;
      /* The ✅ Complete Transaction button only becomes active once a payment
         exists — clicking it before any push can never create or approve one. */
      const cBtn0 = document.getElementById('pmComplete');
      if (cBtn0) cBtn0.style.display = '';
    } catch (err) {
      stage.innerHTML = `<div class="form-msg err" style="display:block">❌ ${UK.esc(err.message)}</div>`;
      pushActive = false; // the push was rejected before it was created — a fresh attempt is safe
      goBtn.disabled = false; goBtn.textContent = 'Send M-Pesa PIN prompt →';
      return;
    }

    // Poll status — fast (every 400ms) so confirmation feels near-instant.
    // The server actively queries the gateway every 3s and only marks a
    // payment 'timeout' after 100s of total silence (callback lost AND query
    // says nothing) — we stop just before that so the recovery screen (enter
    // the M-Pesa SMS code) is driven by the server, not the stopwatch.
    // Meanwhile the code-entry box is ALWAYS one tap away: anyone who has the
    // M-Pesa SMS can finish immediately instead of staring at a spinner.
    const started = Date.now();
    const TIMEOUT_MS = 95000;
    let finished = false;
    let pendingBox = null;

    /* The M-Pesa confirmation-code box — its own panel, rendered ONCE and
       kept stable, so polling re-renders never wipe it mid-typing. */
    const codeBox = () => {
      if (pendingBox && pendingBox.isConnected) return pendingBox;
      pendingBox = document.createElement('div');
      pendingBox.innerHTML = `
        <div style="border-top:1px dashed var(--border);margin:12px 0 10px"></div>
        <div style="font-size:13px;color:var(--muted)">Already paid and have the M-Pesa SMS? Enter the <b>10-character confirmation code</b> (e.g. QGH1ABC2XY) to finish instantly:</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input id="pmReceiptInline" placeholder="e.g. QGH1ABC2XY" style="text-transform:uppercase;flex:1" autocomplete="off" maxlength="12">
          <button class="btn btn-primary btn-sm" id="pmConfirmInline">Confirm →</button>
        </div>
        <div id="pmInlineMsg" style="margin-top:8px"></div>`;
      pendingBox.querySelector('#pmConfirmInline').onclick = async () => {
        if (finished || closed) return;
        const receipt = pendingBox.querySelector('#pmReceiptInline').value.trim();
        if (receipt.length < 10) { UK.toast('Enter the full 10-character M-Pesa confirmation code from the SMS.', true); return; }
        const cb3 = pendingBox.querySelector('#pmConfirmInline');
        cb3.disabled = true; cb3.textContent = 'Verifying…';
        try {
          await UK.api('/api/pay/kcb/confirm', { method: 'POST', body: JSON.stringify({ paymentId, receipt }) });
          finish(true, '✅ Payment successful', `M-Pesa receipt <b>${UK.esc(receipt.toUpperCase())}</b> · ${UK.money(amount)} confirmed. ${purpose === 'package' ? 'Package unlocked!' : purpose === 'verify' ? 'You are now Verified ✓' : 'Your wallet has been credited.'}`);
        } catch (e3) {
          if (closed) return;
          cb3.disabled = false; cb3.textContent = 'Confirm →';
          pendingBox.querySelector('#pmInlineMsg').innerHTML = `<div class="form-msg err" style="display:block">${UK.esc(e3.message)}</div>`;
        }
      };
      return pendingBox;
    };

    /* If M-Pesa is slow / the callback never arrives but the user GOT the SMS,
       let them complete instantly with the confirmation code from the SMS. */
    const showRecovery = why => {
      if (closed || finished) return;
      stage.innerHTML = `
        <div class="card" style="border:1.5px solid var(--accent);padding:14px">
          <b>⏱️ ${why}</b>
          <div style="color:var(--muted);font-size:13px;margin-top:6px">If you already received the M-Pesa confirmation SMS from Safaricom/KCB, enter the <b>confirmation code</b> below (e.g. QGH1ABC2XY) to complete instantly. No code yet? Use <b>Pay manually</b> below, or try again.</div>
          <div id="pmRecoveryBox"></div>
          <div id="pmRecMsg" style="margin-top:8px"></div>
        </div>`;
      document.getElementById('pmRecoveryBox').appendChild(codeBox());
      if (manualBtn) { manualBtn.disabled = false; }
      pushActive = false; // the first push has reached a terminal state — only a DELIBERATE tap on "Try again" can send a new one
      goBtn.disabled = false; goBtn.textContent = 'Try again →';
    };
    const finish = (ok, title, msg) => {
      if (closed || finished) return;
      finished = true;
      stage.innerHTML = `
        <div class="card" style="border:1.5px solid ${ok ? 'var(--primary)' : '#ef4444'};padding:14px">
          <b>${title}</b>
          <div style="color:var(--muted);font-size:13px;margin-top:6px">${msg}</div>
        </div>`;
      if (ok) {
        // After a successful payment this button becomes INERT — clicking it
        // never sends another STK push. The panel closes on its own below.
        goBtn.disabled = true; goBtn.textContent = 'Done ✓';
        if (manualBtn) manualBtn.disabled = true;
      } else {
        goBtn.disabled = false; goBtn.textContent = 'Try again →';
        if (manualBtn) manualBtn.disabled = false;
      }
      if (ok) {
        UK.toast('✅ ' + title);
        refreshMe().then(() => {
          setTimeout(() => { closeM(); if (onSuccess) onSuccess(); }, 2000);
        });
      } else UK.toast(title, true);
    };

    const successMsg = st => `M-Pesa receipt <b>${UK.esc(st.mpesaReceipt || '—')}</b> · ${UK.money(st.amount)} paid. ${purpose === 'package' ? 'Package unlocked!' : purpose === 'verify' ? 'You are now Verified ✓' : `New wallet balance: <b>${UK.money(st.wallet)}</b>.`}`;

    /* ✅ COMPLETE TRANSACTION — after entering your PIN you receive the M-Pesa
       and bank confirmation messages; tapping this checks the transaction and
       completes it the moment the payment is proven to have gone through.
       - success → completes immediately (package unlocks / wallet credits)
       - cancelled → "Payment cancelled — try again" (nothing is completed)
       - still processing → tells you to tap again in a few seconds
       - proof exists but the callback was lost → enter the M-Pesa code and it
         is completed against the real receipt. */
    const handleStatus = async (st, fromButton) => {
      if (st.status === 'success') { finish(true, '✅ Payment successful', successMsg(st)); return true; }
      if (st.status === 'cancelled') {
        if (fromButton) {
          UK.toast('🚫 Payment cancelled — try again.', true);
          pushActive = false;
          goBtn.disabled = false; goBtn.textContent = 'Try again →';
          const cBtn1 = document.getElementById('pmComplete');
          if (cBtn1) { cBtn1.disabled = false; cBtn1.textContent = '✅ Complete Transaction'; }
          stage.innerHTML = `<div class="form-msg err" style="display:block">🚫 <b>Payment cancelled</b> — the M-Pesa prompt was cancelled on the phone and no money was deducted. Press <b>Try again</b> to send a new prompt, or use Pay manually.</div>`;
          return;
        }
        finish(false, '🚫 Payment cancelled — try again', 'The M-Pesa prompt was cancelled on the phone. No money was deducted. You can use Pay manually below or try again.');
        return true;
      }
      if (st.status === 'timeout') { showRecovery('M-Pesa reported a timeout — but your payment may have gone through'); return true; }
      if (st.status === 'failed') { finish(false, '❌ Payment failed', UK.esc(st.resultDesc || 'The payment could not be completed.') + ' No money was deducted. You can use Pay manually below or try again.'); return true; }
      if (fromButton) {
        const cBtn2 = document.getElementById('pmComplete');
        if (cBtn2) { cBtn2.disabled = false; cBtn2.textContent = '✅ Complete Transaction'; }
        UK.toast('⏳ Still processing — if you entered your PIN, tap Complete Transaction again in a few seconds.');
        return true;
      }
      return false; // still pending — the poll keeps watching
    };

    document.getElementById('pmComplete').onclick = async () => {
      if (closed || finished || !paymentId) return;
      const cBtn = document.getElementById('pmComplete');
      cBtn.disabled = true; cBtn.textContent = 'Checking transaction…';
      try {
        const st = await UK.api('/api/pay/kcb/status/' + paymentId);
        await handleStatus(st, true);
      } catch (e2) {
        UK.toast(e2.message || 'Could not check the transaction — try again.', true);
      }
      if (!finished && !closed && document.getElementById('pmComplete')) {
        const cBtn3 = document.getElementById('pmComplete');
        if (cBtn3 && cBtn3.disabled) { cBtn3.disabled = false; cBtn3.textContent = '✅ Complete Transaction'; }
      }
    };

    const poll = async () => {
      if (finished || closed) return;
      if (Date.now() - started > TIMEOUT_MS) return showRecovery('Payment is taking longer than usual');
      let st;
      try { st = await UK.api('/api/pay/kcb/status/' + paymentId); } catch { return setTimeout(poll, 400); }
      if (finished || closed) return;
      if (await handleStatus(st, false)) return; // a terminal state was reached and handled
      // still pending — live status, with the SMS-code box as its own stable
      // panel below it (never wiped mid-typing by these re-renders).
      stage.innerHTML = `
        <div class="card" style="border:1.5px solid var(--primary);padding:14px">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="skel" style="width:18px;height:18px;border-radius:50%;min-height:18px"></span>
            <b>Check your phone 📲 — Enter your M-Pesa PIN</b>
          </div>
          <div style="color:var(--muted);font-size:13px;margin-top:6px">A PIN prompt was sent to <b>${UK.esc(phone)}</b> for <b>${UK.money(amount)}</b>. Enter your M-Pesa PIN, wait for the M-Pesa &amp; bank messages, then press <b>✅ Complete Transaction</b> — this page also updates automatically.</div>
          <div class="progress" style="margin-top:12px"><i style="width:${Math.min(96, Math.round((Date.now() - started) / TIMEOUT_MS * 100))}%"></i></div>
          <div id="pmPendingBox"></div>
        </div>`;
      document.getElementById('pmPendingBox').appendChild(codeBox());
      setTimeout(poll, 400);
    };
    poll();
  };
}

/* -- tasks (gated by paid package) -- */
async function viewTasks() {
  MAIN().innerHTML = `<h1 style="font-size:28px">Today's tasks</h1><p style="color:var(--muted);margin:6px 0 22px">Do each task <b>on your own computer</b>, convert it to the required format (<b>posters → PDF · data entry &amp; analysis → Excel · essays, reports &amp; articles → Word</b>), then upload it here. Every file is <b>scanned</b> instantly, then <b>verified</b> — your earnings are released the moment it is approved.</p><div id="taskGrid" class="grid grid-3"><div class="skel" style="min-height:200px"></div></div>`;
  try {
    const r = await UK.api('/api/tasks/today');
    const g = document.getElementById('taskGrid');
    const remaining = r.tasks.filter(t => !t.done).length;
    if (!r.tasks.length) { g.innerHTML = '<p style="color:var(--muted)">No tasks available today — check back tomorrow.</p>'; return; }
    MAIN().insertAdjacentHTML('afterbegin', `
      <div class="card" style="margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div style="font-size:14px">
          Package: <b style="color:${(r.tierInfo && r.tierInfo.color) || 'var(--primary)'}">${(r.tierInfo && r.tierInfo.name) || r.tier}</b>
          · ${r.tasks.length} gigs today · <b>${remaining} remaining</b>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="go('packages')">Upgrade earnings →</button>
      </div>`);
    g.innerHTML = r.tasks.map(t => {
      const fmtLabel = t.deliverable === 'excel' ? '📊 Submit as Excel (.xlsx)' : t.deliverable === 'word' ? '📝 Submit as Word (.docx)' : '🖼️ Submit as PDF';
      return `
      <div class="card task-card ${t.done ? 'done' : ''}">
        <span class="pill pill-blue">${UK.esc(t.category)}</span>
        <div style="font-weight:800;font-size:16px;line-height:1.4">${UK.esc(t.title)}</div>
        <div style="color:var(--muted);font-size:13.5px;line-height:1.6">${UK.esc(t.description)}</div>
        <div style="font-size:12.5px;font-weight:700;color:var(--primary);margin-top:6px">${fmtLabel}</div>
        <div class="pay">${UK.money(t.pay)}</div>
        <button class="btn btn-primary btn-sm" data-key="${t.key}" ${t.done ? 'disabled' : ''}>${t.done ? '✅ Submitted' : 'View task & upload →'}</button>
      </div>`;
    }).join('');
    g.querySelectorAll('button[data-key]').forEach(b => b.addEventListener('click', () => openTask(r.tasks.find(x => x.key === b.dataset.key))));
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('typing test')) {
      document.getElementById('taskGrid').innerHTML = '';
      MAIN().innerHTML += `<div class="card" style="margin-top:4px"><h3>⚠️ Pass the typing test first</h3><p style="color:var(--muted);margin:10px 0">The daily task drop unlocks after you pass the professional typing test (30+ WPM at 90% accuracy). You also get a free KES 150 starter gig credited to your wallet.</p><button class="btn btn-primary btn-sm" onclick="go('test')">Take the test now →</button></div>`;
    } else if (msg.includes('unlock a package')) {
      document.getElementById('taskGrid').innerHTML = '';
      MAIN().innerHTML += `<div class="card" style="margin-top:4px"><h3>🔒 Unlock a package to receive daily tasks</h3><p style="color:var(--muted);margin:10px 0">Your daily task drop is powered by your active package. Unlock any package (from Basic KES 500 up to Advanced Pro KES 5,000) via M-Pesa STK push to start earning.</p><button class="btn btn-primary btn-sm" onclick="go('packages')">Choose a package →</button></div>`;
    } else UK.toast(err.message, true);
  }
}

/* Task flow: read the brief → do the work OFF the site → convert to the
   required format (poster → PDF, data entry → Excel, essay → Word) → upload.
   The file is scanned on arrival, then verified, and earnings are released. */
function openTask(t) {
  const fmtName = t.deliverable === 'excel' ? 'an Excel spreadsheet (.xls / .xlsx)' : t.deliverable === 'word' ? 'a Word document (.doc / .docx)' : 'a PDF file';
  document.getElementById('tmTitle').textContent = t.title;
  document.getElementById('tmDesc').textContent = t.description;
  document.getElementById('tmPay').textContent = UK.money(t.pay);
  document.getElementById('tmCat').textContent = t.category;
  document.getElementById('tmFmt').textContent = 'Deliver: ' + fmtName;
  document.getElementById('tmGuide').innerHTML = `
    <div class="card" style="border:1.5px dashed var(--border);padding:12px 14px;background:var(--surface2)">
      <b style="font-size:13.5px">How this task works</b>
      <ol style="margin:8px 0 0 18px;color:var(--muted);font-size:13px;line-height:1.9">
        <li>Go and perform the task on your own computer (Word, Excel, Canva — your tools).</li>
        <li>When finished, convert/export it exactly as <b>${fmtName}</b>.</li>
        <li>Come back and upload the file below — only PDF, Word and Excel are accepted.</li>
        <li>Your file is <b>scanned</b> instantly, then <b>verified</b> by our team.</li>
        <li>On approval, <b>${UK.money(t.pay)}</b> is paid to your wallet.</li>
      </ol>
    </div>`;
  document.getElementById('tmSubmission').value = '';
  document.getElementById('tmMsg').innerHTML = '';
  const fileIn = document.getElementById('tmFile');
  const note = document.getElementById('tmFileNote');
  fileIn.value = '';
  note.textContent = 'Only PDF, Word or Excel';
  document.getElementById('taskModal').classList.add('open');
  document.getElementById('tmPick').onclick = () => fileIn.click();
  fileIn.onchange = () => {
    const f = fileIn.files && fileIn.files[0];
    if (!f) { note.textContent = 'Only PDF, Word or Excel'; return; }
    if (!/\.(pdf|docx?|xlsx?)$/i.test(f.name)) { UK.toast('Only PDF, Word (.doc/.docx) or Excel (.xls/.xlsx) files are accepted.', true); fileIn.value = ''; note.textContent = 'Only PDF, Word or Excel'; return; }
    if (f.size > 6 * 1024 * 1024) { UK.toast('File too large — maximum 6 MB.', true); fileIn.value = ''; note.textContent = 'Only PDF, Word or Excel'; return; }
    note.textContent = f.name + ' (' + Math.max(1, Math.round(f.size / 1024)) + ' KB) — ready';
  };
  const btn = document.getElementById('tmSubmit');
  btn.onclick = async () => {
    const f = fileIn.files && fileIn.files[0];
    if (!f) { UK.toast('Attach your completed file first.', true); return; }
    const submission = document.getElementById('tmSubmission').value.trim();
    btn.disabled = true; btn.textContent = 'Uploading…';
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const rd = new FileReader();
        rd.onload = () => resolve(rd.result);
        rd.onerror = () => reject(new Error('Could not read that file.'));
        rd.readAsDataURL(f);
      });
      btn.textContent = 'Scanning…';
      const r = await UK.api('/api/tasks/submit-file', { method: 'POST', body: JSON.stringify({ taskKey: t.key, submission, fileName: f.name, fileData: dataUrl }) });
      document.getElementById('tmMsg').innerHTML = `<div class="form-msg ok" style="display:block">🔍 <b>Scanned &amp; received.</b> Your file is now in <b>verification</b> — you will be notified the moment it is approved and <b>${UK.money(t.pay)}</b> is released to your wallet.</div>`;
      UK.toast('✅ ' + (r.message || 'Submitted for verification.'));
      setTimeout(async () => {
        document.getElementById('taskModal').classList.remove('open');
        await refreshMe();
        viewTasks();
      }, 1600);
    } catch (err) {
      document.getElementById('tmMsg').innerHTML = `<div class="form-msg err" style="display:block">${UK.esc(err.message)}</div>`;
    }
    btn.disabled = false; btn.textContent = 'Submit for verification →';
  };
}

/* -- typing test (PROFESSIONAL) -- */
function viewTest() {
  // Professional-grade sample passages: longer, mixed punctuation, numerals — realistic freelance content.
  const SAMPLES = [
    'A professional freelancer treats every task as a small commitment to a real client. Deadlines are met, communication is clear, and every deliverable is proofread twice before submission. On Upwork Kenya, that discipline is the difference between a one-off gig at KES 60 and a long-term working relationship worth thousands each month.',
    'Data cleanup is deceptively simple: remove the duplicates, standardise the date format to DD/MM/YYYY, normalise phone numbers to the +254 prefix, and confirm every currency column reads in Kenyan Shillings. A single misplaced comma in a 2,000-row spreadsheet can distort the reported total by tens of thousands, so accuracy matters more than speed.',
    'Great copywriting begins with the reader, not the product. Before writing a single headline, ask three questions: who is this for, what problem are they trying to solve, and what would make them click "Buy" today? Answer those questions honestly and your conversion rate on a landing page can easily double — often within the first 72 hours of publishing.',
    'When designing a poster for a small business in Nairobi, remember that most viewers will see it on a mobile screen at arm\'s length. Use a bold headline (48pt or larger), one clear call-to-action, and no more than three colours from the client\'s brand palette. Export both a print-ready PDF and a 1080x1350 PNG for social media before you deliver.'
  ];
  const sample = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  const TEST_SECONDS = 60;

  MAIN().innerHTML = `
    <h1 style="font-size:28px">Professional Typing Test ⌨️</h1>
    <p style="color:var(--muted);margin:6px 0 22px">A 60-second real-world typing assessment. Score <b>30+ WPM</b> at <b>90%+ accuracy</b> to pass — you'll earn a <b>free KES 150 starter gig</b> credited to your wallet immediately.</p>
    <div class="card" style="max-width:820px">
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <span class="pill pill-blue">🎯 Target: 30 WPM · 90% accuracy</span>
        <span class="pill pill-amber">⏱️ 60 seconds</span>
        <span class="pill pill-green">💰 Passing reward: KES 150 starter gig</span>
      </div>
      <div id="testText" class="test-display"></div>
      <textarea id="testInput" rows="4" style="margin-top:14px" placeholder="Click here and start typing — the timer begins on your first keystroke…" spellcheck="false" autocomplete="off"></textarea>
      <div class="test-stats">
        <div><b id="wpm">0</b><br><span style="color:var(--muted);font-size:12px">WPM</span></div>
        <div><b id="acc">100%</b><br><span style="color:var(--muted);font-size:12px">Accuracy</span></div>
        <div><b id="tsec">${TEST_SECONDS}</b><br><span style="color:var(--muted);font-size:12px">Seconds left</span></div>
        <div><b id="chars">0</b><br><span style="color:var(--muted);font-size:12px">Characters</span></div>
        <div><b>${ME.bestWpm || 0}</b><br><span style="color:var(--muted);font-size:12px">Your best WPM</span></div>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary btn-sm" id="startTest">▶ Start / Restart</button>
        <button class="btn btn-ghost btn-sm" id="submitTest" disabled>Submit result</button>
      </div>
      <div id="testMsg" style="margin-top:14px"></div>
    </div>
    ${ME.testPassed ? '<div class="form-msg ok" style="display:block;max-width:820px;margin-top:16px">✅ You have already passed the typing test. Head to <b>Packages</b> to unlock your first earning package.</div>' : ''}`;

  const disp = document.getElementById('testText');
  const inp = document.getElementById('testInput');
  // Normal spaces (NOT &nbsp;) — non-breaking spaces fuse the whole passage into
  // one unbreakable line, which is what clipped/hid words off-screen on mobile.
  disp.innerHTML = sample.split('').map((c, i) => `<span data-i="${i}">${UK.esc(c)}</span>`).join('');
  let started = null, timer = null, finished = false;

  function tick() {
    if (!started || finished) return;
    const elapsed = (Date.now() - started) / 1000;
    const left = Math.max(0, TEST_SECONDS - elapsed);
    document.getElementById('tsec').textContent = Math.ceil(left);
    if (left <= 0) endTest();
  }
  function endTest() {
    finished = true; clearInterval(timer);
    inp.disabled = true;
    document.getElementById('submitTest').disabled = false;
  }
  document.getElementById('startTest').onclick = () => {
    started = null; finished = false; inp.value = ''; inp.disabled = false; inp.focus();
    document.getElementById('testMsg').innerHTML = ''; document.getElementById('submitTest').disabled = true;
    document.getElementById('wpm').textContent = 0;
    document.getElementById('acc').textContent = '100%';
    document.getElementById('tsec').textContent = TEST_SECONDS;
    document.getElementById('chars').textContent = 0;
    disp.querySelectorAll('span').forEach(s => { s.className = ''; });
  };
  inp.addEventListener('input', () => {
    if (finished) return;
    if (!started) { started = Date.now(); timer = setInterval(tick, 100); }
    const typed = inp.value;
    let correct = 0;
    disp.querySelectorAll('span').forEach((s, i) => {
      s.className = '';
      if (i < typed.length) { if (typed[i] === sample[i]) { s.classList.add('ok-c'); correct++; } else s.classList.add('bad-c'); }
      else if (i === typed.length) s.classList.add('cur');
    });
    const elapsed = (Date.now() - started) / 1000;
    const wpm = Math.round((correct / 5) / (elapsed / 60 || 1));
    const acc = typed.length ? Math.round((correct / typed.length) * 100) : 100;
    document.getElementById('wpm').textContent = wpm;
    document.getElementById('acc').textContent = acc + '%';
    document.getElementById('chars').textContent = typed.length;
    if (typed.length >= sample.length) endTest();
  });
  document.getElementById('submitTest').onclick = async () => {
    const wpm = Number(document.getElementById('wpm').textContent);
    const acc = Number((document.getElementById('acc').textContent || '0').replace('%', ''));
    try {
      const r = await UK.api('/api/typing-test', { method: 'POST', body: JSON.stringify({ wpm, accuracy: acc }) });
      const box = document.getElementById('testMsg');
      if (r.passed) {
        const gigLine = r.starterGig ? `<br><br>🎁 <b>Free starter gig awarded:</b> KES ${r.starterGig.amount} has been credited to your earnings wallet.` : '';
        box.innerHTML = `<div class="form-msg ok" style="display:block">🎉 <b>Excellent — you passed the professional typing test!</b> (${wpm} WPM at ${acc}% accuracy).${gigLine}<br><br>Next step: <b>unlock a package</b> via M-Pesa STK push to receive your daily tasks and start earning at the package rate.</div>
          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="go('packages')">Unlock a package →</button>
            <button class="btn btn-ghost btn-sm" onclick="go('wallet')">Check my wallet</button>
          </div>`;
      } else {
        box.innerHTML = `<div class="form-msg err" style="display:block">Not quite — you scored ${wpm} WPM at ${acc}%. You need <b>30+ WPM</b> and <b>90%+ accuracy</b> to pass this professional assessment. Take a short break, click <b>Start / Restart</b>, and try again — you'll get it.</div>`;
      }
      await refreshMe();
    } catch (err) { UK.toast(err.message, true); }
  };
}

/* -- wallet -- */
async function viewWallet() {
  MAIN().innerHTML = `<h1 style="font-size:28px">Wallet 💰</h1><p style="color:var(--muted);margin:6px 0 22px">Two wallets: your <b>earnings wallet</b> for daily cash, and your <b>investor wallet</b> for locked plans that grow until maturity.</p><div id="walletBody"><div class="skel" style="min-height:320px"></div></div>`;
  try {
    const [e, inv, wd] = await Promise.all([UK.api('/api/earnings'), UK.api('/api/invest').catch(() => null), UK.api('/api/wallet/withdrawals').catch(() => ({ withdrawals: [] }))]);
    document.getElementById('walletBody').innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;font-weight:600"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--primary);display:inline-block"></span> Earnings wallet · live balance</div>
        <div style="font-size:44px;font-weight:900;letter-spacing:-1.5px;margin:6px 0" id="walletBig">${UK.money(e.wallet)}</div>
        <div style="color:var(--muted);font-size:13px">Lifetime earned: <b>${UK.money(e.totalEarned)}</b></div>

        <div style="border-top:1px solid var(--border);margin:18px 0"></div>
        <h3 style="margin-bottom:6px">⚡ Instant deposit — M-Pesa STK push</h3>
        <p style="color:var(--muted);font-size:12.5px;margin-bottom:8px">Enter the amount and your M-Pesa number — a PIN prompt lands on your phone. Enter your PIN and the money reflects in your earnings wallet automatically.</p>
        <button class="btn btn-primary" id="depBtn">Deposit via M-Pesa STK push →</button>

        <div style="border-top:1px solid var(--border);margin:18px 0"></div>
        <h3 style="margin-bottom:6px">Withdraw to M-Pesa</h3>
        <p style="color:var(--muted);font-size:12.5px;margin-bottom:8px">Withdrawals open <b>every ${wd.holdDays || 7} days</b>. Your request goes to the admin for approval. Once <b>approved</b>, the money is sent to your M-Pesa number and marked <b>cleared</b>. Large requests may be paid in parts — you always see exactly what is <b>verified</b> and what is <b>pending</b>. Track every request below.</p>
        <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr;margin-top:8px">
          <input id="wAmt" type="number" min="100" placeholder="Amount (min 100)">
          <input id="wPhone" placeholder="0712345678">
        </div>
        <button class="btn btn-primary" style="margin-top:10px" id="wBtn">Request withdrawal →</button>
        ${wd.nextWithdrawalAt ? `<div class="form-msg err" style="display:block;margin-top:12px">⏳ Withdrawals run every ${wd.holdDays || 7} days. Next withdrawal window: <b>${new Date(wd.nextWithdrawalAt).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b>.</div>` : ''}
        ${wd.withdrawSuspendedUntil ? `<div class="form-msg err" style="display:block;margin-top:12px">⏸️ Your withdrawals are on hold until <b>${new Date(wd.withdrawSuspendedUntil).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</b>${wd.withdrawSuspendedReason ? ' — ' + UK.esc(wd.withdrawSuspendedReason) : ''}. Your earnings stay safe in your wallet.</div>` : ''}
        ${wd.withdrawals.length ? `<div style="margin-top:14px"><h3 style="margin-bottom:4px">My withdrawal requests</h3>` +
          wd.withdrawals.map(w => {
            const st2 = w.status === 'paid' ? 'cleared' : w.status;
            const paidAmt = w.paidAmount || 0;
            const pendAmt = Math.max(0, w.amount - paidAmt);
            const cls = st2 === 'cleared' ? 'pill-green' : st2 === 'approved' ? 'pill-blue' : st2 === 'rejected' ? 'pill-red' : 'pill-amber';
            const note = st2 === 'cleared'
              ? (paidAmt && paidAmt < w.amount ? 'Money sent in parts — fully paid' : 'Money sent — check M-Pesa')
              : st2 === 'rejected' ? 'Rejected — refunded to wallet'
              : paidAmt > 0 ? `✅ ${UK.money(paidAmt)} verified · ⏳ ${UK.money(pendAmt)} pending — the balance will be verified shortly`
              : st2 === 'approved' ? 'Approved — payout on the way' : 'Waiting for admin approval';
            return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13.5px">
              <div><b>${UK.money(w.amount)}</b> → ${UK.esc(w.phone)}<div style="color:var(--muted);font-size:12px">${UK.timeAgo(w.at)} · ${note}</div></div>
              <span class="pill ${cls}" style="text-transform:capitalize">${st2}</span>
            </div>`;
          }).join('') + '</div>' : ''}
      </div>

      <div>
      <div class="card" style="margin-bottom:18px">
        <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;font-weight:600"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block"></span> Investor wallet</div>
        <div style="font-size:34px;font-weight:900;letter-spacing:-1px;margin:6px 0">${UK.money(inv ? inv.investBalance : 0)}</div>
        <div style="color:var(--muted);font-size:13px">Projected payout at maturity: <b>${UK.money(inv ? inv.projected : 0)}</b></div>
        <button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="go('invest')">Open Investor Funds →</button>
      </div>
      <div class="card">
        <h3 style="margin-bottom:12px">Transactions</h3>
        <div style="max-height:300px;overflow-y:auto">
          ${e.transactions.length ? '<table><thead><tr><th>Type</th><th>Amount</th><th>Note</th><th>When</th></tr></thead><tbody>' +
            e.transactions.map(t => `<tr><td><span class="pill ${t.amount >= 0 ? 'pill-green' : 'pill-amber'}">${t.type}</span></td><td><b>${UK.money(t.amount)}</b></td><td style="font-size:12.5px">${UK.esc(t.note || '')}</td><td>${UK.timeAgo(t.at)}</td></tr>`).join('') + '</tbody></table>'
            : '<p style="color:var(--muted)">No transactions yet.</p>'}
        </div>
      </div>
      </div>
    </div>`;
    document.getElementById('depBtn').onclick = () => openPayModal({ purpose: 'deposit', onSuccess: viewWallet });
    document.getElementById('wBtn').onclick = async () => {
      const amount = Number(document.getElementById('wAmt').value);
      const phone = document.getElementById('wPhone').value;
      try {
        await UK.api('/api/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount, phone }) });
        UK.toast('✅ Withdrawal request sent for approval. Track its status below.');
        await refreshMe();
        viewWallet();
      } catch (err) { UK.toast(err.message, true); }
    };
  } catch (err) { UK.toast(err.message, true); }
}

/* -- investor funds -- */
async function viewInvest() {
  MAIN().innerHTML = `<h1 style="font-size:28px">Investor Funds 📈</h1><p style="color:var(--muted);margin:6px 0 22px">Put part of your earnings into a locked plan and withdraw it back — plus a fixed return — when the plan matures.</p><div id="invBody"><div class="skel" style="min-height:360px"></div></div>`;
  try {
    const r = await UK.api('/api/invest');
    const active = r.investments.filter(i => i.status === 'active');
    document.getElementById('invBody').innerHTML = `
    <div class="hire-banner" style="padding:24px 26px;margin-bottom:20px">
      <h2 style="font-size:22px">How Investor Funds work</h2>
      <div class="steps" style="grid-template-columns:repeat(3,1fr)">
        <div class="step"><span class="n">1</span><b>Choose a plan</b><span>7-day, 30-day or 365-day lock-in</span></div>
        <div class="step"><span class="n">2</span><b>Deposit from wallet</b><span>Money moves from your earnings wallet to your investor wallet</span></div>
        <div class="step"><span class="n">3</span><b>Withdraw at maturity</b><span>Principal + fixed return lands back in your earnings wallet</span></div>
      </div>
      <p style="margin-top:16px;font-size:12.5px;color:#bfe6cd">Returns are fixed per plan and paid once at maturity — never per day. Funds are locked until the plan expires, and investing is always optional.</p>
    </div>

    <div class="grid grid-4" style="margin-bottom:20px">
      <div class="card stat"><span class="ico">💰</span><div class="num">${UK.money(r.wallet)}</div><div class="lbl">Earnings wallet</div></div>
      <div class="card stat"><span class="ico">📈</span><div class="num">${UK.money(r.investBalance)}</div><div class="lbl">Investor wallet (locked)</div></div>
      <div class="card stat"><span class="ico">🎯</span><div class="num">${UK.money(r.projected)}</div><div class="lbl">Projected at maturity</div></div>
      <div class="card stat"><span class="ico">🗂️</span><div class="num">${active.length}</div><div class="lbl">Active plans</div></div>
    </div>

    <div class="grid grid-3">
      ${r.plans.map(p => `
        <div class="card plan-card">
          <span class="pill pill-blue">${p.days} days</span>
          <div style="font-weight:900;font-size:18px">${p.name}</div>
          <div class="plan-rate">+${Math.round(p.rate * 100)}%<span style="font-size:12.5px;color:var(--muted);font-weight:600"> total return</span></div>
          <div style="color:var(--muted);font-size:13px">${p.desc}. Example: invest KES 1,000 → withdraw <b style="color:var(--text)">${UK.money(1000 + Math.round(1000 * p.rate))}</b> after ${p.days} days.</div>
          <input type="number" min="100" placeholder="Amount (min KES 100)" id="amt-${p.id}">
          <button class="btn btn-primary btn-sm" data-plan="${p.id}">Invest from wallet →</button>
        </div>`).join('')}
    </div>

    <div class="card" style="margin-top:20px">
      <h3 style="margin-bottom:12px">My investments</h3>
      ${r.investments.length ? '<div style="overflow-x:auto"><table><thead><tr><th>Plan</th><th>Invested</th><th>Return</th><th>Payout</th><th>Matures</th><th>Status</th><th></th></tr></thead><tbody>' +
        r.investments.map(i => {
          const daysLeft = Math.max(0, Math.ceil((i.maturesAt - Date.now()) / 86400000));
          return `<tr>
            <td><b>${UK.esc(i.planName)}</b></td>
            <td>${UK.money(i.amount)}</td>
            <td style="color:var(--primary)">+${UK.money(i.interest)}</td>
            <td><b>${UK.money(i.amount + i.interest)}</b></td>
            <td>${new Date(i.maturesAt).toLocaleDateString('en-KE')}${i.status === 'active' ? `<br><span class="countdown" style="font-size:12px;color:var(--muted)">${i.matured ? 'Ready to withdraw' : daysLeft + ' day(s) left'}</span>` : ''}</td>
            <td><span class="pill ${i.status === 'withdrawn' ? 'pill-blue' : i.matured ? 'pill-green' : 'pill-amber'}">${i.status === 'withdrawn' ? 'Paid out' : i.matured ? 'Matured' : 'Locked'}</span></td>
            <td>${i.status === 'active' && i.matured ? `<button class="btn btn-primary btn-sm" data-wd="${i.id}">Withdraw to wallet</button>` : ''}</td>
          </tr>`;
        }).join('') + '</tbody></table></div>'
        : '<p style="color:var(--muted)">No investments yet — choose a plan above to start growing your earnings.</p>'}
    </div>`;
    document.querySelectorAll('button[data-plan]').forEach(b => b.onclick = async () => {
      const planId = b.dataset.plan;
      const amount = Number(document.getElementById('amt-' + planId).value);
      b.disabled = true;
      try {
        await UK.api('/api/invest/deposit', { method: 'POST', body: JSON.stringify({ planId, amount }) });
        UK.toast('✅ Invested! Track it below and withdraw at maturity.');
        await refreshMe();
        viewInvest();
      } catch (err) { UK.toast(err.message, true); b.disabled = false; }
    });
    document.querySelectorAll('button[data-wd]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try {
        const res = await UK.api('/api/invest/withdraw/' + b.dataset.wd, { method: 'POST' });
        UK.toast(`✅ Paid out! Your earnings wallet is now ${UK.money(res.wallet)}.`);
        await refreshMe();
        viewInvest();
      } catch (err) { UK.toast(err.message, true); b.disabled = false; }
    });
  } catch (err) { UK.toast(err.message, true); }
}

/* -- marketplace -- */
async function viewMarket() {
  MAIN().innerHTML = `
    <div class="view-head">
      <h1 style="font-size:28px">Marketplace 🛒</h1>
      <button class="btn btn-primary btn-sm" id="newGigBtn">+ Post a gig</button>
    </div>
    <p style="color:var(--muted);margin:6px 0 22px">Publish a service you offer, or hire another freelancer for a project.</p>
    <input id="gigSearch" placeholder="🔍 Search gigs (e.g. logo, spreadsheet, article)" style="margin-bottom:16px">
    <div id="gigGrid" class="grid grid-3"><div class="skel" style="min-height:200px"></div></div>`;
  const load = async q => {
    const r = await UK.api('/api/gigs' + (q ? '?q=' + encodeURIComponent(q) : ''));
    const g = document.getElementById('gigGrid');
    g.innerHTML = r.gigs.length ? r.gigs.map(x => `
      <div class="card task-card">
        <span class="pill pill-blue">${UK.esc(x.category)}</span>
        <div style="font-weight:800;font-size:16px">${UK.esc(x.title)}</div>
        <div style="color:var(--muted);font-size:13.5px">${UK.esc(x.description || '')}</div>
        <div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px">By ${UK.esc(x.userName)} ${x.verified ? '<span class="verified-badge">✓</span>' : ''}</div>
        <div class="pay">${UK.money(x.price)}</div>
        <button class="btn btn-primary btn-sm" data-order="${x.id}">Order this gig →</button>
      </div>`).join('') : '<p style="color:var(--muted)">No gigs yet — be the first to post one!</p>';
    g.querySelectorAll('button[data-order]').forEach(b => b.onclick = () => orderGig(b.dataset.order));
  };
  await load();
  document.getElementById('gigSearch').addEventListener('input', e => load(e.target.value));
  document.getElementById('newGigBtn').onclick = () => {
    MAIN().insertAdjacentHTML('afterbegin', `
      <div class="modal-back open" id="ngm">
        <div class="modal">
          <h3>Post a new gig</h3>
          <label>Title</label><input id="ngT" placeholder="I will design a modern A4 poster">
          <label>Category</label>
          <select id="ngC">
            <option>Assignments</option><option>Article Writing</option><option>Poster Design</option><option>Data Entry</option>
            <option>Copywriting</option><option>Academic Writing</option><option>Mail Merging</option>
            <option>Excel Cleanup</option><option>Data Analysis</option>
          </select>
          <label>Price (KES)</label><input id="ngP" type="number" min="50" value="500">
          <label>Description</label><textarea id="ngD" rows="4" placeholder="What clients receive, turnaround, revisions…"></textarea>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn btn-primary" id="ngSave">Publish gig</button>
            <button class="btn btn-ghost" onclick="document.getElementById('ngm').remove()">Cancel</button>
          </div>
        </div>
      </div>`);
    document.getElementById('ngSave').onclick = async () => {
      try {
        await UK.api('/api/gigs', { method: 'POST', body: JSON.stringify({
          title: document.getElementById('ngT').value,
          category: document.getElementById('ngC').value,
          price: document.getElementById('ngP').value,
          description: document.getElementById('ngD').value
        }) });
        UK.toast('Gig published!'); document.getElementById('ngm').remove(); load();
      } catch (err) { UK.toast(err.message, true); }
    };
  };
}
async function orderGig(gigId) {
  const brief = prompt('Anything the seller should know? (optional)') || '';
  try {
    await UK.api('/api/orders', { method: 'POST', body: JSON.stringify({ gigId, brief }) });
    UK.toast('Order placed! Track it under Orders.');
  } catch (err) { UK.toast(err.message, true); }
}

/* -- orders -- */
async function viewOrders() {
  MAIN().innerHTML = `<h1 style="font-size:28px">Orders 📦</h1><p style="color:var(--muted);margin:6px 0 22px">Track work you're buying or delivering.</p><div id="oBody"><div class="skel" style="min-height:240px"></div></div>`;
  const r = await UK.api('/api/orders');
  const renderRows = arr => arr.length ? '<table><thead><tr><th>Gig</th><th>Price</th><th>Status</th><th>When</th><th></th></tr></thead><tbody>' +
    arr.map(o => `<tr><td>${UK.esc(o.gigTitle)}</td><td><b>${UK.money(o.price)}</b></td><td><span class="pill ${o.status === 'completed' ? 'pill-green' : 'pill-amber'}">${o.status}</span></td><td>${UK.timeAgo(o.at)}</td><td>${o.status === 'in_progress' ? `<button class="btn btn-primary btn-sm" data-cmp="${o.id}">Mark complete</button>` : ''}</td></tr>`).join('') + '</tbody></table>' : '<p style="color:var(--muted)">Nothing here yet.</p>';
  document.getElementById('oBody').innerHTML = `
    <div class="grid grid-2">
      <div class="card"><h3 style="margin-bottom:10px">Buying</h3>${renderRows(r.buying)}</div>
      <div class="card"><h3 style="margin-bottom:10px">Selling</h3>${renderRows(r.selling)}</div>
    </div>`;
  document.querySelectorAll('button[data-cmp]').forEach(b => b.onclick = async () => {
    try { await UK.api('/api/orders/' + b.dataset.cmp + '/complete', { method: 'POST' }); UK.toast('Order completed.'); await refreshMe(); viewOrders(); }
    catch (err) { UK.toast(err.message, true); }
  });
}

/* -- profile -- */
function viewProfile() {
  const pkgName = ME.tier ? ME.tier.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()) : 'None (locked)';
  MAIN().innerHTML = `
    <h1 style="font-size:28px">My profile 👤</h1>
    <p style="color:var(--muted);margin:6px 0 22px">Describe yourself, upload a professional photo, list your skills and experience — this is what clients and the platform see.</p>
    ${(ME.announcements || []).length ? '<div style="max-width:680px;margin-bottom:16px">' + ME.announcements.map(a => `
      <div class="card" style="border-left:4px solid var(--amber,#f59e0b);padding:14px 16px;margin-bottom:10px">
        <div style="font-weight:800">📢 ${UK.esc(a.title)}</div>
        <div style="color:var(--muted);font-size:13.5px;margin-top:4px;line-height:1.6">${UK.esc(a.message)}</div>
        <div style="color:var(--muted);font-size:11.5px;margin-top:6px">${UK.timeAgo(a.at)}</div>
      </div>`).join('') + '</div>' : ''}
    <div class="card" style="max-width:680px">
      <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;flex-wrap:wrap">
        <div class="avatar-btn" id="pAvatarPreview" style="width:78px;height:78px;font-size:26px">${ME.avatar ? `<img src="${ME.avatar}">` : UK.initials(ME.name)}</div>
        <div>
          <div style="font-size:20px;font-weight:800">${UK.esc(ME.name)} ${ME.verified ? '<span class="verified-badge">✓ Verified</span>' : ''}</div>
          <div style="color:var(--muted);font-size:14px">${UK.esc(ME.email)}</div>
          <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
            <span class="pill pill-green">${UK.esc(pkgName)} package</span>
            ${ME.testPassed ? '<span class="pill pill-blue">⌨️ Test passed</span>' : '<span class="pill pill-amber">⌨️ Test pending</span>'}
          </div>
        </div>
      </div>
      <label>Display name</label><input id="pName" value="${UK.esc(ME.name || '')}">
      <label>Professional profile photo — upload from your device</label>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:4px">
        <input type="file" id="pAvatarFile" accept="image/png,image/jpeg,image/webp" style="display:none">
        <button class="btn btn-ghost btn-sm" id="pAvatarPick" type="button">📷 Choose photo from device…</button>
        <span id="pAvatarNote" style="color:var(--muted);font-size:13px">${ME.avatar ? 'Photo set — pick another to replace it' : 'PNG, JPG or WebP, up to 5 MB'}</span>
      </div>
      <label>Bio — describe yourself (what you do best)</label><textarea id="pBio" rows="3" placeholder="e.g. Detail-oriented data entry specialist and article writer with 3 years of experience…">${UK.esc(ME.bio || '')}</textarea>
      <label>Skills (comma separated)</label><input id="pSkills" value="${UK.esc((ME.skills || []).join(', '))}" placeholder="Copywriting, Excel, Canva, Data Analysis">
      <label>Work experience</label><textarea id="pExp" rows="3" placeholder="Roles, clients, years of experience…">${UK.esc(ME.experience || '')}</textarea>
      ${(ME.skills || []).length ? `<div style="margin-top:12px">${ME.skills.map(s => `<span class="chip">${UK.esc(s)}</span>`).join('')}</div>` : ''}
      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" id="pSave">Save profile</button>
        ${ME.verified ? '' : '<button class="btn btn-ghost" onclick="go(\'verify\')">Get the ✓ blue badge →</button>'}
      </div>
    </div>`;
  /* Profile photo: picked from the DEVICE (never a pasted link). The image is
     downscaled to max 320px and stored as a base64 data URL on the account. */
  let pendingAvatar = ME.avatar || '';
  const pAvatarFile = document.getElementById('pAvatarFile');
  document.getElementById('pAvatarPick').onclick = () => pAvatarFile.click();
  pAvatarFile.onchange = () => {
    const f = pAvatarFile.files && pAvatarFile.files[0];
    if (!f) return;
    if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { UK.toast('Choose a PNG, JPG or WebP image.', true); return; }
    if (f.size > 5 * 1024 * 1024) { UK.toast('Image too large — maximum 5 MB.', true); return; }
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 320;
        const sc = Math.min(1, MAX / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.width * sc));
        cv.height = Math.max(1, Math.round(img.height * sc));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        pendingAvatar = cv.toDataURL('image/jpeg', 0.85);
        document.getElementById('pAvatarPreview').innerHTML = `<img src="${pendingAvatar}">`;
        document.getElementById('pAvatarNote').textContent = f.name + ' — ready, now press Save profile';
        UK.toast('Photo loaded — press Save profile to keep it.');
      };
      img.onerror = () => UK.toast('Could not read that image file.', true);
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  };
  document.getElementById('pSave').onclick = async () => {
    try {
      const r = await UK.api('/api/profile', { method: 'PUT', body: JSON.stringify({
        name: document.getElementById('pName').value,
        avatar: pendingAvatar,
        bio: document.getElementById('pBio').value,
        skills: document.getElementById('pSkills').value.split(',').map(s => s.trim()).filter(Boolean),
        experience: document.getElementById('pExp').value
      }) });
      ME = r.user; UK.user = ME; paintAvatar(); UK.toast('Profile saved.'); viewProfile();
    } catch (err) { UK.toast(err.message, true); }
  };
}

/* -- verify (M-Pesa STK PIN prompt at KES 450) -- */
function viewVerify() {
  MAIN().innerHTML = `
    <h1 style="font-size:28px">Get Verified ✔</h1>
    <p style="color:var(--muted);margin:6px 0 22px">A one-off KES 450 payment via M-Pesa STK push confirms your identity and puts the blue badge on your profile.</p>
    <div class="card" style="max-width:600px">
      <h3>Benefits</h3>
      <ul style="margin:10px 0 16px 20px;color:var(--muted);line-height:2">
        <li>Blue ✓ badge on your profile and every gig</li>
        <li>+1 extra task in your daily drop</li>
        <li>+15% pay boost on all completed tasks</li>
        <li>Priority placement in marketplace search</li>
      </ul>
      ${ME.verified ? '<div class="form-msg ok" style="display:block">You are already verified. Asante!</div>' : `
        <p style="font-size:14px;color:var(--muted);margin-bottom:12px">Enter your Safaricom number below and confirm the M-Pesa PIN prompt on your phone. Verification is activated the moment the payment succeeds.</p>
        <button class="btn btn-primary" id="vBtn">Pay KES 450 via M-Pesa STK push →</button>
      `}
    </div>`;
  const vBtn = document.getElementById('vBtn');
  if (vBtn) vBtn.onclick = () => openPayModal({
    purpose: 'verify',
    name: 'Verified badge',
    price: 450,
    onSuccess: viewVerify
  });
}

/* -- settings -- */
function viewSettings() {
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const font = localStorage.getItem('uk_font') || '15.5px';
  const compact = localStorage.getItem('uk_compact') === '1';
  const animOff = localStorage.getItem('uk_anim') === '0';
  const lang = localStorage.getItem('uk_lang') || 'en';
  const nTask = localStorage.getItem('uk_n_task') !== '0';
  const nOrder = localStorage.getItem('uk_n_order') !== '0';
  const nWeekly = localStorage.getItem('uk_n_weekly') === '1';
  const pubProfile = localStorage.getItem('uk_pub') !== '0';

  MAIN().innerHTML = `
    <h1 style="font-size:28px">Settings ⚙️</h1>
    <p style="color:var(--muted);margin:6px 0 22px">Appearance, display, notifications, language, privacy and account controls.</p>
    <div class="grid grid-2">
      <div class="card">
        <h3 style="margin-bottom:6px">Appearance</h3>
        <div class="set-row"><div><div class="t">Dark mode</div><div class="d">Easier on the eyes at night</div></div><button class="toggle ${theme === 'dark' ? 'on' : ''}" id="tgDark"></button></div>
        <div class="set-row"><div><div class="t">Theme</div><div class="d">Choose light or dark</div></div>
          <select id="setTheme" style="width:130px">
            <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select></div>
        <div style="padding-top:12px"><div class="t" style="margin-bottom:8px">Accent colour</div>
          <div style="display:flex;gap:10px">
            ${['#14a800', '#0ea5a0', '#f59e0b', '#8b5cf6', '#ef4444', '#1d9bf0'].map(c => `<button class="btn-sm" data-c="${c}" style="background:${c};width:36px;height:36px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.2)"></button>`).join('')}
          </div></div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:6px">Display</h3>
        <div class="set-row"><div><div class="t">Text size</div><div class="d">Scale the whole interface</div></div>
          <select id="setFont" style="width:130px">
            <option value="14px" ${font === '14px' ? 'selected' : ''}>Small</option>
            <option value="15.5px" ${font === '15.5px' ? 'selected' : ''}>Default</option>
            <option value="17px" ${font === '17px' ? 'selected' : ''}>Large</option>
          </select></div>
        <div class="set-row"><div><div class="t">Compact mode</div><div class="d">Denser cards, more on screen</div></div><button class="toggle ${compact ? 'on' : ''}" id="tgCompact"></button></div>
        <div class="set-row"><div><div class="t">Animations</div><div class="d">Turn off for a calmer UI</div></div><button class="toggle ${animOff ? '' : 'on'}" id="tgAnim"></button></div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:6px">Notifications</h3>
        <div class="set-row"><div><div class="t">Task approval alerts</div><div class="d">When a task is approved &amp; paid</div></div><button class="toggle ${nTask ? 'on' : ''}" id="tgNTask"></button></div>
        <div class="set-row"><div><div class="t">New order alerts</div><div class="d">When a client orders your gig</div></div><button class="toggle ${nOrder ? 'on' : ''}" id="tgNOrder"></button></div>
        <div class="set-row"><div><div class="t">Weekly earnings summary</div><div class="d">A digest every Monday</div></div><button class="toggle ${nWeekly ? 'on' : ''}" id="tgNWeekly"></button></div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:6px">Language &amp; region</h3>
        <div class="set-row"><div><div class="t">Language</div></div>
          <select id="setLang" style="width:170px">
            <option value="en" ${lang === 'en' ? 'selected' : ''}>English (Kenya)</option>
            <option value="sw" ${lang === 'sw' ? 'selected' : ''}>Kiswahili</option>
          </select></div>
        <div class="set-row"><div><div class="t">Currency</div></div><span style="font-weight:700">KES — Kenyan Shilling</span></div>
        <div class="set-row"><div><div class="t">Time zone</div></div><span style="font-weight:700">Africa/Nairobi (GMT+3)</span></div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:6px">Privacy</h3>
        <div class="set-row"><div><div class="t">Public profile</div><div class="d">Show your profile &amp; gigs in the marketplace</div></div><button class="toggle ${pubProfile ? 'on' : ''}" id="tgPub"></button></div>
        <div class="set-row"><div><div class="t">Verified badge</div><div class="d">${ME.verified ? 'Active on your account ✓' : 'Not verified yet'}</div></div>${ME.verified ? '<span class="verified-badge" style="font-size:20px">✓</span>' : '<button class="btn btn-ghost btn-sm" onclick="go(\'verify\')">Verify →</button>'}</div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:10px">Account</h3>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start">
          <button class="btn btn-ghost btn-sm" onclick="go('profile')">Edit profile →</button>
          <button class="btn btn-ghost btn-sm" onclick="location.href='forgot.html'">Change password →</button>
          <button class="btn btn-ghost btn-sm" id="dlData">⬇ Download my data (JSON)</button>
          <button class="btn btn-danger btn-sm" id="logoutS">Log out of this device</button>
        </div>
        <p style="color:var(--muted);font-size:12px;margin-top:12px">Member since ${new Date(ME.createdAt || Date.now()).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })} · ID ${UK.esc((ME.id || '').slice(-8).toUpperCase())}</p>
      </div>
    </div>`;

  const flip = (id, key, apply) => {
    const el = document.getElementById(id);
    el.onclick = () => {
      const on = !el.classList.contains('on');
      el.classList.toggle('on', on);
      localStorage.setItem(key, on ? '1' : '0');
      if (apply) apply(on);
    };
  };
  flip('tgDark', 'uk_theme_x', on => { localStorage.setItem('uk_theme', on ? 'dark' : 'light'); UK.applyTheme(); viewSettings(); });
  flip('tgCompact', 'uk_compact', on => document.body.classList.toggle('compact', on));
  flip('tgAnim', 'uk_anim', on => document.body.classList.toggle('no-anim', !on));
  flip('tgNTask', 'uk_n_task');
  flip('tgNOrder', 'uk_n_order');
  flip('tgNWeekly', 'uk_n_weekly');
  flip('tgPub', 'uk_pub');

  document.getElementById('setTheme').onchange = e => { localStorage.setItem('uk_theme', e.target.value); UK.applyTheme(); };
  document.getElementById('setFont').onchange = e => { localStorage.setItem('uk_font', e.target.value); document.documentElement.style.fontSize = e.target.value; };
  document.getElementById('setLang').onchange = e => { localStorage.setItem('uk_lang', e.target.value); UK.toast(e.target.value === 'sw' ? 'Lugha imewekwa: Kiswahili (coming soon)' : 'Language set: English'); };
  document.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    document.documentElement.style.setProperty('--primary', b.dataset.c);
    document.documentElement.style.setProperty('--grad', `linear-gradient(135deg, ${b.dataset.c} 0%, #0ea5a0 100%)`);
    localStorage.setItem('uk_accent', b.dataset.c);
    UK.toast('Accent colour updated.');
  });
  document.getElementById('dlData').onclick = async () => {
    try {
      const [me, earnings] = await Promise.all([UK.api('/api/me'), UK.api('/api/earnings')]);
      const blob = new Blob([JSON.stringify({ profile: me.user, earnings }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'upwork-kenya-my-data.json';
      a.click();
      UK.toast('Your data has been downloaded.');
    } catch (err) { UK.toast(err.message, true); }
  };
  document.getElementById('logoutS').onclick = () => document.getElementById('logoutBtn').click();
}

/* ---------- apply saved preferences on load ---------- */
(function applyPrefs() {
  const f = localStorage.getItem('uk_font');
  if (f) document.documentElement.style.fontSize = f;
  if (localStorage.getItem('uk_compact') === '1') document.body.classList.add('compact');
  if (localStorage.getItem('uk_anim') === '0') document.body.classList.add('no-anim');
  const savedAccent = localStorage.getItem('uk_accent');
  if (savedAccent) {
    document.documentElement.style.setProperty('--primary', savedAccent);
    document.documentElement.style.setProperty('--grad', `linear-gradient(135deg, ${savedAccent} 0%, #0ea5a0 100%)`);
  }
})();
