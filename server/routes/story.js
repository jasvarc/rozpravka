const express = require('express');
const { getSettings, saveSettings, getStories, addStory, getStory, updateStory, deleteStory, getRecentAndFavoriteStories } = require('../store');
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

function sanitizeCharacterNote(text) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, 200);
}

async function runGeneration(tenant, settings, { childPrompt, previousContent, characterNote, continuesFrom, historyTitle }) {
  const moralLesson = (settings.moralLessonNext || '').trim();

  const content = await generateStory({
    childPrompt,
    allowedTopics: settings.allowedTopics,
    blockedTopics: settings.blockedTopics,
    moralLesson,
    minLength: settings.minLength,
    maxLength: settings.maxLength,
    girlNames: settings.girlNames,
    boyNames: settings.boyNames,
    adultNames: settings.adultNames,
    language: settings.language,
    previousContent,
    characterNote,
  });

  if (moralLesson) {
    saveSettings(tenant, { moralLessonNext: '' });
  }

  const record = addStory(tenant, {
    childPrompt: historyTitle,
    moralLesson: moralLesson || null,
    content,
    continuesFrom: continuesFrom || null,
  });

  const soundCues = settings.soundsEnabled ? await extractSoundCues({ content, language: settings.language }) : [];

  if (soundCues.length > 0) {
    updateStory(tenant, record.id, { soundCues });
  }

  return {
    content,
    id: record.id,
    createdAt: record.createdAt,
    voiceName: settings.voiceName || '',
    voiceRate: settings.voiceRate || 1,
    language: settings.language || 'sk',
    soundsEnabled: !!settings.soundsEnabled,
    soundCues,
  };
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
  const childPrompt = prompt.trim().slice(0, 300);

  try {
    const result = await runGeneration(tenant, settings, { childPrompt, historyTitle: childPrompt });
    res.json(result);
  } catch (err) {
    console.error('Chyba pri generovaní rozprávky:', err);
    res.status(502).json({ error: t('storyGenerationFailed', settings.language) });
  }
});

router.post('/continue', async (req, res) => {
  const { tenant } = req.params;
  let settings;
  try {
    settings = getSettings(tenant);
  } catch (err) {
    console.error('Chyba pri čítaní nastavení:', err);
    return res.status(500).json({ error: t('unexpectedError', 'sk') });
  }

  const { previousStoryId } = req.body;
  const characterNote = sanitizeCharacterNote(req.body.characterNote);
  const previousStory = typeof previousStoryId === 'string' ? getStory(tenant, previousStoryId) : null;
  if (!previousStory) {
    return res.status(404).json({ error: t('storyNotFound', settings.language) });
  }

  try {
    const historyTitle = `↳ ${previousStory.childPrompt}`.slice(0, 300);
    const result = await runGeneration(tenant, settings, {
      childPrompt: previousStory.childPrompt,
      previousContent: previousStory.content,
      characterNote,
      continuesFrom: previousStory.id,
      historyTitle,
    });
    res.json(result);
  } catch (err) {
    console.error('Chyba pri generovaní pokračovania:', err);
    res.status(502).json({ error: t('storyGenerationFailed', settings.language) });
  }
});

router.get('/recent', (req, res, next) => {
  const { tenant } = req.params;
  try {
    const settings = getSettings(tenant);
    res.json({
      voiceName: settings.voiceName || '',
      voiceRate: settings.voiceRate || 1,
      language: settings.language || 'sk',
      soundsEnabled: !!settings.soundsEnabled,
      stories: getRecentAndFavoriteStories(tenant, 5),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireParentAuth, (req, res, next) => {
  try {
    res.json(getStories(req.params.tenant));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireParentAuth, (req, res) => {
  const { tenant, id } = req.params;
  const updated = updateStory(tenant, id, { favorite: !!req.body.favorite });
  if (!updated) {
    return res.status(404).json({ error: t('storyNotFound', getSettings(tenant).language) });
  }
  res.json(updated);
});

router.delete('/:id', requireParentAuth, (req, res) => {
  const { tenant, id } = req.params;
  const ok = deleteStory(tenant, id);
  if (!ok) {
    return res.status(404).json({ error: t('storyNotFound', getSettings(tenant).language) });
  }
  res.json({ ok: true });
});

module.exports = router;
