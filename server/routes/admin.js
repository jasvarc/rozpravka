const express = require('express');
const { listTenants, deleteTenant, resetTenantPin, isValidTenantName } = require('../store');

const router = express.Router();

router.get('/tenants', (req, res) => {
  res.json(listTenants());
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
