require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const storyRoutes = require('./routes/story');
const parentRoutes = require('./routes/parent');
const settingsRoutes = require('./routes/settings');
const { getSettings } = require('./store');
const { t } = require('./i18n');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('VAROVANIE: ANTHROPIC_API_KEY nie je nastavený v .env - generovanie rozprávok zlyhá.');
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
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

app.use('/api/story', storyRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/settings', settingsRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

function currentLanguage() {
  try {
    return getSettings().language;
  } catch (err) {
    return 'sk';
  }
}

app.use('/api', (req, res) => {
  res.status(404).json({ error: t('unknownApiPath', currentLanguage()) });
});

app.use((err, req, res, next) => {
  console.error('Neočakávaná chyba:', err);
  res.status(500).json({ error: t('unexpectedError', currentLanguage()) });
});

app.listen(PORT, HOST, () => {
  console.log(`Rozprávková appka beží na http://${HOST}:${PORT} (iba lokálne, verejne je dostupná cez Apache reverse proxy)`);
});
