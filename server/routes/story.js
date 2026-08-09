const express = require('express');
const { getSettings, saveSettings, getAppLimits, getStories, addStory, getStory, updateStory, deleteStory, getRecentAndFavoriteStories, getChild } = require('../store');
const { generateStory, extractSoundCues, pickSurpriseTopic, suggestBlockedTopics } = require('../claude');
const { t, dailyLimitMessage } = require('../i18n');
const { logEvent } = require('../log-store');

const router = express.Router({ mergeParams: true });

const DAY_MS = 24 * 60 * 60 * 1000;

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

function stripHistoryPrefix(text) {
  return String(text || '').replace(/^(🎁|↳)\s*/, '');
}

function countStoriesInLast24h(tenant, childId) {
  const cutoff = Date.now() - DAY_MS;
  return getStories(tenant).filter((s) => s.childId === childId && new Date(s.createdAt).getTime() >= cutoff).length;
}

async function runGeneration(tenant, settings, child, { childPrompt, previousContent, characterNote, continuesFrom, historyTitle }) {
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
    childName: child.name,
    childAge: child.age,
    childGender: child.gender,
    childIntensity: child.intensity,
  });

  if (moralLesson) {
    saveSettings(tenant, { moralLessonNext: '' });
  }

  const record = addStory(tenant, {
    childId: child.id,
    childName: child.name,
    childPrompt: historyTitle,
    moralLesson: moralLesson || null,
    content,
    continuesFrom: continuesFrom || null,
  });

  const soundCues = settings.soundsEnabled ? await extractSoundCues({ content, language: settings.language }) : [];

  if (soundCues.length > 0) {
    updateStory(tenant, record.id, { soundCues });
  }

  logEvent(`Vygenerovaná rozprávka pre "${child.name}" (rodina: ${tenant}): ${historyTitle}`);

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
  try {
    const settings = getSettings(tenant);

    if (settings.enabled === false) {
      return res.status(403).json({ error: t('familyNotEnabled', settings.language) });
    }

    const { prompt, childId, surprise } = req.body;
    const child = typeof childId === 'string' ? getChild(tenant, childId) : null;
    if (!child) {
      return res.status(400).json({ error: t('childRequired', settings.language) });
    }

    const { dailyStoryLimit } = getAppLimits();
    if (countStoriesInLast24h(tenant, child.id) >= dailyStoryLimit) {
      return res.status(429).json({
        error: dailyLimitMessage({ age: child.age, gender: child.gender, language: settings.language, limit: dailyStoryLimit }),
        limitReached: 'daily',
      });
    }

    let childPrompt;
    let historyTitle;
    if (surprise) {
      childPrompt = pickSurpriseTopic({ allowedTopics: settings.allowedTopics, age: child.age, language: settings.language });
      historyTitle = `🎁 ${childPrompt}`.slice(0, 300);
    } else {
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: t('promptRequired', settings.language) });
      }
      childPrompt = prompt.trim().slice(0, 300);
      historyTitle = childPrompt;
    }

    try {
      const result = await runGeneration(tenant, settings, child, { childPrompt, historyTitle });
      res.json(result);
    } catch (err) {
      console.error('Chyba pri generovaní rozprávky:', err);
      res.status(502).json({ error: t('storyGenerationFailed', settings.language) });
    }
  } catch (err) {
    console.error('Chyba pri spracovaní požiadavky na rozprávku:', err);
    res.status(500).json({ error: t('unexpectedError', 'sk') });
  }
});

