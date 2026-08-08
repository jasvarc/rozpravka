const express = require('express');
const { getSettings, saveSettings, getStories, addStory } = require('../store');
const { generateStory, extractSoundCues } = require('../claude');
const { t } = require('../i18n');

const router = express.Router({ mergeParams: true });

function requireParentAuth(req, res, next) {
  const { tenant } = req.params;
  if (!(req.session.auth && req.session.auth[tenant])) {
    return res.status(401).json({ error: t('authRequired', getSettings(tenant).language) });
  }
  next();
}

router.post('/', async (req, res) => {
  const { tenant } = req.params;
  let settings;
  try {
    settings = getSettings(tenant);
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
      saveSettings(tenant, { moralLessonNext: '' });
    }

    const record = addStory(tenant, {
      childPrompt: prompt.trim().slice(0, 300),
      moralLesson: moralLesson || null,
      content,
    });

    const soundCues = settings.soundsEnabled
      ? await extractSoundCues({ content, language: settings.language })
      : [];

    res.json({
      content,
      id: record.id,
      createdAt: record.createdAt,
      voiceName: settings.voiceName || '',
      voiceRate: settings.voiceRate || 1,
      language: settings.language || 'sk',
      soundsEnabled: !!settings.soundsEnabled,
      soundCues,
    });
  } catch (err) {
    console.error('Chyba pri generovaní rozprávky:', err);
    res.status(502).json({ error: t('storyGenerationFailed', settings.language) });
  }
});

router.get('/', requireParentAuth, (req, res, next) => {
  try {
    res.json(getStories(req.params.tenant));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
