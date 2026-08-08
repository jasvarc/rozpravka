const express = require('express');
const bcrypt = require('bcryptjs');
const { getSettings, saveSettings } = require('../store');
const { t } = require('../i18n');

const router = express.Router({ mergeParams: true });

function isValidPin(pin) {
  return typeof pin === 'string' && /^\d{4,6}$/.test(pin);
}

router.get('/session', (req, res) => {
  const { tenant } = req.params;
  const settings = getSettings(tenant);
  res.json({
    hasPin: !!settings.pinHash,
    authenticated: !!(req.session.auth && req.session.auth[tenant]),
  });
});

router.post('/setup', (req, res) => {
  const { tenant } = req.params;
  const settings = getSettings(tenant);
  if (settings.pinHash) {
    return res.status(409).json({ error: t('pinAlreadySet', settings.language) });
  }
  const { pin } = req.body;
  if (!isValidPin(pin)) {
    return res.status(400).json({ error: t('pinInvalid', settings.language) });
  }
  const pinHash = bcrypt.hashSync(pin, 10);
  saveSettings(tenant, { pinHash, createdAt: settings.createdAt || new Date().toISOString() });
  req.session.auth = req.session.auth || {};
  req.session.auth[tenant] = true;
  res.json({ ok: true });
});

router.post('/login', (req, res) => {
  const { tenant } = req.params;
  const settings = getSettings(tenant);
  if (!settings.pinHash) {
    return res.status(409).json({ error: t('pinNotSet', settings.language) });
  }
  const { pin } = req.body;
  if (!isValidPin(pin) || !bcrypt.compareSync(pin, settings.pinHash)) {
    return res.status(401).json({ error: t('pinWrong', settings.language) });
  }
  req.session.auth = req.session.auth || {};
  req.session.auth[tenant] = true;
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  const { tenant } = req.params;
  if (req.session.auth) req.session.auth[tenant] = false;
  res.json({ ok: true });
});

module.exports = router;
