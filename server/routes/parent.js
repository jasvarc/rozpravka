const express = require('express');
const bcrypt = require('bcryptjs');
const { getSettings, saveSettings } = require('../store');

const router = express.Router();

function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{4,6}$/.test(pin);
}

router.get('/session', (req, res) => {
  const settings = getSettings();
  res.json({
    hasPin: !!settings.pinHash,
    authenticated: !!req.session.parentAuthenticated,
  });
});

router.post('/setup', (req, res) => {
  const settings = getSettings();
  if (settings.pinHash) {
    return res.status(409).json({ error: 'PIN už je nastavený.' });
  }
  const { pin } = req.body;
  if (!isValidPin(pin)) {
    return res.status(400).json({ error: 'PIN musí mať 4 až 6 číslic.' });
  }
  const pinHash = bcrypt.hashSync(pin, 10);
  saveSettings({ pinHash });
  req.session.parentAuthenticated = true;
  res.json({ ok: true });
});

router.post('/login', (req, res) => {
  const settings = getSettings();
  if (!settings.pinHash) {
    return res.status(409).json({ error: 'PIN ešte nie je nastavený.' });
  }
  const { pin } = req.body;
  if (!isValidPin(pin) || !bcrypt.compareSync(pin, settings.pinHash)) {
    return res.status(401).json({ error: 'Nesprávny PIN.' });
  }
  req.session.parentAuthenticated = true;
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.parentAuthenticated = false;
  res.json({ ok: true });
});

module.exports = router;
