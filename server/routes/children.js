const express = require('express');
const { getSettings, getAppLimits, getChildren, getChild, addChild, updateChild, deleteChild } = require('../store');
const { t, childrenLimitMessage } = require('../i18n');
const { logEvent } = require('../log-store');

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

function sanitizeChildLanguage(value) {
  return value === 'en' || value === 'sk' ? value : '';
}

function sanitizeVoiceName(text) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, 200);
}

function sanitizeMoralLesson(text) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, 300);
}

router.get('/', (req, res) => {
  res.json(getChildren(req.params.tenant));
});

router.post('/:id/enter', (req, res) => {
  const { tenant, id } = req.params;
  const child = getChild(tenant, id);
  if (!child) {
    return res.status(404).json({ error: t('childNotFound', getSettings(tenant).language) });
  }
  logEvent(`Dieťa "${child.name}" vstúpilo na svoju stránku (rodina: ${tenant}).`);
  res.json({ ok: true });
});

router.post('/', requireParentAuth, (req, res) => {
  const { tenant } = req.params;
  const settings = getSettings(tenant);
  const { maxChildren } = getAppLimits();
  if (getChildren(tenant).length >= maxChildren) {
    return res.status(400).json({ error: childrenLimitMessage(maxChildren, settings.language), limitReached: 'children' });
  }
  const name = sanitizeName(req.body.name);
  const age = sanitizeAge(req.body.age);
  const gender = sanitizeGender(req.body.gender);
  const intensity = sanitizeIntensity(req.body.intensity);
  const language = sanitizeChildLanguage(req.body.language);
  const voiceName = sanitizeVoiceName(req.body.voiceName);
  const moralLessonNext = sanitizeMoralLesson(req.body.moralLessonNext);
  if (!name || age === null || !gender) {
    return res.status(400).json({ error: t('childInvalid', getSettings(tenant).language) });
  }
  const child = addChild(tenant, { name, age, gender, intensity, language, voiceName, moralLessonNext });
  res.json(child);
});

router.put('/:id', requireParentAuth, (req, res) => {
  const { tenant, id } = req.params;
  const name = sanitizeName(req.body.name);
  const age = sanitizeAge(req.body.age);
  const gender = sanitizeGender(req.body.gender);
  const intensity = sanitizeIntensity(req.body.intensity);
  const language = sanitizeChildLanguage(req.body.language);
  const voiceName = sanitizeVoiceName(req.body.voiceName);
  const moralLessonNext = sanitizeMoralLesson(req.body.moralLessonNext);
  if (!name || age === null || !gender) {
    return res.status(400).json({ error: t('childInvalid', getSettings(tenant).language) });
  }
  const updated = updateChild(tenant, id, { name, age, gender, intensity, language, voiceName, moralLessonNext });
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
