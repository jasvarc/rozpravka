const setupSection = document.getElementById('setupSection');
const loginSection = document.getElementById('loginSection');
const settingsSection = document.getElementById('settingsSection');

const setupPinInput = document.getElementById('setupPinInput');
const setupBtn = document.getElementById('setupBtn');
const setupError = document.getElementById('setupError');

const loginPinInput = document.getElementById('loginPinInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const allowedList = document.getElementById('allowedList');
const allowedInput = document.getElementById('allowedInput');
const addAllowedBtn = document.getElementById('addAllowedBtn');

const blockedList = document.getElementById('blockedList');
const blockedInput = document.getElementById('blockedInput');
const addBlockedBtn = document.getElementById('addBlockedBtn');

const moralLessonCheckbox = document.getElementById('moralLessonCheckbox');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const settingsMsg = document.getElementById('settingsMsg');
const settingsError = document.getElementById('settingsError');
const historyList = document.getElementById('historyList');

let state = { allowedTopics: [], blockedTopics: [] };

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

function renderTopics() {
  renderChips(allowedList, state.allowedTopics, (idx) => {
    state.allowedTopics.splice(idx, 1);
    renderTopics();
  });
  renderChips(blockedList, state.blockedTopics, (idx) => {
    state.blockedTopics.splice(idx, 1);
    renderTopics();
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('sk-SK');
}

async function loadSettings() {
  const res = await fetch('api/settings');
  if (!res.ok) return;
  const data = await res.json();
  state.allowedTopics = data.allowedTopics || [];
  state.blockedTopics = data.blockedTopics || [];
  moralLessonCheckbox.checked = !!data.includeMoralLessonNext;
  renderTopics();
}

async function loadHistory() {
  const res = await fetch('api/story');
  if (!res.ok) return;
  const stories = await res.json();
  historyList.innerHTML = '';
  if (stories.length === 0) {
    historyList.innerHTML = '<p class="subtitle">Zatiaľ žiadne rozprávky.</p>';
    return;
  }
  stories.slice(0, 20).forEach((s) => {
    const item = document.createElement('div');
    item.className = 'story-history-item';
    const lessonTag = s.moralLessonIncluded ? ' · s mravným ponaučením' : '';
    item.innerHTML = `<div class="meta">${formatDate(s.createdAt)}${lessonTag}</div><strong></strong>`;
    item.querySelector('strong').textContent = s.childPrompt;
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
    setupError.textContent = data.error || 'Niečo sa pokazilo.';
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
    loginError.textContent = data.error || 'Niečo sa pokazilo.';
    loginError.style.display = 'block';
    loginPinInput.value = '';
    return;
  }
  await checkSession();
});

addAllowedBtn.addEventListener('click', () => {
  const val = allowedInput.value.trim();
  if (val) {
    state.allowedTopics.push(val);
    allowedInput.value = '';
    renderTopics();
  }
});

addBlockedBtn.addEventListener('click', () => {
  const val = blockedInput.value.trim();
  if (val) {
    state.blockedTopics.push(val);
    blockedInput.value = '';
    renderTopics();
  }
});

[allowedInput, blockedInput].forEach((input) => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (input === allowedInput ? addAllowedBtn : addBlockedBtn).click();
    }
  });
});

saveSettingsBtn.addEventListener('click', async () => {
  settingsMsg.style.display = 'none';
  settingsError.style.display = 'none';
  const res = await fetch('api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      allowedTopics: state.allowedTopics,
      blockedTopics: state.blockedTopics,
      includeMoralLessonNext: moralLessonCheckbox.checked,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    settingsError.textContent = data.error || 'Niečo sa pokazilo.';
    settingsError.style.display = 'block';
    return;
  }
  settingsMsg.textContent = 'Nastavenia uložené.';
  settingsMsg.style.display = 'block';
});

logoutBtn.addEventListener('click', async () => {
  await fetch('api/parent/logout', { method: 'POST' });
  await checkSession();
});

checkSession();
