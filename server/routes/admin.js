const express = require('express');
const { listTenants, deleteTenant, resetTenantPin, isValidTenantName, getUsageSummary } = require('../store');
const { getEntries, logEvent } = require('../log-store');
const { checkApiKeyValidity } = require('../claude');

const router = express.Router();

router.get('/tenants', (req, res) => {
  res.json(listTenants());
});

router.get('/usage', (req, res) => {
  res.json(getUsageSummary());
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

router.get('/api-key-check', async (req, res) => {
  const result = await checkApiKeyValidity();
  res.json(result);
});

router.delete('/tenants/:name', (req, res) => {
  const name = String(req.params.name || '').toLowerCase();
  if (!isValidTenantName(name) || name === 'admin') {
    return res.status(400).json({ error: 'Neplatný názov.' });
  }
  deleteTenant(name);
  logEvent(`Administrátor zmazal rodinu "${name}".`);
  res.json({ ok: true });
});

router.post('/tenants/:name/reset-pin', (req, res) => {
  const name = String(req.params.name || '').toLowerCase();
  if (!isValidTenantName(name) || name === 'admin') {
    return res.status(400).json({ error: 'Neplatný názov.' });
  }
  resetTenantPin(name);
  logEvent(`Administrátor resetoval PIN pre rodinu "${name}".`);
  res.json({ ok: true });
});

module.exports = router;
