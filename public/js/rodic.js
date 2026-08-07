const setupSection = document.getElementById('setupSection');
const loginSection = document.getElementById('loginSection');
const settingsSection = document.getElementById('settingsSection');

const setupPinInput = document.getElementById('setupPinInput');
const setupBtn = document.getElementById('setupBtn');
const setupError = document.getElementById('setupError');

const loginPinInput = document.getElementById('loginPinInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const moralLessonInput = document.getElementById('moralLessonInput');
const minLengthInput = document.getElementById('minLengthInput');
const maxLengthInput = document.getElementById('maxLengthInput');
const languageSelect = document.getElementById('languageSelect');
const voiceSelect = document.getElementById('voiceSelect');
const voiceRateInput = document.getElementById('voiceRateInput');
const voiceRateLabel = document.getElementById('voiceRateLabel');
const testVoiceBtn = document.getElementById('testVoiceBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const settingsMsg = document.getElementById('settingsMsg');
const settingsError = document.getElementById('settingsError');
const historyList = document.getElementById('historyList');

const TAG_LISTS = [
  { key: 'allowedTopics', list: document.getElementById('allowedList'), input: document.getElementById('allowedInput'), btn: document.getElementById('addAllowedBtn') },
  { key: 'blockedTopics', list: document.getElementById('blockedList'), input: document.getElementById('blockedInput'), btn: document.getElementById('addBlockedBtn') },
  { key: 'girlNames', list: document.getElementById('girlNamesList'), input: document.getElementById('girlNamesInput'), btn: document.getElementById('addGirlNamesBtn') },
  { key: 'boyNames', list: document.getElementById('boyNamesList'), input: document.getElementById('boyNamesInput'), btn: document.getElementById('addBoyNamesBtn') },
  { key: 'adultNames', list: document.getElementById('adultNamesList'), input: document.getElementById('adultNamesInput'), btn: document.getElementById('addAdultNamesBtn') },
];

let state = { allowedTopics: [], blockedTopics: [], girlNames: [], boyNames: [], adultNames: [] };
let availableVoices = [];
let pendingVoiceName = '';

const TEST_VOICE_SAMPLES = {
  sk: 'Toto je ukážka hlasu na čítanie rozprávok.',
  en: 'This is a sample voice for reading stories.',
};

initLanguage().then(() => {
  document.title = t('rodic_title');
});

function showOnly(section) {
  setupSection.style.display = 'none';
  loginSection.style.display = 'none';
  settingsSection.style.display = 'none';
  section.style.display = 'block';
}

function renderChips(container, items, onRemove) {
  container.innerHTML = '';
  items.forEach((item, idx) => {
    const chip = document.createElement('div');
    chip.className = 'topic-chip';
    chip.innerHTML = `<span></span><button type="button" aria-label="Odstrániť">&times;</button>`;
    chip.querySelector('span').textContent = item;
    chip.querySelector('button').addEventListener('click', () => onRemove(idx));
    container.appendChild(chip);
  });
}

function renderTagLists() {
  TAG_LISTS.forEach(({ key, list }) => {
    renderChips(list, state[key], (idx) => {
      state[key].splice(idx, 1);
      renderTagLists();
    });
  });
}

TAG_LISTS.forEach(({ key, input, btn }) => {
  btn.addEventListener('click', () => {
    const val = input.value.trim();
    if (val) {
      state[key].push(val);
      input.value = '';
      renderTagLists();
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      btn.click();
    }
  });
});

function populateVoiceSelect() {
  if (!('speechSynthesis' in window)) return;
  availableVoices = window.speechSynthesis.getVoices();
  const previousValue = voiceSelect.value || pendingVoiceName;
  voiceSelect.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = t('voice_default_option');
  voiceSelect.appendChild(defaultOption);

  availableVoices.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });

  if (previousValue) {
    voiceSelect.value = previousValue;
  }
}

if ('speechSynthesis' in window) {
  populateVoiceSelect();
  window.speechSynthesis.onvoiceschanged = populateVoiceSelect;
}

voiceRateInput.addEventListener('input', () => {
  voiceRateLabel.textContent = Number(voiceRateInput.value).toFixed(2);
});

