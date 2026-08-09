const express = require('express');
const { listTenants, deleteTenant, resetTenantPin, isValidTenantName, getUsageSummary, getAppLimits, saveAppLimits } = require('../store');
const { getEntries, logEvent } = require('../log-store');
const { checkApiKeyValidity } = require('../claude');

const router = express.Router();

function sanitizeLimitInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

router.get('/tenants', (req, res) => {
  res.json(listTenants());
});

router.get('/usage', (req, res) => {
  res.json(getUsageSummary());
});

router.get('/limits', (req, res) => {
  res.json(getAppLimits());
});

router.put('/limits', (req, res) => {
  const current = getAppLimits();
  const updated = saveAppLimits({
    maxChildren: sanitizeLimitInt(req.body.maxChildren, current.maxChildren, 1, 20),
    dailyStoryLimit: sanitizeLimitInt(req.body.dailyStoryLimit, current.dailyStoryLimit, 1, 50),
    maxStoryLength: sanitizeLimitInt(req.body.maxStoryLength, current.maxStoryLength, 50, 5000),
  });
  logEvent(
    `Administrátor zmenil aplikačné limity: max. detí = ${updated.maxChildren}, rozprávok/24h = ${updated.dailyStoryLimit}, max. slov = ${updated.maxStoryLength}.`
  );
  res.json(updated);
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
