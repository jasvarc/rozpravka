const express = require('express');
const { getSettings, saveSettings, getAppLimits } = require('../store');
const { t } = require('../i18n');

const router = express.Router({ mergeParams: true });

function requireParentAuth(req, res, next) {
  const { tenant } = req.params;
  if (!(req.session.auth && req.session.auth[tenant])) {
    return res.status(401).json({ error: t('authRequired', getSettings(tenant).language) });
  }
  next();
}

function sanitizeTopicList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0)
    .slice(0, 50);
}

function sanitizeLength(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(5000, Math.max(20, Math.round(n)));
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
  res.json({ language: getSettings(req.params.tenant).language || 'sk' });
});

router.get('/limits', (req, res) => {
  res.json(getAppLimits());
});

router.get('/status', (req, res) => {
  res.json({ enabled: getSettings(req.params.tenant).enabled !== false });
});

router.get('/', requireParentAuth, (req, res) => {
  const settings = getSettings(req.params.tenant);
  const { pinHash, ...safe } = settings;
  res.json(safe);
});

router.put('/', requireParentAuth, (req, res) => {
  const { tenant } = req.params;
  const {
    allowedTopics,
    blockedTopics,
    minLength,
    maxLength,
    voiceRate,
    girlNames,
    boyNames,
    adultNames,
    language,
    soundsEnabled,
  } = req.body;
  const current = getSettings(tenant);
  const { maxStoryLength } = getAppLimits();

  const sanitizedMin = sanitizeLength(minLength, current.minLength);
  let sanitizedMax = sanitizeLength(maxLength, current.maxLength);
  const maxLengthClamped = sanitizedMax > maxStoryLength;
  if (maxLengthClamped) {
    sanitizedMax = maxStoryLength;
  }
  if (sanitizedMin > sanitizedMax) {
    return res.status(400).json({ error: t('lengthOrderError', current.language) });
  }

  const updated = saveSettings(tenant, {
    allowedTopics: sanitizeTopicList(allowedTopics),
    blockedTopics: sanitizeTopicList(blockedTopics),
    minLength: sanitizedMin,
    maxLength: sanitizedMax,
    voiceRate: sanitizeRate(voiceRate, current.voiceRate),
    girlNames: sanitizeTopicList(girlNames),
    boyNames: sanitizeTopicList(boyNames),
    adultNames: sanitizeTopicList(adultNames),
    language: sanitizeLanguage(language, current.language),
    soundsEnabled: !!soundsEnabled,
  });
  const { pinHash, ...safe } = updated;
  res.json({ ...safe, maxLengthClamped });
});

module.exports = router;
