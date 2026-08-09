const childNotFoundBox = document.getElementById('childNotFoundBox');
const familyBlockedBox = document.getElementById('familyBlockedBox');
const childContent = document.getElementById('childContent');
const childGreeting = document.getElementById('childGreeting');
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const surpriseBtn = document.getElementById('surpriseBtn');
const errorBox = document.getElementById('errorBox');
const limitNotice = document.getElementById('limitNotice');
const storyBox = document.getElementById('storyBox');
const storyText = document.getElementById('storyText');
const storyTranslationText = document.getElementById('storyTranslationText');
const storyTranslationColumn = document.getElementById('storyTranslationColumn');
const storyColumnLabelEn = document.getElementById('storyColumnLabelEn');
const storyColumnLabelSk = document.getElementById('storyColumnLabelSk');
const readBtn = document.getElementById('readBtn');
const stopBtn = document.getElementById('stopBtn');
const translateBtn = document.getElementById('translateBtn');
const newStoryBtn = document.getElementById('newStoryBtn');
const reportBtn = document.getElementById('reportBtn');
const pastHistoryList = document.getElementById('pastHistoryList');
const dailyLimitHint = document.getElementById('dailyLimitHint');

const SOUND_SENTENCE_GAP = 2;

const childId = new URLSearchParams(window.location.search).get('child');

let utterance = null;
let storyRawText = '';
let currentStoryId = null;
let currentVoiceName = '';
let currentVoiceRate = 1;
let currentStoryLang = 'sk';
let soundsEnabled = false;
let dynamicSoundMap = new Map();
let wordSpans = [];
let wordCursor = 0;
let highlightedSpan = null;
let lastSoundSentence = -Infinity;
let translationState = null; // { sentences: [{ startChar, endChar, el, chunks: [{startChar,endChar,el}] | null }] }
let highlightedTranslationEl = null;
let translationVisible = false;
let currentTranslationCache = null;

async function initChild() {
  await initLanguage();
  document.title = t('dieta_title');
  storyColumnLabelEn.textContent = `🇬🇧 ${t('language_option_en')}`;
  storyColumnLabelSk.textContent = `🇸🇰 ${t('language_option_sk')}`;

  if (!childId) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const statusRes = await fetch('api/settings/status');
    const status = statusRes.ok ? await statusRes.json() : { enabled: true };
    if (status.enabled === false) {
      familyBlockedBox.textContent = t('family_not_enabled_msg');
      familyBlockedBox.style.display = 'block';
      return;
    }

    const res = await fetch('api/children');
    const list = res.ok ? await res.json() : [];
    const child = list.find((c) => c.id === childId);
    if (!child) {
      childNotFoundBox.style.display = 'block';
      return;
    }
    childGreeting.textContent = `${t('dieta_greeting_prefix')} ${child.name}!`;
    childContent.style.display = 'block';
    promptInput.focus();
    loadPastHistory();
    loadDailyLimitHint();
    fetch(`api/children/${childId}/enter`, { method: 'POST' }).catch(() => {});
  } catch (err) {
    console.error('Nepodarilo sa overiť dieťa:', err);
    childNotFoundBox.style.display = 'block';
  }
}

async function loadDailyLimitHint() {
  const res = await fetch('api/settings/limits');
  if (!res.ok) return;
  const limits = await res.json();
  dailyLimitHint.textContent = tn('dieta_daily_limit_hint', limits.dailyStoryLimit);
}

initChild();

promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    generateBtn.click();
  }
});

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

function hideError() {
  errorBox.style.display = 'none';
}

function showLimitNotice(msg) {
  limitNotice.textContent = msg;
  limitNotice.style.display = 'block';
}

function hideLimitNotice() {
  limitNotice.style.display = 'none';
}

class LimitError extends Error {
  constructor(message) {
    super(message);
    this.isLimitError = true;
  }
}

function newParagraphEl() {
  const p = document.createElement('div');
  p.className = 'story-paragraph';
  return p;
}

