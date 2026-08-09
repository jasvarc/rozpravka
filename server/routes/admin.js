const express = require('express');
const { listTenants, deleteTenant, resetTenantPin, isValidTenantName } = require('../store');
const { getEntries } = require('../log-store');

const router = express.Router();

router.get('/tenants', (req, res) => {
  res.json(listTenants());
});

router.get('/health', (req, res) => {
  res.json({
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
  });
});

router.get('/logs', (req, res) => {
  res.json(getEntries(300));
});

router.delete('/tenants/:name', (req, res) => {
  const name = String(req.params.name || '').toLowerCase();
  if (!isValidTenantName(name) || name === 'admin') {
    return res.status(400).json({ error: 'Neplatný názov.' });
  }
  deleteTenant(name);
  res.json({ ok: true });
});

router.post('/tenants/:name/reset-pin', (req, res) => {
  const name = String(req.params.name || '').toLowerCase();
  if (!isValidTenantName(name) || name === 'admin') {
    return res.status(400).json({ error: 'Neplatný názov.' });
  }
  resetTenantPin(name);
  res.json({ ok: true });
});

module.exports = router;