router.post('/continue', async (req, res) => {
  const { tenant } = req.params;
  try {
    const settings = getSettings(tenant);
    if (settings.enabled === false) {
      return res.status(403).json({ error: t('familyNotEnabled', settings.language) });
    }

    const { previousStoryId } = req.body;
    const characterNote = sanitizeCharacterNote(req.body.characterNote);
    const previousStory = typeof previousStoryId === 'string' ? getStory(tenant, previousStoryId) : null;
    if (!previousStory) {
      return res.status(404).json({ error: t('storyNotFound', settings.language) });
    }
    const child = previousStory.childId ? getChild(tenant, previousStory.childId) : null;
    if (!child) {
      return res.status(404).json({ error: t('childNotFound', settings.language) });
    }

    const { dailyStoryLimit } = getAppLimits();
    if (countStoriesInLast24h(tenant, child.id) >= dailyStoryLimit) {
      return res.status(429).json({
        error: dailyLimitMessage({ age: child.age, gender: child.gender, language: settings.language, limit: dailyStoryLimit }),
        limitReached: 'daily',
      });
    }

    try {
      const historyTitle = `↳ ${previousStory.childPrompt}`.slice(0, 300);
      const result = await runGeneration(tenant, settings, child, {
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
  } catch (err) {
    console.error('Chyba pri spracovaní požiadavky na pokračovanie:', err);
    res.status(500).json({ error: t('unexpectedError', 'sk') });
  }
});

router.get('/recent', (req, res, next) => {
  const { tenant } = req.params;
  try {
    const settings = getSettings(tenant);
    const childId = typeof req.query.child === 'string' ? req.query.child : null;
    const child = childId ? getChild(tenant, childId) : null;
    if (!child) {
      return res.status(400).json({ error: t('childRequired', settings.language) });
    }
    res.json({
      voiceName: settings.voiceName || '',
      voiceRate: settings.voiceRate || 1,
      language: settings.language || 'sk',
      soundsEnabled: !!settings.soundsEnabled,
      stories: getRecentAndFavoriteStories(tenant, childId, 5),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/report', async (req, res) => {
  const { tenant, id } = req.params;
  try {
    const settings = getSettings(tenant);
    const story = getStory(tenant, id);
    if (!story) {
      return res.status(404).json({ error: t('storyNotFound', settings.language) });
    }

    const suggestedBlockedTopics = await suggestBlockedTopics({
      content: story.content,
      childPrompt: stripHistoryPrefix(story.childPrompt),
      language: settings.language,
    });

    updateStory(tenant, id, {
      reported: true,
      reportedAt: new Date().toISOString(),
      suggestedBlockedTopics,
    });
    logEvent(`Dieťa "${story.childName}" nahlásilo rozprávku (rodina: ${tenant}): ${story.childPrompt}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Chyba pri spracovaní nahlásenia rozprávky:', err);
    res.status(500).json({ error: t('unexpectedError', 'sk') });
  }
});

router.post('/:id/replay', (req, res) => {
  const { tenant, id } = req.params;
  const story = getStory(tenant, id);
  if (!story) {
    return res.status(404).json({ error: t('storyNotFound', getSettings(tenant).language) });
  }
  logEvent(`Rozprávka vypočutá znova pre "${story.childName}" (rodina: ${tenant}): ${story.childPrompt}`);
  res.json({ ok: true });
});

router.get('/', requireParentAuth, (req, res, next) => {
  try {
    res.json(getStories(req.params.tenant));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/add-blocked-topic', requireParentAuth, (req, res) => {
  const { tenant, id } = req.params;
  const settings = getSettings(tenant);
  const story = getStory(tenant, id);
  if (!story) {
    return res.status(404).json({ error: t('storyNotFound', settings.language) });
  }
  const topic = typeof req.body.topic === 'string' ? req.body.topic.trim().slice(0, 60) : '';
  if (!topic) {
    return res.status(400).json({ error: t('promptRequired', settings.language) });
  }
  const blockedTopics = settings.blockedTopics || [];
  const updatedSettings = blockedTopics.includes(topic) ? settings : saveSettings(tenant, { blockedTopics: [...blockedTopics, topic] });
  res.json({ ok: true, blockedTopics: updatedSettings.blockedTopics });
});

router.post('/:id/dismiss-report', requireParentAuth, (req, res) => {
  const { tenant, id } = req.params;
  const updated = updateStory(tenant, id, { reported: false });
  if (!updated) {
    return res.status(404).json({ error: t('storyNotFound', getSettings(tenant).language) });
  }
  res.json({ ok: true });
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