function renderStoryText(text) {
  storyText.innerHTML = '';
  wordSpans = [];
  const wordRegex = /\S+/g;
  let match;
  let lastIndex = 0;
  let sentenceIndex = 0;
  let paragraph = newParagraphEl();
  storyText.appendChild(paragraph);
  while ((match = wordRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const gap = text.slice(lastIndex, match.index);
      // Odstavcovy zlom (dve a viac po sebe iducich noviek) zacina novy "story-paragraph" div
      // namiesto doslovneho vlozenia medzery - odsadenie odstavcov rieši CSS margin, vdaka comu
      // sa daju odseky medzi originalom a prekladom neskôr zarovnat na rovnaku vysku (viz
      // syncParagraphHeights).
      if (/\n\s*\n/.test(gap)) {
        paragraph = newParagraphEl();
        storyText.appendChild(paragraph);
      } else {
        paragraph.appendChild(document.createTextNode(gap));
      }
    }
    const startIndex = match.index;
    const span = document.createElement('span');
    span.className = 'story-word';
    span.textContent = match[0];
    span.dataset.start = startIndex;
    span.dataset.sentence = sentenceIndex;
    // Klik na slovo ho zvyrazni (a ak je zobrazeny preklad, zvyrazni aj jeho pripadny SK
    // pendant vpravo) - funguje nezavisle od toho, ci prave bezi citanie nahlas. "startIndex" je
    // zamerne lokalna konstanta (nie "match.index" priamo) - "match" sa v cykle prepisuje, takze
    // by v uzavere po skonceni cyklu ukazoval na null.
    span.addEventListener('click', () => highlightAtCharIndex(startIndex));
    paragraph.appendChild(span);
    wordSpans.push(span);
    lastIndex = match.index + match[0].length;
    if (/[.!?]/.test(match[0])) {
      sentenceIndex += 1;
    }
  }
  if (lastIndex < text.length) {
    paragraph.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function resetHighlight() {
  if (highlightedSpan) highlightedSpan.classList.remove('story-word-active');
  highlightedSpan = null;
  if (highlightedTranslationEl) highlightedTranslationEl.classList.remove('story-word-active');
  highlightedTranslationEl = null;
  wordCursor = 0;
  lastSoundSentence = -Infinity;
}

function maybeTriggerSound(wordSpan) {
  if (!soundsEnabled || !wordSpan) return;
  const sentenceIndex = Number(wordSpan.dataset.sentence);
  if (sentenceIndex - lastSoundSentence < SOUND_SENTENCE_GAP) return;
  const normalized = normalizeWord(wordSpan.textContent);
  const soundType = dynamicSoundMap.get(normalized) || matchSoundForWord(wordSpan.textContent, currentStoryLang);
  if (!soundType) return;
  lastSoundSentence = sentenceIndex;
  playSoundEffect(soundType);
}

// Najde posledny slovny span, ktoreho start <= charIndex. Zamerne ide o uplne prehladanie (nie
// inkrementalny kurzor) - vdaka tomu funguje rovnako spolahlivo pre postupne (monotonne rastuce)
// udalosti pri citani nahlas, ako aj pre klik na lubovolne slovo v lubovolnom poradi (aj spatne).
function findWordIndexAtChar(charIndex) {
  let idx = -1;
  for (let i = 0; i < wordSpans.length; i += 1) {
    if (Number(wordSpans[i].dataset.start) <= charIndex) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

function highlightAtCharIndex(charIndex) {
  const idx = findWordIndexAtChar(charIndex);
  if (idx === -1) return;
  wordCursor = idx;
  const target = wordSpans[idx];
  if (target && target !== highlightedSpan) {
    if (highlightedSpan) highlightedSpan.classList.remove('story-word-active');
    target.classList.add('story-word-active');
    highlightedSpan = target;
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  if (translationVisible) highlightTranslationAtCharIndex(charIndex);
}

function renderTranslation(translation) {
  storyTranslationText.innerHTML = '';
  const sentences = [];
  let cursor = 0;
  let paragraph = newParagraphEl();
  storyTranslationText.appendChild(paragraph);

  (translation.sentences || []).forEach((s) => {
    const startChar = cursor;
    const en = s.en || '';
    const trailingWs = s.trailingWs || '';
    cursor = startChar + en.length;
    const endChar = cursor;
    cursor += trailingWs.length;

    if (s.chunks && s.chunks.length > 0) {
      const chunkEls = [];
      let localCursor = 0;
      s.chunks.forEach((c) => {
        const chunkStart = localCursor;
        localCursor += (c.en || '').length;
        const span = document.createElement('span');
        span.className = 'translation-chunk';
        span.textContent = c.sk;
        paragraph.appendChild(span);
        paragraph.appendChild(document.createTextNode(' '));
        chunkEls.push({ startChar: startChar + chunkStart, endChar: startChar + localCursor, el: span });
      });
      sentences.push({ startChar, endChar, chunks: chunkEls });
    } else {
      const span = document.createElement('span');
      span.className = 'translation-chunk';
      span.textContent = s.sk || s.en;
      paragraph.appendChild(span);
      sentences.push({ startChar, endChar, chunks: null, el: span });
    }

    // Rovnaka logika odstavcoveho zlomu ako v renderStoryText - "trailingWs" je presny useik
    // povodneho anglickeho textu, takze presne odzrkadluje, kde bol v originali odstavec.
    if (/\n\s*\n/.test(trailingWs)) {
      paragraph = newParagraphEl();
      storyTranslationText.appendChild(paragraph);
    } else {
      paragraph.appendChild(document.createTextNode(trailingWs || ' '));
    }
  });

  translationState = { sentences };
}

function resetParagraphHeights(container) {
  container.querySelectorAll(':scope > .story-paragraph').forEach((p) => {
    p.style.minHeight = '';
  });
}

// Zarovna kazdy par odstavcov (original a jeho preklad) na rovnaku vysku, aby boli vizualne
// pekne vedla seba aj ked ma niektory z jazykov na danom mieste dlhsi/kratsi text.
function syncParagraphHeights() {
  const enParas = storyText.querySelectorAll(':scope > .story-paragraph');
  const skParas = storyTranslationText.querySelectorAll(':scope > .story-paragraph');
  const count = Math.max(enParas.length, skParas.length);
  for (let i = 0; i < count; i += 1) {
    if (enParas[i]) enParas[i].style.minHeight = '';
    if (skParas[i]) skParas[i].style.minHeight = '';
  }
  for (let i = 0; i < count; i += 1) {
    const target = Math.max(enParas[i] ? enParas[i].offsetHeight : 0, skParas[i] ? skParas[i].offsetHeight : 0);
    if (enParas[i]) enParas[i].style.minHeight = `${target}px`;
    if (skParas[i]) skParas[i].style.minHeight = `${target}px`;
  }
}

window.addEventListener('resize', () => {
  if (translationVisible) syncParagraphHeights();
});

function findTranslationSentenceAt(charIndex) {
  if (!translationState) return null;
  return translationState.sentences.find((s) => charIndex >= s.startChar && charIndex < s.endChar) || null;
}

function highlightTranslationAtCharIndex(charIndex) {
  if (!translationState) return;
  const sentence = findTranslationSentenceAt(charIndex);
  let target = null;
  if (sentence) {
    if (sentence.chunks) {
      const chunk = sentence.chunks.find((c) => charIndex >= c.startChar && charIndex < c.endChar);
      target = chunk ? chunk.el : sentence.chunks[sentence.chunks.length - 1].el;
    } else {
      target = sentence.el;
    }
  }
  if (target !== highlightedTranslationEl) {
    if (highlightedTranslationEl) highlightedTranslationEl.classList.remove('story-word-active');
    if (target) {
      target.classList.add('story-word-active');
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    highlightedTranslationEl = target;
  }
}

function resetReportButton(reported) {
  reportBtn.disabled = !currentStoryId || reported;
  reportBtn.textContent = reported ? t('dieta_report_done') : t('dieta_report_btn');
}

async function reportCurrentStory() {
  if (!currentStoryId) return;
  reportBtn.disabled = true;
  try {
    await fetch(`api/story/${currentStoryId}/report`, { method: 'POST' });
    reportBtn.textContent = t('dieta_report_done');
  } catch (err) {
    reportBtn.disabled = false;
  }
}

function applyStoryResponse(data) {
  storyRawText = data.content;
  currentVoiceName = data.voiceName || '';
  currentVoiceRate = data.voiceRate || 1;
  currentStoryLang = data.language === 'en' ? 'en' : 'sk';
  soundsEnabled = !!data.soundsEnabled;
  currentStoryId = data.id || null;
  dynamicSoundMap = new Map();
  (data.soundCues || []).forEach((cue) => {
    if (cue && typeof cue.word === 'string' && typeof cue.type === 'string') {
      dynamicSoundMap.set(normalizeWord(cue.word), cue.type);
    }
  });
  renderStoryText(storyRawText);
  resetHighlight();
  window.speechSynthesis.cancel();

  // Preklad je viazany na konkretnu rozpravku - pri kazdej novej/znovu-prehratej rozpravke ho
  // resetujeme; ak uz bola predtym prelozena (napr. z historie), pouzijeme ulozenu kopiu bez
  // noveho volania na server.
  translationState = null;
  currentTranslationCache = data.translation || null;
  translationVisible = false;
  storyTranslationText.innerHTML = '';
  storyTranslationColumn.style.display = 'none';
  storyColumnLabelEn.style.display = 'none';
  translateBtn.disabled = false;
  translateBtn.textContent = t('dieta_translate_btn');
  translateBtn.style.display = currentStoryLang === 'en' ? 'inline-block' : 'none';

  storyBox.style.display = 'block';
  storyBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  resetReportButton(!!data.reported);
}

async function parseJsonResponse(res) {
  const rawText = await res.text();
  try {
    return JSON.parse(rawText);
  } catch (parseErr) {
    console.error('Neplatná odpoveď servera. HTTP status:', res.status, 'Telo odpovede:', rawText.slice(0, 1000));
    throw new Error(`${t('dieta_error_bad_response')} (HTTP ${res.status})`);
  }
}

async function requestStory(body) {
  hideError();
  hideLimitNotice();
  storyBox.style.display = 'none';
  window.speechSynthesis.cancel();

  const res = await fetch('api/story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
    if (data.limitReached) {
      showLimitNotice(data.error || t('error_generic'));
      throw new LimitError(data.error);
    }
    throw new Error(data.error || t('error_generic'));
  }
  applyStoryResponse(data);
  loadPastHistory();
}

async function generateStory() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    showError(t('dieta_error_empty_prompt'));
    return;
  }
  generateBtn.disabled = true;
  surpriseBtn.disabled = true;
  generateBtn.innerHTML = `<span class="spinner"></span>${t('dieta_generating')}`;
  try {
    await requestStory({ prompt, childId });
  } catch (err) {
    if (!err.isLimitError) showError(err.message);
  } finally {
    generateBtn.disabled = false;
    surpriseBtn.disabled = false;
    generateBtn.textContent = t('dieta_generate_btn');
  }
}

async function generateSurpriseStory() {
  generateBtn.disabled = true;
  surpriseBtn.disabled = true;
  surpriseBtn.innerHTML = `<span class="spinner"></span>${t('dieta_generating')}`;
  try {
    await requestStory({ surprise: true, childId });
  } catch (err) {
    if (!err.isLimitError) showError(err.message);
  } finally {
    generateBtn.disabled = false;
    surpriseBtn.disabled = false;
    surpriseBtn.textContent = t('dieta_surprise_btn');
  }
}

function readAloud() {
  if (!('speechSynthesis' in window)) {
    showError(t('dieta_error_no_tts'));
    return;
  }
  window.speechSynthesis.cancel();
  resetHighlight();
  if (soundsEnabled) getAudioContext();

  utterance = new SpeechSynthesisUtterance(storyRawText);
  utterance.lang = currentStoryLang === 'en' ? 'en-US' : 'sk-SK';
  utterance.rate = currentVoiceRate || 0.95;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  // Ulozeny hlas dietata pouzijeme len ak jeho jazyk skutocne sedi s jazykom TEJTO konkretnej
  // rozpravky - inak by sa napr. anglicky hlas mohol pouzit na precitanie slovenskej rozpravky
  // (dieta mohlo medzitym zmenit svoj jazyk, alebo ide o starsiu rozpravku v inom jazyku).
  const chosenVoice =
    (currentVoiceName && voices.find((v) => v.name === currentVoiceName && v.lang && v.lang.toLowerCase().startsWith(currentStoryLang))) ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(currentStoryLang));
  if (chosenVoice) utterance.voice = chosenVoice;

  utterance.onboundary = (event) => {
    highlightAtCharIndex(event.charIndex);
    maybeTriggerSound(wordSpans[wordCursor]);
  };

  utterance.onend = () => {
    readBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    resetHighlight();
  };

  window.speechSynthesis.speak(utterance);
  readBtn.style.display = 'none';
  stopBtn.style.display = 'inline-block';
}

function stopReading() {
  window.speechSynthesis.cancel();
  readBtn.style.display = 'inline-block';
  stopBtn.style.display = 'none';
  resetHighlight();
}

function formatHistoryDate(iso) {
  return new Date(iso).toLocaleString(getLocaleTag());
}

async function loadPastHistory() {
  const res = await fetch(`api/story/recent?child=${encodeURIComponent(childId)}`);
  if (!res.ok) return;
  const data = await res.json();
  const snapshot = {
    voiceName: data.voiceName || '',
    voiceRate: data.voiceRate || 1,
    language: data.language === 'en' ? 'en' : 'sk',
    soundsEnabled: !!data.soundsEnabled,
  };
  const stories = data.stories || [];

  pastHistoryList.innerHTML = '';
  if (stories.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'subtitle';
    empty.textContent = t('dieta_history_empty');
    pastHistoryList.appendChild(empty);
    return;
  }

  stories.forEach((s) => {
    const item = document.createElement('div');
    item.className = 'story-history-item';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = s.favorite
      ? `${formatHistoryDate(s.createdAt)} · ${t('dieta_favorite_badge')}`
      : formatHistoryDate(s.createdAt);

    const title = document.createElement('strong');
    title.textContent = s.childPrompt;

    const actions = document.createElement('div');
    actions.className = 'actions-row';

    const showAgainBtn = document.createElement('button');
    showAgainBtn.className = 'secondary';
    showAgainBtn.textContent = t('dieta_show_again_btn');
    showAgainBtn.addEventListener('click', () => {
      applyStoryResponse({
        id: s.id,
        reported: s.reported,
        content: s.content,
        voiceName: snapshot.voiceName,
        voiceRate: snapshot.voiceRate,
        language: s.language || snapshot.language,
        soundsEnabled: snapshot.soundsEnabled,
        soundCues: s.soundCues || [],
        translation: s.translation || null,
      });
      fetch(`api/story/${s.id}/replay`, { method: 'POST' }).catch(() => {});
    });

    const continueBtn = document.createElement('button');
    continueBtn.className = 'secondary';
    continueBtn.textContent = t('dieta_continue_btn');

    const continueForm = document.createElement('div');
    continueForm.style.display = 'none';
    continueForm.style.marginTop = '8px';

    const continueInput = document.createElement('textarea');
    continueInput.rows = 2;
    continueInput.placeholder = t('dieta_continue_placeholder');
    continueInput.maxLength = 200;

    const continueActions = document.createElement('div');
    continueActions.className = 'actions-row';

    const continueConfirmBtn = document.createElement('button');
    continueConfirmBtn.textContent = t('dieta_continue_confirm_btn');

    const continueCancelBtn = document.createElement('button');
    continueCancelBtn.className = 'secondary';
    continueCancelBtn.textContent = t('dieta_continue_cancel_btn');

    continueBtn.addEventListener('click', () => {
      const showing = continueForm.style.display !== 'none';
      continueForm.style.display = showing ? 'none' : 'block';
      if (!showing) continueInput.focus();
    });

    continueCancelBtn.addEventListener('click', () => {
      continueForm.style.display = 'none';
      continueInput.value = '';
    });

    continueConfirmBtn.addEventListener('click', async () => {
      hideError();
      hideLimitNotice();
      continueConfirmBtn.disabled = true;
      continueConfirmBtn.innerHTML = `<span class="spinner"></span>${t('dieta_continue_generating')}`;
      try {
        const res = await fetch('api/story/continue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ previousStoryId: s.id, characterNote: continueInput.value.trim() }),
        });
        const resData = await parseJsonResponse(res);
        if (!res.ok) {
          if (resData.limitReached) {
            showLimitNotice(resData.error || t('error_generic'));
            throw new LimitError(resData.error);
          }
          throw new Error(resData.error || t('error_generic'));
        }
        continueForm.style.display = 'none';
        continueInput.value = '';
        applyStoryResponse(resData);
        loadPastHistory();
      } catch (err) {
        if (!err.isLimitError) showError(err.message);
      } finally {
        continueConfirmBtn.disabled = false;
        continueConfirmBtn.textContent = t('dieta_continue_confirm_btn');
      }
    });

    continueInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        continueConfirmBtn.click();
      }
    });

    continueActions.appendChild(continueConfirmBtn);
    continueActions.appendChild(continueCancelBtn);
    continueForm.appendChild(continueInput);
    continueForm.appendChild(continueActions);

    const reportItemBtn = document.createElement('button');
    reportItemBtn.className = 'secondary';
    reportItemBtn.textContent = s.reported ? t('dieta_report_done') : t('dieta_report_btn');
    reportItemBtn.disabled = !!s.reported;
    reportItemBtn.addEventListener('click', async () => {
      reportItemBtn.disabled = true;
      try {
        await fetch(`api/story/${s.id}/report`, { method: 'POST' });
        reportItemBtn.textContent = t('dieta_report_done');
      } catch (err) {
        reportItemBtn.disabled = false;
      }
    });

    actions.appendChild(showAgainBtn);
    actions.appendChild(continueBtn);
    actions.appendChild(reportItemBtn);

    item.appendChild(meta);
    item.appendChild(title);
    item.appendChild(actions);
    item.appendChild(continueForm);
    pastHistoryList.appendChild(item);
  });
}

