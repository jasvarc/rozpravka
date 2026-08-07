const express = require('express');
const { getSettings, saveSettings } = require('../store');
const { t } = require('../i18n');

const router = express.Router();

function requireParentAuth(req, res, next) {
  if (!req.session.parentAuthenticated) {
    return res.status(401).json({ error: t('authRequired', getSettings().language) });
  }
  next();
}

function sanitizeTopicList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0)
    .slice(0, 50);
}

function sanitizeMoralLesson(text) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, 300);
}

function sanitizeLength(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(2000, Math.max(20, Math.round(n)));
}

function sanitizeVoiceName(text) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, 200);
}

function sanitizeRate(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(2, Math.max(0.5, n));
}

function sanitizeLanguage(value, fallback) {
  return value === 'en' || value === 'sk' ? value : fallback;
}

router.get('/language', (req, res) => {
  res.json({ language: getSettings().language || 'sk' });
});

router.get('/', requireParentAuth, (req, res) => {
  const settings = getSettings();
  const { pinHash, ...safe } = settings;
  res.json(safe);
});

router.put('/', requireParentAuth, (req, res) => {
  const {
    allowedTopics,
    blockedTopics,
    moralLessonNext,
    minLength,
    maxLength,
    voiceName,
    voiceRate,
    girlNames,
    boyNames,
    adultNames,
    language,
  } = req.body;
  const current = getSettings();

  const sanitizedMin = sanitizeLength(minLength, current.minLength);
  const sanitizedMax = sanitizeLength(maxLength, current.maxLength);
  if (sanitizedMin > sanitizedMax) {
    return res.status(400).json({ error: t('lengthOrderError', current.language) });
  }

  const updated = saveSettings({
    allowedTopics: sanitizeTopicList(allowedTopics),
    blockedTopics: sanitizeTopicList(blockedTopics),
    moralLessonNext: sanitizeMoralLesson(moralLessonNext),
    minLength: sanitizedMin,
    maxLength: sanitizedMax,
    voiceName: sanitizeVoiceName(voiceName),
    voiceRate: sanitizeRate(voiceRate, current.voiceRate),
    girlNames: sanitizeTopicList(girlNames),
    boyNames: sanitizeTopicList(boyNames),
    adultNames: sanitizeTopicList(adultNames),
    language: sanitizeLanguage(language, current.language),
  });
  const { pinHash, ...safe } = updated;
  res.json(safe);
});

module.exports = router;
