/* ============================================================
   MANUFACTURING STRATEGY SERIES — SHELF
   app.js — SPA Brain
   Handles login, session, shelf display, book handoff
   ============================================================ */

// ── CONSTANTS ──
const SHELF_URL = window.location.origin; // This service's own URL

// ── SESSION (localStorage) ──
function getSession() {
  return {
    email: localStorage.getItem('readerEmail') || '',
    token: localStorage.getItem('readerToken') || '',
    name:  localStorage.getItem('readerName')  || ''
  };
}

function saveSession(email, token, name) {
  localStorage.setItem('readerEmail', email);
  localStorage.setItem('readerToken', token);
  localStorage.setItem('readerName',  name);
}

function clearSession() {
  localStorage.removeItem('readerEmail');
  localStorage.removeItem('readerToken');
  localStorage.removeItem('readerName');
}

function hasSession() {
  const { email, token } = getSession();
  return !!(email && token);
}

// ── LOADER / ERROR ──
function showLoader() {
  const el = document.getElementById('app-loader');
  if (el) el.classList.remove('hide');
}

function hideLoader() {
  const el = document.getElementById('app-loader');
  if (el) setTimeout(() => el.classList.add('hide'), 200);
}

function showError() {
  hideLoader();
  const el = document.getElementById('app-error');
  if (el) el.classList.add('show');
}

// ── LOGIN SCREEN ──
function loadLogin() {
  const stage = document.getElementById('stage');
  stage.innerHTML = `
    <div class="screen active" id="sc-login">
      <div class="screen-body center">
        <div class="login-wrap">
          <div class="login-series">The Manufacturing Strategy Series</div>
          <div class="login-title">Sign in to read</div>
          <div class="login-sub">Use the credentials sent to your email after purchase.</div>
          <div class="login-error" id="login-error"></div>
          <div class="field">
            <label>Email</label>
            <input id="login-email" type="email" placeholder="your@email.com" autocomplete="email">
          </div>
          <div class="field">
            <label>Password</label>
            <input id="login-password" type="password" placeholder="Your password" autocomplete="current-password">
          </div>
          <button class="btn btn-primary login-btn" id="login-submit" onclick="submitLogin()">Sign in →</button>
        </div>
      </div>
      <div class="screen-footer">
        <span></span>
        <span class="footer-copy">© 2026 Sudharsan K R</span>
        <span></span>
      </div>
    </div>`;

  document.getElementById('logout-btn').style.display = 'none';
  hideLoader();
  setTimeout(() => document.getElementById('login-email')?.focus(), 100);
}