async function toggleTranslation() {
  if (translationVisible) {
    storyTranslationColumn.style.display = 'none';
    storyColumnLabelEn.style.display = 'none';
    translationVisible = false;
    translateBtn.textContent = t('dieta_translate_btn');
    resetParagraphHeights(storyText);
    return;
  }

  if (translationState) {
    storyTranslationColumn.style.display = 'block';
    storyColumnLabelEn.style.display = 'block';
    translationVisible = true;
    translateBtn.textContent = t('dieta_translate_hide_btn');
    syncParagraphHeights();
    return;
  }

  hideError();
  translateBtn.disabled = true;
  translateBtn.innerHTML = `<span class="spinner"></span>${t('dieta_translating')}`;
  try {
    let translation = currentTranslationCache;
    if (!translation) {
      const res = await fetch(`api/story/${currentStoryId}/translate`, { method: 'POST' });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.error || t('error_generic'));
      translation = data.translation;
      currentTranslationCache = translation;
    }
    storyTranslationColumn.style.display = 'block';
    storyColumnLabelEn.style.display = 'block';
    renderTranslation(translation);
    syncParagraphHeights();
    translationVisible = true;
    translateBtn.textContent = t('dieta_translate_hide_btn');
  } catch (err) {
    showError(err.message);
    translateBtn.textContent = t('dieta_translate_btn');
  } finally {
    translateBtn.disabled = false;
  }
}

generateBtn.addEventListener('click', generateStory);
surpriseBtn.addEventListener('click', generateSurpriseStory);
readBtn.addEventListener('click', readAloud);
stopBtn.addEventListener('click', stopReading);
translateBtn.addEventListener('click', toggleTranslation);
reportBtn.addEventListener('click', reportCurrentStory);
newStoryBtn.addEventListener('click', () => {
  window.speechSynthesis.cancel();
  resetHighlight();
  storyBox.style.display = 'none';
  promptInput.value = '';
  promptInput.focus();
});

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {};
}
