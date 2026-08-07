const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const errorBox = document.getElementById('errorBox');
const storyBox = document.getElementById('storyBox');
const storyText = document.getElementById('storyText');
const readBtn = document.getElementById('readBtn');
const stopBtn = document.getElementById('stopBtn');
const newStoryBtn = document.getElementById('newStoryBtn');

let utterance = null;
let storyRawText = '';
let currentVoiceName = '';
let currentVoiceRate = 1;
let wordSpans = [];
let wordCursor = 0;
let highlightedSpan = null;

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
  while ((match = wordRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      storyText.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const span = document.createElement('span');
    span.className = 'story-word';
    span.textContent = match[0];
    span.dataset.start = match.index;
    storyText.appendChild(span);
    wordSpans.push(span);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    storyText.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function resetHighlight() {
  if (highlightedSpan) highlightedSpan.classList.remove('story-word-active');
  highlightedSpan = null;
  wordCursor = 0;
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
    showError('Napíš prosím, o čom má byť rozprávka.');
    return;
  }
  hideError();
  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span class="spinner"></span>Rozprávka sa píše...';
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
      throw new Error(`Server neodpovedal správne (HTTP ${res.status}). Skús to prosím o chvíľu znova.`);
    }
    if (!res.ok) {
      throw new Error(data.error || 'Niečo sa pokazilo.');
    }
    storyRawText = data.content;
    currentVoiceName = data.voiceName || '';
    currentVoiceRate = data.voiceRate || 1;
    renderStoryText(storyRawText);
    resetHighlight();
    storyBox.style.display = 'block';
  } catch (err) {
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = '✨ Vytvor rozprávku';
  }
}

function readAloud() {
  if (!('speechSynthesis' in window)) {
    showError('Tento prehliadač bohužiaľ nevie čítať nahlas.');
    return;
  }
  window.speechSynthesis.cancel();
  resetHighlight();

  utterance = new SpeechSynthesisUtterance(storyRawText);
  utterance.lang = 'sk-SK';
  utterance.rate = currentVoiceRate || 0.95;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const chosenVoice =
    (currentVoiceName && voices.find((v) => v.name === currentVoiceName)) ||
    voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('sk'));
  if (chosenVoice) utterance.voice = chosenVoice;

  utterance.onboundary = (event) => {
    highlightAtCharIndex(event.charIndex);
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
