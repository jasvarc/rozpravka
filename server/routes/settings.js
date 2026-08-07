const express = require('express');
const { getSettings, saveSettings } = require('../store');

const router = express.Router();

function requireParentAuth(req, res, next) {
  if (!req.session.parentAuthenticated) {
    return res.status(401).json({ error: 'Vyžaduje sa prihlásenie rodiča.' });
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

router.get('/', requireParentAuth, (req, res) => {
  const settings = getSettings();
  const { pinHash, ...safe } = settings;
  res.json(safe);
});

router.put('/', requireParentAuth, (req, res) => {
  const { allowedTopics, blockedTopics, includeMoralLessonNext } = req.body;
  const updated = saveSettings({
    allowedTopics: sanitizeTopicList(allowedTopics),
    blockedTopics: sanitizeTopicList(blockedTopics),
    includeMoralLessonNext: !!includeMoralLessonNext,
  });
  const { pinHash, ...safe } = updated;
  res.json(safe);
});

module.exports = router;
