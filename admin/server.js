require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const { ROOT, UPLOADS_DIR, PAGES, getPage } = require('./pages-config');
const { hasAdminAccount, verifyLogin, requireAuth, loginLimiter } = require('./auth');
const { readContent, saveContent, listHistory, revertTo, ensureDataDir } = require('./content-store');
const { upload } = require('./upload');
const netlify = require('./netlify-deploy');
const views = require('./views');
const { renderAll } = require('./render');

const PORT = process.env.PORT || 3012;
const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    maxAge: 2 * 60 * 60 * 1000, // 2 hour session timeout
    sameSite: 'lax',
  },
}));

app.use('/admin-assets', express.static(path.join(__dirname, 'public')));

// ---------- Auth ----------

app.get('/admin/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/admin');
  res.send(views.loginPage({ error: hasAdminAccount() ? null : 'No admin account set up yet. Run "npm run setup" on the server first.' }));
});

app.post('/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (verifyLogin(username, password)) {
    req.session.authenticated = true;
    req.session.username = username;
    return res.redirect('/admin');
  }
  res.status(401).send(views.loginPage({ error: 'Incorrect username or password.' }));
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ---------- Admin (protected) ----------

app.get('/admin', requireAuth, (req, res) => {
  res.send(views.dashboardPage({
    pages: PAGES,
    netlifyConfigured: netlify.isConfigured(),
    flash: null,
  }));
});

app.get('/admin/edit/:page', requireAuth, (req, res) => {
  const page = getPage(req.params.page);
  if (!page) return res.status(404).send('Unknown page');
  const content = readContent(page.key);
  res.send(views.editorPage({ page, content }));
});

app.post('/admin/edit/:page', requireAuth, async (req, res) => {
  const page = getPage(req.params.page);
  if (!page) return res.status(404).json({ error: 'Unknown page' });
  try {
    await saveContent(page.key, req.body, req.session.username);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save changes. Nothing was overwritten — try again.' });
  }
});

app.post('/admin/upload', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No image received.' });
    // Root-relative so it resolves correctly both on the live site and inside nested /admin/edit/* preview pages.
    res.json({ url: '/uploads/' + req.file.filename });
  });
});

app.get('/admin/history/:page', requireAuth, async (req, res) => {
  const page = getPage(req.params.page);
  if (!page) return res.status(404).send('Unknown page');
  const commits = await listHistory(page.key);
  res.send(views.historyPage({ page, commits }));
});

app.post('/admin/history/:page/revert', requireAuth, async (req, res) => {
  const page = getPage(req.params.page);
  if (!page) return res.status(404).send('Unknown page');
  try {
    await revertTo(page.key, req.body.hash);
    res.redirect('/admin/history/' + page.key);
  } catch (err) {
    console.error(err);
    res.status(500).send('Revert failed: ' + err.message);
  }
});

app.post('/admin/deploy', requireAuth, async (req, res) => {
  try {
    const result = await netlify.deploy();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------- Public site (static) ----------

const ROOT_FILES = new Set(PAGES.map((p) => p.outputFile).concat(['logo.png']));

app.get('/', (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/:file', (req, res, next) => {
  if (!ROOT_FILES.has(req.params.file)) return next();
  res.sendFile(path.join(ROOT, req.params.file));
});
app.use('/css', express.static(path.join(ROOT, 'css')));
app.use('/js', express.static(path.join(ROOT, 'js')));
app.use('/uploads', express.static(UPLOADS_DIR));

app.use((req, res) => res.status(404).send('404 Not found'));

(async () => {
  // Sets up content/uploads/version-history storage (seeding it on a fresh
  // persistent disk if needed), then renders pages from whatever content
  // is currently saved before accepting traffic.
  try {
    await ensureDataDir();
  } catch (err) {
    console.error('  Failed to initialize content storage:', err.message);
    console.error('  Saving/publishing may not work until this is resolved.\n');
  }
  renderAll();

  app.listen(PORT, () => {
    console.log('\n  We Love Adventure Travels');
    console.log(`  Site:  http://localhost:${PORT}`);
    console.log(`  Admin: http://localhost:${PORT}/admin\n`);
    if (!hasAdminAccount()) {
      console.log('  No admin account yet — run "npm run setup" to create one.\n');
    }
  });
})();