testVoiceBtn.addEventListener('click', () => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const previewLang = languageSelect.value === 'en' ? 'en' : 'sk';
  const utterance = new SpeechSynthesisUtterance(TEST_VOICE_SAMPLES[previewLang]);
  utterance.lang = previewLang === 'en' ? 'en-US' : 'sk-SK';
  utterance.rate = Number(voiceRateInput.value) || 1;
  utterance.pitch = 1.05;
  const chosen = availableVoices.find((v) => v.name === voiceSelect.value);
  if (chosen) utterance.voice = chosen;
  window.speechSynthesis.speak(utterance);
});

function formatDate(iso) {
  return new Date(iso).toLocaleString(getLocaleTag());
}

async function loadSettings() {
  const res = await fetch('api/settings');
  if (!res.ok) return;
  const data = await res.json();
  state.allowedTopics = data.allowedTopics || [];
  state.blockedTopics = data.blockedTopics || [];
  state.girlNames = data.girlNames || [];
  state.boyNames = data.boyNames || [];
  state.adultNames = data.adultNames || [];
  moralLessonInput.value = data.moralLessonNext || '';
  minLengthInput.value = data.minLength || 250;
  maxLengthInput.value = data.maxLength || 400;
  languageSelect.value = data.language === 'en' ? 'en' : 'sk';
  pendingVoiceName = data.voiceName || '';
  voiceRateInput.value = data.voiceRate || 1;
  voiceRateLabel.textContent = Number(voiceRateInput.value).toFixed(2);
  populateVoiceSelect();
  renderTagLists();
}

async function loadHistory() {
  const res = await fetch('api/story');
  if (!res.ok) return;
  const stories = await res.json();
  historyList.innerHTML = '';
  if (stories.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'subtitle';
    empty.textContent = t('history_empty');
    historyList.appendChild(empty);
    return;
  }
  stories.slice(0, 20).forEach((s) => {
    const item = document.createElement('div');
    item.className = 'story-history-item';

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = s.moralLesson
      ? `${formatDate(s.createdAt)} · ${t('history_moral_lesson_prefix')} ${s.moralLesson}`
      : formatDate(s.createdAt);

    const title = document.createElement('strong');
    title.textContent = s.childPrompt;

    item.appendChild(meta);
    item.appendChild(title);
    historyList.appendChild(item);
  });
}

async function checkSession() {
  const res = await fetch('api/parent/session');
  const data = await res.json();
  if (!data.hasPin) {
    showOnly(setupSection);
  } else if (!data.authenticated) {
    showOnly(loginSection);
  } else {
    showOnly(settingsSection);
    await Promise.all([loadSettings(), loadHistory()]);
  }
}

setupBtn.addEventListener('click', async () => {
  setupError.style.display = 'none';
  const pin = setupPinInput.value.trim();
  const res = await fetch('api/parent/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) {
    setupError.textContent = data.error || t('error_generic');
    setupError.style.display = 'block';
    return;
  }
  await checkSession();
});

loginBtn.addEventListener('click', async () => {
  loginError.style.display = 'none';
  const pin = loginPinInput.value.trim();
  const res = await fetch('api/parent/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (!res.ok) {
    loginError.textContent = data.error || t('error_generic');
    loginError.style.display = 'block';
    loginPinInput.value = '';
    return;
  }
  await checkSession();
});

saveSettingsBtn.addEventListener('click', async () => {
  settingsMsg.style.display = 'none';
  settingsError.style.display = 'none';

  const minLength = Number(minLengthInput.value);
  const maxLength = Number(maxLengthInput.value);
  if (!minLength || !maxLength || minLength > maxLength) {
    settingsError.textContent = t('length_error');
    settingsError.style.display = 'block';
    return;
  }

  const res = await fetch('api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      allowedTopics: state.allowedTopics,
      blockedTopics: state.blockedTopics,
      moralLessonNext: moralLessonInput.value,
      minLength,
      maxLength,
      voiceName: voiceSelect.value,
      voiceRate: Number(voiceRateInput.value) || 1,
      girlNames: state.girlNames,
      boyNames: state.boyNames,
      adultNames: state.adultNames,
      language: languageSelect.value,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    settingsError.textContent = data.error || t('error_generic');
    settingsError.style.display = 'block';
    return;
  }
  await initLanguage();
  document.title = t('rodic_title');
  populateVoiceSelect();
  await loadHistory();
  settingsMsg.textContent = t('settings_saved_msg');
  settingsMsg.style.display = 'block';
});

logoutBtn.addEventListener('click', async () => {
  await fetch('api/parent/logout', { method: 'POST' });
  await checkSession();
});

checkSession();
