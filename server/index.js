require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const storyRoutes = require('./routes/story');
const parentRoutes = require('./routes/parent');
const settingsRoutes = require('./routes/settings');
const childrenRoutes = require('./routes/children');
const adminRoutes = require('./routes/admin');
const { isValidTenantName } = require('./store');
const { t } = require('./i18n');
const { addEntry: addLogEntry } = require('./log-store');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('VAROVANIE: ANTHROPIC_API_KEY nie je nastavený v .env - generovanie rozprávok zlyhá.');
}

// Kazdy console.error volany kdekolvek v aplikacii (route handlery, catch bloky...) sa okrem
// konzoly zapise aj do log-store, aby ho admin videl v diagnostike bez pristupu k serveru.
const originalConsoleError = console.error;
console.error = (...args) => {
  originalConsoleError(...args);
  addLogEntry({ level: 'error', message: args.map(String).join(' ') });
};

const NON_TENANT_PREFIXES = new Set(['css', 'js', 'api']);

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
    const firstSegment = req.originalUrl.split('/').filter(Boolean)[0];
    const tenant = firstSegment && !NON_TENANT_PREFIXES.has(firstSegment) ? firstSegment : null;
    addLogEntry({
      level: 'request',
      method: req.method,
      path: req.originalUrl,
      tenant,
      statusCode: res.statusCode,
      durationMs,
    });
  });
  next();
});

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 12 },
  })
);

// Zdielane assety (css/js) su dostupne aj bez :tenant prefixu, pre welcome.html na koreni.
app.use('/css', express.static(path.join(PUBLIC_DIR, 'css')));
app.use('/js', express.static(path.join(PUBLIC_DIR, 'js')));

// Kazda routa s :tenant prejde touto validaciou - nespravny nazov = 400 hned na zaciatku.
app.param('tenant', (req, res, next, value) => {
  const normalized = String(value).toLowerCase();
  if (!isValidTenantName(normalized)) {
    return res.status(400).json({ error: 'Neplatný názov v URL adrese.' });
  }
  req.params.tenant = normalized;
  next();
});

function requireAdminAuth(req, res, next) {
  if (!(req.session.auth && req.session.auth.admin)) {
    return res.status(401).json({ error: t('authRequired', 'sk') });
  }
  next();
}

app.use('/:tenant/api/story', storyRoutes);
app.use('/:tenant/api/parent', parentRoutes);
app.use('/:tenant/api/settings', settingsRoutes);
app.use('/:tenant/api/children', childrenRoutes);
app.use('/admin/api/admin', requireAdminAuth, adminRoutes);

// Admin nie je bezna rodina - presmeruj jeho stranky na samostatny admin portal.
app.use('/:tenant', (req, res, next) => {
  if (req.params.tenant === 'admin' && ['/', '/index.html', '/dieta.html', '/rodic.html'].includes(req.path)) {
    return res.redirect('admin.html');
  }
  next();
});

app.use('/:tenant', express.static(PUBLIC_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'welcome.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: t('unknownApiPath', 'sk') });
});

app.use((req, res) => {
  res.status(404).send('Not found');
});

app.use((err, req, res, next) => {
  console.error('Neočakávaná chyba:', err);
  res.status(500).json({ error: t('unexpectedError', 'sk') });
});

app.listen(PORT, HOST, () => {
  console.log(`Rozprávková appka beží na http://${HOST}:${PORT} (iba lokálne, verejne je dostupná cez Apache reverse proxy)`);
});
