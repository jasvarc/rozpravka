const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const errorBox = document.getElementById('errorBox');
const storyBox = document.getElementById('storyBox');
const storyText = document.getElementById('storyText');
const readBtn = document.getElementById('readBtn');
const stopBtn = document.getElementById('stopBtn');
const newStoryBtn = document.getElementById('newStoryBtn');

const SOUND_SENTENCE_GAP = 2;

let utterance = null;
let storyRawText = '';
let currentVoiceName = '';
let currentVoiceRate = 1;
let currentStoryLang = 'sk';
let soundsEnabled = false;
let dynamicSoundMap = new Map();
let wordSpans = [];
let wordCursor = 0;
let highlightedSpan = null;
let lastSoundSentence = -Infinity;

initLanguage().then(() => {
  document.title = t('dieta_title');
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

async function generateStory() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    showError(t('dieta_error_empty_prompt'));
    return;
  }
  hideError();
  generateBtn.disabled = true;
  generateBtn.innerHTML = `<span class="spinner"></span>${t('dieta_generating')}`;
  storyBox.style.display = 'none';
  window.speechSynthesis.cancel();

  try {
    const res = await fetch('api/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('Neplatná odpoveď servera. HTTP status:', res.status, 'Telo odpovede:', rawText.slice(0, 1000));
      throw new Error(`${t('dieta_error_bad_response')} (HTTP ${res.status})`);
    }
    if (!res.ok) {
      throw new Error(data.error || t('error_generic'));
    }
    storyRawText = data.content;
    currentVoiceName = data.voiceName || '';
    currentVoiceRate = data.voiceRate || 1;
    currentStoryLang = data.language === 'en' ? 'en' : 'sk';
    soundsEnabled = !!data.soundsEnabled;
    dynamicSoundMap = new Map();
    (data.soundCues || []).forEach((cue) => {
      if (cue && typeof cue.word === 'string' && typeof cue.type === 'string') {
        dynamicSoundMap.set(normalizeWord(cue.word), cue.type);
      }
    });
    renderStoryText(storyRawText);
    resetHighlight();
    storyBox.style.display = 'block';
  } catch (err) {
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = t('dieta_generate_btn');
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

generateBtn.addEventListener('click', generateStory);
readBtn.addEventListener('click', readAloud);
stopBtn.addEventListener('click', stopReading);
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