async function submitLogin() {
  const email    = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value?.trim();
  const btn      = document.getElementById('login-submit');

  if (!email || !password) {
    showLoginError('Please enter your email and password.');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Signing in…';
  document.getElementById('login-error')?.classList.remove('show');

  try {
    const res  = await fetch('/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      showLoginError(data.error || 'Invalid email or password.');
      btn.disabled    = false;
      btn.textContent = 'Sign in →';
      return;
    }

    saveSession(email, data.token, data.name);
    loadShelf();

  } catch (err) {
    showLoginError('Connection error. Please try again.');
    btn.disabled    = false;
    btn.textContent = 'Sign in →';
  }
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}

// ── SHELF SCREEN ──
function loadShelf() {
  const { name } = getSession();
  const firstName = name ? name.split(' ')[0] : 'Founder';

  // Read Book 1 progress from localStorage (set by book1's app.js)
  const lastCh      = parseInt(localStorage.getItem('lastChapter') || '0');
  const hasStarted  = lastCh >= 1;

  const stage = document.getElementById('stage');
  stage.innerHTML = `
    <div class="screen active" id="sc-shelf">
      <div class="screen-body">
        <div class="shelf-wrap">
          <div class="shelf-greeting">Welcome back, ${firstName}.</div>
          <div class="shelf-label">Your Library</div>
          <div class="shelf-grid">

            <div class="shelf-card shelf-card--active">
              <div class="shelf-card-num">01</div>
              <div class="shelf-card-tag">Brand &amp; Visibility</div>
              <div class="shelf-card-title">Why Great Manufacturers Stay Invisible</div>
              <div class="shelf-card-body">Brand, positioning, and visibility — why quality alone never builds a manufacturer's reputation.</div>
              <div class="shelf-card-footer">
                <button class="btn btn-primary" id="book1-btn" onclick="openBook('book1', ${hasStarted ? lastCh : 0})">
                  ${hasStarted ? 'Continue Reading →' : 'Begin Reading →'}
                </button>
              </div>
            </div>

            <div class="shelf-card shelf-card--active">
              <div class="shelf-card-num">02</div>
              <div class="shelf-card-tag">Strategy Design</div>
              <div class="shelf-card-title">Stop Planning, Start Winning</div>
              <div class="shelf-card-body">The strategy design framework for manufacturers tired of annual plans that never move the needle.</div>
              <div class="shelf-card-footer">
                <button class="btn btn-primary" id="book2-btn" onclick="openBook('book2', 0)">Begin Reading →</button>
              </div>
            </div>

            <div class="shelf-card shelf-card--active">
              <div class="shelf-card-num">03</div>
              <div class="shelf-card-tag">Capital &amp; Risk</div>
              <div class="shelf-card-title">Don't Bet the Business</div>
              <div class="shelf-card-body">How to test your biggest assumptions before committing capital — scale without betting everything.</div>
              <div class="shelf-card-footer">
                <button class="btn btn-primary" onclick="openBook('book3')">Begin Reading →</button>
              </div>
            </div>

            <div class="shelf-card shelf-card--active">
              <div class="shelf-card-num">04</div>
              <div class="shelf-card-tag">Scale Archetypes</div>
              <div class="shelf-card-title">Decoding the Rs. 100 Cr Breakthrough</div>
              <div class="shelf-card-body">Real archetypes of Indian manufacturers who crossed ₹100 Cr — and the exact moves that got them there.</div>
              <div class="shelf-card-footer">
                <button class="btn btn-primary" onclick="openBook('book4')">Begin Reading →</button>
              </div>
            </div>

          </div>
        </div>
      </div>
      <div class="screen-footer">
        <span></span>
        <span class="footer-copy">© 2026 Sudharsan K R</span>
        <span></span>
      </div>
    </div>`;

  document.getElementById('logout-btn').style.display = 'inline-flex';
  hideLoader();
}

// ── BOOK HANDOFF ──
// Asks server to build the token handoff URL, then navigates the reader there
async function openBook(book, lastChapter) {
  const { email, token } = getSession();
  const btn = document.getElementById(book + '-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Opening…'; }

  // Build destination path inside the book
  const bookPath = (book === 'book1' && lastChapter >= 1)
    ? `/chapter/${lastChapter}`
    : '/';

  try {
    const res  = await fetch('/open-book', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, token, book, path: bookPath })
    });
    const data = await res.json();

    if (!res.ok || !data.url) {
      if (btn) { btn.disabled = false; btn.textContent = lastChapter >= 1 ? 'Continue Reading →' : 'Begin Reading →'; }
      alert('Could not open the book. Please try again.');
      return;
    }

    window.location.href = data.url;

  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = lastChapter >= 1 ? 'Continue Reading →' : 'Begin Reading →'; }
    alert('Connection error. Please try again.');
  }
}

// ── LOGOUT ──
function logout() {
  clearSession();
  loadLogin();
}

// ── ROUTE ──
async function route() {
  if (!hasSession()) {
    loadLogin();
    return;
  }

  showLoader();

  // Verify session with server on load
  const { email, token } = getSession();
  try {
    const res  = await fetch('/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, token })
    });
    const data = await res.json();

    if (!data.valid) {
      clearSession();
      loadLogin();
      return;
    }

    // Refresh name in case it changed
    if (data.name) localStorage.setItem('readerName', data.name);

  } catch (err) {
    // Offline — proceed with cached session
    console.warn('Verify failed (offline?), proceeding with cached session.');
  }

  loadShelf();
}

// ── KEYBOARD ──
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('sc-login')) {
    submitLogin();
  }
});

// ── EXPOSE GLOBALS ──
window.submitLogin = submitLogin;
window.logout      = logout;
window.openBook    = openBook;

// ── INIT ──
route();
