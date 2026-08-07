const express = require('express');
const { getSettings, saveSettings, getStories, addStory } = require('../store');
const { generateStory } = require('../claude');

const router = express.Router();

function requireParentAuth(req, res, next) {
  if (!req.session.parentAuthenticated) {
    return res.status(401).json({ error: 'Vyžaduje sa prihlásenie rodiča.' });
  }
  next();
}

router.post('/', async (req, res) => {
  const { prompt } = req.body;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Napíš, o čom má byť rozprávka.' });
  }

  try {
    const settings = getSettings();
    const moralLesson = (settings.moralLessonNext || '').trim();

    const content = await generateStory({
      childPrompt: prompt.trim().slice(0, 300),
      allowedTopics: settings.allowedTopics,
      blockedTopics: settings.blockedTopics,
      moralLesson,
      minLength: settings.minLength,
      maxLength: settings.maxLength,
    });

    if (moralLesson) {
      saveSettings({ moralLessonNext: '' });
    }

    const record = addStory({
      childPrompt: prompt.trim().slice(0, 300),
      moralLesson: moralLesson || null,
      content,
    });

    res.json({ content, id: record.id, createdAt: record.createdAt });
  } catch (err) {
    console.error('Chyba pri generovaní rozprávky:', err);
    res.status(502).json({ error: 'Rozprávku sa teraz nepodarilo vygenerovať. Skús to prosím znova.' });
  }
});

router.get('/', requireParentAuth, (req, res, next) => {
  try {
    res.json(getStories());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
