const express = require('express');
const { getSettings, saveSettings, getStories, addStory } = require('../store');
const { generateStory } = require('../claude');
const { t } = require('../i18n');

const router = express.Router();

function requireParentAuth(req, res, next) {
  if (!req.session.parentAuthenticated) {
    return res.status(401).json({ error: t('authRequired', getSettings().language) });
  }
  next();
}

router.post('/', async (req, res) => {
  let settings;
  try {
    settings = getSettings();
  } catch (err) {
    console.error('Chyba pri čítaní nastavení:', err);
    return res.status(500).json({ error: t('unexpectedError', 'sk') });
  }

  const { prompt } = req.body;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: t('promptRequired', settings.language) });
  }

  try {
    const moralLesson = (settings.moralLessonNext || '').trim();

    const content = await generateStory({
      childPrompt: prompt.trim().slice(0, 300),
      allowedTopics: settings.allowedTopics,
      blockedTopics: settings.blockedTopics,
      moralLesson,
      minLength: settings.minLength,
      maxLength: settings.maxLength,
      girlNames: settings.girlNames,
      boyNames: settings.boyNames,
      adultNames: settings.adultNames,
      language: settings.language,
    });

    if (moralLesson) {
      saveSettings({ moralLessonNext: '' });
    }

    const record = addStory({
      childPrompt: prompt.trim().slice(0, 300),
      moralLesson: moralLesson || null,
      content,
    });

    res.json({
      content,
      id: record.id,
      createdAt: record.createdAt,
      voiceName: settings.voiceName || '',
      voiceRate: settings.voiceRate || 1,
      language: settings.language || 'sk',
      soundsEnabled: !!settings.soundsEnabled,
    });
  } catch (err) {
    console.error('Chyba pri generovaní rozprávky:', err);
    res.status(502).json({ error: t('storyGenerationFailed', settings.language) });
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
