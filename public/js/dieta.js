const promptInput = document.getElementById('promptInput');
const generateBtn = document.getElementById('generateBtn');
const errorBox = document.getElementById('errorBox');
const storyBox = document.getElementById('storyBox');
const storyText = document.getElementById('storyText');
const readBtn = document.getElementById('readBtn');
const stopBtn = document.getElementById('stopBtn');
const newStoryBtn = document.getElementById('newStoryBtn');

let utterance = null;

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = 'block';
}

function hideError() {
  errorBox.style.display = 'none';
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
    storyText.textContent = data.content;
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
  utterance = new SpeechSynthesisUtterance(storyText.textContent);
  utterance.lang = 'sk-SK';
  utterance.rate = 0.95;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const skVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('sk'));
  if (skVoice) utterance.voice = skVoice;

  utterance.onend = () => {
    readBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
  };

  window.speechSynthesis.speak(utterance);
  readBtn.style.display = 'none';
  stopBtn.style.display = 'inline-block';
}

function stopReading() {
  window.speechSynthesis.cancel();
  readBtn.style.display = 'inline-block';
  stopBtn.style.display = 'none';
}

generateBtn.addEventListener('click', generateStory);
readBtn.addEventListener('click', readAloud);
stopBtn.addEventListener('click', stopReading);
newStoryBtn.addEventListener('click', () => {
  window.speechSynthesis.cancel();
  storyBox.style.display = 'none';
  promptInput.value = '';
  promptInput.focus();
});

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {};
}
