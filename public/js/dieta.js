const childNotFoundBox = document.getElementById('childNotFoundBox');
const childContent = document.getElementById('childContent');
const childGreeting = document.getElementById('childGreeting');
const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const surpriseBtn = document.getElementById('surpriseBtn');
const errorBox = document.getElementById('errorBox');
const storyBox = document.getElementById('storyBox');
const storyText = document.getElementById('storyText');
const readBtn = document.getElementById('readBtn');
const stopBtn = document.getElementById('stopBtn');
const newStoryBtn = document.getElementById('newStoryBtn');
const reportBtn = document.getElementById('reportBtn');
const pastHistoryList = document.getElementById('pastHistoryList');

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

async function initChild() {
  await initLanguage();
  document.title = t('dieta_title');

  if (!childId) {
    window.location.href = 'index.html';
    return;
  }

  try {
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
    fetch(`api/children/${childId}/enter`, { method: 'POST' });
  } catch (err) {
    console.error('Nepodarilo sa overiť dieťa:', err);
    childNotFoundBox.style.display = 'block';
  }
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

function renderStoryText(text) {
  storyText.innerHTML = '';
  wordSpans = [];
  const wordRegex = /\S+/g;
  let match;
  let lastIndex = 0;
  let sentenceIndex = 0;
  while ((match = wordRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const gap = text.slice(lastIndex, match.index);
      storyText.appendChild(document.createTextNode(gap));
    }
    const span = document.createElement('span');
    span.className = 'story-word';
    span.textContent = match[0];
    span.dataset.start = match.index;
    span.dataset.sentence = sentenceIndex;
    storyText.appendChild(span);
    wordSpans.push(span);
    lastIndex = match.index + match[0].length;
    if (/[.!?]/.test(match[0])) {
      sentenceIndex += 1;
    }
  }
  if (lastIndex < text.length) {
    storyText.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function resetHighlight() {
  if (highlightedSpan) highlightedSpan.classList.remove('story-word-active');
  highlightedSpan = null;
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

function highlightAtCharIndex(charIndex) {
  while (wordCursor + 1 < wordSpans.length && Number(wordSpans[wordCursor + 1].dataset.start) <= charIndex) {
    wordCursor += 1;
  }
  const target = wordSpans[wordCursor];
  if (target && target !== highlightedSpan) {
    if (highlightedSpan) highlightedSpan.classList.remove('story-word-active');
    target.classList.add('story-word-active');
    highlightedSpan = target;
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
  storyBox.style.display = 'none';
  window.speechSynthesis.cancel();

  const res = await fetch('api/story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) {
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
    showError(err.message);
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
    showError(err.message);
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
  const chosenVoice =
    (currentVoiceName && voices.find((v) => v.name === currentVoiceName)) ||
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
        language: snapshot.language,
        soundsEnabled: snapshot.soundsEnabled,
        soundCues: s.soundCues || [],
      });
      fetch(`api/story/${s.id}/replay`, { method: 'POST' });
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
          throw new Error(resData.error || t('error_generic'));
        }
        continueForm.style.display = 'none';
        continueInput.value = '';
        applyStoryResponse(resData);
        loadPastHistory();
      } catch (err) {
        showError(err.message);
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

generateBtn.addEventListener('click', generateStory);
surpriseBtn.addEventListener('click', generateSurpriseStory);
readBtn.addEventListener('click', readAloud);
stopBtn.addEventListener('click', stopReading);
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
