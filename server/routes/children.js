const express = require('express');
const { getSettings, getChildren, addChild, updateChild, deleteChild } = require('../store');
const { t } = require('../i18n');

const router = express.Router({ mergeParams: true });

function requireParentAuth(req, res, next) {
  const { tenant } = req.params;
  if (!(req.session.auth && req.session.auth[tenant])) {
    return res.status(401).json({ error: t('authRequired', getSettings(tenant).language) });
  }
  next();
}

function sanitizeName(text) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, 40);
}

function sanitizeAge(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(18, Math.max(0, Math.round(n)));
}

function sanitizeGender(value) {
  return value === 'boy' || value === 'girl' ? value : null;
}

function sanitizeIntensity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

router.get('/', (req, res) => {
  res.json(getChildren(req.params.tenant));
});

router.post('/', requireParentAuth, (req, res) => {
  const { tenant } = req.params;
  const name = sanitizeName(req.body.name);
  const age = sanitizeAge(req.body.age);
  const gender = sanitizeGender(req.body.gender);
  const intensity = sanitizeIntensity(req.body.intensity);
  if (!name || age === null || !gender) {
    return res.status(400).json({ error: t('childInvalid', getSettings(tenant).language) });
  }
  const child = addChild(tenant, { name, age, gender, intensity });
  res.json(child);
});

router.put('/:id', requireParentAuth, (req, res) => {
  const { tenant, id } = req.params;
  const name = sanitizeName(req.body.name);
  const age = sanitizeAge(req.body.age);
  const gender = sanitizeGender(req.body.gender);
  const intensity = sanitizeIntensity(req.body.intensity);
  if (!name || age === null || !gender) {
    return res.status(400).json({ error: t('childInvalid', getSettings(tenant).language) });
  }
  const updated = updateChild(tenant, id, { name, age, gender, intensity });
  if (!updated) {
    return res.status(404).json({ error: t('childNotFound', getSettings(tenant).language) });
  }
  res.json(updated);
});

router.delete('/:id', requireParentAuth, (req, res) => {
  const { tenant, id } = req.params;
  const ok = deleteChild(tenant, id);
  if (!ok) {
    return res.status(404).json({ error: t('childNotFound', getSettings(tenant).language) });
  }
  res.json({ ok: true });
});

module.exports = router;
