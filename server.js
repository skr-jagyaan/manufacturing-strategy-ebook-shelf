const express    = require('express');
const cors       = require('cors');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const path       = require('path');
const admin      = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  EMAIL_HOST:  process.env.EMAIL_HOST  || 'mail.sudharsankr.co.in',
  EMAIL_PORT:  process.env.EMAIL_PORT  || 587,
  EMAIL_USER:  process.env.EMAIL_USER  || 'info@sudharsankr.co.in',
  EMAIL_PASS:  process.env.EMAIL_PASS,
  RZP_SECRET:  process.env.RZP_SECRET,
  // Where each book lives — used to build the token handoff URL
  BOOK1_URL:   process.env.BOOK1_URL   || 'https://manufacturing-series-65462349033.asia-south1.run.app',
};

// ─── FIREBASE INIT ───────────────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId:  process.env.FIREBASE_PROJECT_ID
});

const db     = admin.firestore();
const buyers = db.collection('buyers');

// ─── FIRESTORE HELPERS ───────────────────────────────────────────────────────
async function getBuyerByEmail(email) {
  const snap = await buyers.doc(email).get();
  return snap.exists ? snap.data() : null;
}

async function createBuyer(email, data) {
  await buyers.doc(email).set({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function updateBuyer(email, data) {
  await buyers.doc(email).update(data);
}

// ─── EMAIL ───────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   CONFIG.EMAIL_HOST,
  port:   Number(CONFIG.EMAIL_PORT),
  secure: false,
  auth:   { user: CONFIG.EMAIL_USER, pass: CONFIG.EMAIL_PASS }
});

async function sendCredentialsEmail(name, email, password) {
  const shelfUrl = process.env.SHELF_URL || 'https://shelf.sudharsankr.co.in';
  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{margin:0;padding:0;background:#000;font-family:'Helvetica Neue',sans-serif;}
  .w{max-width:560px;margin:40px auto;background:#0d0d0d;border:1px solid rgba(245,197,24,0.2);}
  .h{background:#000;padding:2rem;border-bottom:1px solid rgba(245,197,24,0.15);}
  .h p{color:#f5c518;font-size:0.72rem;letter-spacing:0.18em;text-transform:uppercase;margin:0;}
  .b{padding:2.5rem;}
  .g{font-size:1.3rem;font-weight:700;color:#fff;margin-bottom:1rem;}
  .t{color:rgba(255,255,255,0.5);font-size:0.92rem;line-height:1.75;margin-bottom:2rem;}
  .cred{background:#000;border-left:3px solid #f5c518;padding:1.5rem 2rem;margin-bottom:2rem;}
  .lbl{color:rgba(255,255,255,0.3);font-size:0.68rem;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:0.75rem;}
  .cred p{color:#fff;font-family:monospace;font-size:0.9rem;margin:0.35rem 0;}
  .cta{text-align:center;margin-bottom:2rem;}
  .cta a{background:#f5c518;color:#000;text-decoration:none;padding:1rem 2.5rem;font-size:0.82rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;display:inline-block;}
  .f{border-top:1px solid rgba(255,255,255,0.06);padding:1.5rem 2.5rem;font-size:0.75rem;color:rgba(255,255,255,0.25);}
</style></head><body>
<div class="w">
  <div class="h"><p>The Manufacturing Strategy Series</p></div>
  <div class="b">
    <div class="g">You're in, ${name}.</div>
    <div class="t">Your access to all four books is ready. Use the credentials below to sign in and start reading.</div>
    <div class="cred">
      <div class="lbl">Your Login Credentials</div>
      <p><strong style="color:rgba(255,255,255,0.4);">URL &nbsp;&nbsp;&nbsp;</strong> ${shelfUrl}</p>
      <p><strong style="color:rgba(255,255,255,0.4);">Email &nbsp;</strong> ${email}</p>
      <p><strong style="color:rgba(255,255,255,0.4);">Password</strong> ${password}</p>
    </div>
    <div class="cta"><a href="${shelfUrl}">Start Reading →</a></div>
    <div class="t">Save this email. These are your permanent credentials — log in anytime from any device.</div>
  </div>
  <div class="f">Sudharsan K R · sudharsankr.co.in · info@sudharsankr.co.in<br>© 2026 The Manufacturing Strategy Series</div>
</div>
</body></html>`;

  await transporter.sendMail({
    from:    `"Sudharsan K R" <${CONFIG.EMAIL_USER}>`,
    to:      email,
    subject: 'Your Access — The Manufacturing Strategy Series',
    html
  });
}

function generatePassword() {
  return crypto.randomBytes(10).toString('base64').slice(0, 12);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Payment success — called by Razorpay/payment.html after purchase
app.post('/payment-success', async (req, res) => {
  const { payment_id, name, email } = req.body;
  if (!payment_id || !name || !email) return res.status(400).json({ error: 'Missing fields' });

  try {
    const existing = await getBuyerByEmail(email);

    if (existing) {
      await sendCredentialsEmail(name, email, existing.password);
      return res.json({ success: true, message: 'Credentials resent' });
    }

    const password = generatePassword();
    await createBuyer(email, { name, email, password, paymentId: payment_id });
    await sendCredentialsEmail(name, email, password);

    res.json({ success: true });

  } catch (err) {
    console.error('payment-success error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login — validates credentials, issues session token
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const buyer = await getBuyerByEmail(email);

    if (!buyer || buyer.password !== password)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token   = generateToken();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await updateBuyer(email, { sessionToken: token, sessionExpires: expires });

    res.json({ success: true, token, name: buyer.name });

  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify session — shelf uses this on return visits
app.post('/verify', async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) return res.status(401).json({ valid: false });

  try {
    const buyer = await getBuyerByEmail(email);

    if (!buyer || buyer.sessionToken !== token)
      return res.status(401).json({ valid: false });

    if (new Date(buyer.sessionExpires) < new Date())
      return res.status(401).json({ valid: false });

    res.json({ valid: true, name: buyer.name });

  } catch (err) {
    console.error('verify error:', err);
    res.status(401).json({ valid: false });
  }
});

// Open book — shelf calls this when reader clicks "Begin/Continue Reading"
// Returns the full handoff URL for the requested book with token + email embedded
app.post('/open-book', async (req, res) => {
  const { email, token, book, path: bookPath } = req.body;
  if (!email || !token || !book) return res.status(400).json({ error: 'Missing fields' });

  try {
    const buyer = await getBuyerByEmail(email);

    if (!buyer || buyer.sessionToken !== token)
      return res.status(401).json({ error: 'Unauthorised' });

    if (new Date(buyer.sessionExpires) < new Date())
      return res.status(401).json({ error: 'Session expired' });

    const bookUrls = { book1: CONFIG.BOOK1_URL };
    const baseUrl  = bookUrls[book];
    if (!baseUrl) return res.status(400).json({ error: 'Unknown book' });

    const destination = bookPath || '/';
    const handoffUrl  = `${baseUrl}${destination}?token=${token}&email=${encodeURIComponent(email)}`;

    res.json({ url: handoffUrl });

  } catch (err) {
    console.error('open-book error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── SPA CATCH-ALL — must be last ─────────────────────────────────────────────
app.get('*', (req, res) => {
  const apiRoutes = ['/api', '/payment-success', '/login', '/verify', '/open-book', '/health'];
  if (apiRoutes.some(r => req.path.startsWith(r))) {
    return res.status(404).json({ error: 'Not found.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Shelf server running on port ${PORT}`);
  console.log(`Firebase: ${process.env.FIREBASE_PROJECT_ID || 'project ID not set'}`);
  console.log(`Book 1 URL: ${CONFIG.BOOK1_URL}`);
});
