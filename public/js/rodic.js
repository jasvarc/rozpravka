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
const soundsEnabledInput = document.getElementById('soundsEnabledInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const settingsMsg = document.getElementById('settingsMsg');
const settingsError = document.getElementById('settingsError');
const historyList = document.getElementById('historyList');

const childrenList = document.getElementById('childrenList');
const childForm = document.getElementById('childForm');
const childNameInput = document.getElementById('childNameInput');
const childAgeInput = document.getElementById('childAgeInput');
const childGenderInput = document.getElementById('childGenderInput');
const childIntensityInput = document.getElementById('childIntensityInput');
const childIntensityLabel = document.getElementById('childIntensityLabel');
const childSubmitBtn = document.getElementById('childSubmitBtn');
const childCancelBtn = document.getElementById('childCancelBtn');
const childFormError = document.getElementById('childFormError');
const childrenLimitHint = document.getElementById('childrenLimitHint');
const lengthLimitHint = document.getElementById('lengthLimitHint');

let children = [];
let editingChildId = null;
let appLimits = { maxChildren: 5, dailyStoryLimit: 3, maxStoryLength: 1000 };

async function loadAppLimits() {
  const res = await fetch('api/settings/limits');
  if (!res.ok) return;
  appLimits = await res.json();
  childrenLimitHint.textContent = tn('children_limit_hint', appLimits.maxChildren);
  lengthLimitHint.textContent = tn('length_limit_hint', appLimits.maxStoryLength);
  maxLengthInput.max = appLimits.maxStoryLength;
}

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

// Ked rodic odide zo stranky (spat, zatvorenie karty, novy URL), zabudnime jeho prihlasenie,
// aby dieta pri navrate na rodicovsky portal opat muselo zadat PIN.
window.addEventListener('pagehide', () => {
  navigator.sendBeacon('api/parent/logout');
});

// Ak prehliadac obnovi stranku z bfcache (napr. tlacidlom Spat), overme si znovu u servera,
// ci sme stale prihlaseni - vyssie uvedeny beacon uz medzitym mohol odhlasenie vykonat.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    checkSession();
  }
});

function showOnly(section) {
  setupSection.style.display = 'none';
  loginSection.style.display = 'none';
  settingsSection.style.display = 'none';
  section.style.display = 'block';
  if (section === setupSection) setupPinInput.focus();
  else if (section === loginSection) loginPinInput.focus();
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

function intensityLabel(value) {
  const n = Number(value);
  const v = Number.isFinite(n) ? n : 50;
  if (v <= 20) return t('child_intensity_band_1');
  if (v <= 40) return t('child_intensity_band_2');
  if (v <= 60) return t('child_intensity_band_3');
  if (v <= 80) return t('child_intensity_band_4');
  return t('child_intensity_band_5');
}

childIntensityInput.addEventListener('input', () => {
  childIntensityLabel.textContent = intensityLabel(childIntensityInput.value);
});

function resetChildForm() {
  editingChildId = null;
  childForm.reset();
  childGenderInput.value = 'girl';
  childIntensityInput.value = 50;
  childIntensityLabel.textContent = intensityLabel(50);
  childSubmitBtn.textContent = t('child_add_btn');
  childCancelBtn.style.display = 'none';
  childFormError.style.display = 'none';
}

function renderChildren() {
  childrenList.innerHTML = '';
  if (children.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'subtitle';
    empty.textContent = t('children_empty');
    childrenList.appendChild(empty);
    return;
  }
  children.forEach((child) => {
    const item = document.createElement('div');
    item.className = 'story-history-item';

    const meta = document.createElement('strong');
    const genderLabel = child.gender === 'boy' ? t('child_gender_boy') : t('child_gender_girl');
    meta.textContent = `${child.name} · ${child.age} ${t('child_age_years_suffix')} · ${genderLabel} · ${intensityLabel(child.intensity)}`;

    const actions = document.createElement('div');
    actions.className = 'actions-row';

    const editBtn = document.createElement('button');
    editBtn.className = 'secondary';
    editBtn.textContent = t('child_edit_btn');
    editBtn.addEventListener('click', () => startEditChild(child));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger';
    deleteBtn.textContent = t('child_delete_btn');
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(t('child_delete_confirm'))) return;
      await fetch(`api/children/${child.id}`, { method: 'DELETE' });
      if (editingChildId === child.id) resetChildForm();
      await loadChildren();
      await loadHistory();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(meta);
    item.appendChild(actions);
    childrenList.appendChild(item);
  });
}

function startEditChild(child) {
  editingChildId = child.id;
  childNameInput.value = child.name;
  childAgeInput.value = child.age;
  childGenderInput.value = child.gender === 'boy' ? 'boy' : 'girl';
  childIntensityInput.value = typeof child.intensity === 'number' ? child.intensity : 50;
  childIntensityLabel.textContent = intensityLabel(childIntensityInput.value);
  childSubmitBtn.textContent = t('child_save_btn');
  childCancelBtn.style.display = 'inline-block';
  childFormError.style.display = 'none';
  childNameInput.focus();
}

async function loadChildren() {
  const res = await fetch('api/children');
  if (!res.ok) return;
  children = await res.json();
  renderChildren();
}

childCancelBtn.addEventListener('click', () => resetChildForm());

childForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  childFormError.style.display = 'none';

  const name = childNameInput.value.trim();
  const age = Number(childAgeInput.value);
  const gender = childGenderInput.value;
  const intensity = Number(childIntensityInput.value);
  if (!name || !Number.isFinite(age) || age < 0 || age > 18 || (gender !== 'boy' && gender !== 'girl')) {
    childFormError.textContent = t('child_form_error');
    childFormError.style.display = 'block';
    return;
  }

  const url = editingChildId ? `api/children/${editingChildId}` : 'api/children';
  const method = editingChildId ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, age, gender, intensity }),
  });
  const data = await res.json();
  if (!res.ok) {
    if (data.limitReached === 'children') {
      resetChildForm();
    }
    childFormError.textContent = data.error || t('error_generic');
    childFormError.style.display = 'block';
    return;
  }
  resetChildForm();
  await loadChildren();
  await loadHistory();
});

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
  soundsEnabledInput.checked = !!data.soundsEnabled;
  pendingVoiceName = data.voiceName || '';
  voiceRateInput.value = data.voiceRate || 1;
  voiceRateLabel.textContent = Number(voiceRateInput.value).toFixed(2);
  populateVoiceSelect();
  renderTagLists();
}

function renderStoryItem(s) {
  const item = document.createElement('div');
  item.className = 'story-history-item';

  const meta = document.createElement('div');
  meta.className = 'meta';
  const favMark = s.favorite ? '⭐ ' : '';
  const reportedMark = s.reported ? `${t('history_reported_badge')} · ` : '';
  meta.textContent = s.moralLesson
    ? `${reportedMark}${favMark}${formatDate(s.createdAt)} · ${t('history_moral_lesson_prefix')} ${s.moralLesson}`
    : `${reportedMark}${favMark}${formatDate(s.createdAt)}`;
  if (s.reported) {
    meta.style.color = 'var(--danger)';
  }

  const title = document.createElement('strong');
  title.textContent = s.childPrompt;

  const textBox = document.createElement('div');
  textBox.className = 'story-text';
  textBox.style.display = 'none';
  textBox.style.marginTop = '10px';
  textBox.textContent = s.content;

  const actions = document.createElement('div');
  actions.className = 'actions-row';

  const toggleTextBtn = document.createElement('button');
  toggleTextBtn.className = 'secondary';
  toggleTextBtn.textContent = t('history_show_text_btn');
  toggleTextBtn.addEventListener('click', () => {
    const showing = textBox.style.display !== 'none';
    textBox.style.display = showing ? 'none' : 'block';
    toggleTextBtn.textContent = showing ? t('history_show_text_btn') : t('history_hide_text_btn');
  });

  const favBtn = document.createElement('button');
  favBtn.className = 'secondary';
  favBtn.textContent = s.favorite ? t('history_favorite_off_btn') : t('history_favorite_on_btn');
  favBtn.addEventListener('click', async () => {
    await fetch(`api/story/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite: !s.favorite }),
    });
    await loadHistory();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'danger';
  deleteBtn.textContent = t('history_delete_btn');
  deleteBtn.addEventListener('click', async () => {
    if (!confirm(t('history_delete_confirm'))) return;
    await fetch(`api/story/${s.id}`, { method: 'DELETE' });
    await loadHistory();
  });

  actions.appendChild(toggleTextBtn);
  actions.appendChild(favBtn);
  actions.appendChild(deleteBtn);

  item.appendChild(meta);
  item.appendChild(title);
  item.appendChild(actions);
  item.appendChild(textBox);

  if (s.reported) {
    const resolveBtn = document.createElement('button');
    resolveBtn.className = 'secondary';
    resolveBtn.textContent = t('history_resolve_report_btn');
    resolveBtn.style.marginTop = '8px';
    resolveBtn.addEventListener('click', async () => {
      await fetch(`api/story/${s.id}/dismiss-report`, { method: 'POST' });
      await loadHistory();
    });
    item.appendChild(resolveBtn);

    if (s.suggestedBlockedTopics && s.suggestedBlockedTopics.length > 0) {
      const suggestionsLabel = document.createElement('p');
      suggestionsLabel.className = 'subtitle';
      suggestionsLabel.style.marginTop = '10px';
      suggestionsLabel.textContent = t('history_reported_suggestions_label');
      item.appendChild(suggestionsLabel);

      const suggestionsList = document.createElement('div');
      suggestionsList.className = 'topic-list';
      s.suggestedBlockedTopics.forEach((topic) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'topic-chip';
        chip.textContent = `+ ${topic}`;
        chip.addEventListener('click', async () => {
          chip.disabled = true;
          await fetch(`api/story/${s.id}/add-blocked-topic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic }),
          });
          chip.textContent = `✓ ${topic}`;
          await loadSettings();
        });
        suggestionsList.appendChild(chip);
      });
      item.appendChild(suggestionsList);
    }
  }

  return item;
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

  const knownChildIds = new Set(children.map((c) => c.id));
  const groups = children.map((child) => ({
    heading: child.name,
    stories: stories.filter((s) => s.childId === child.id),
  }));
  const orphaned = stories.filter((s) => !s.childId || !knownChildIds.has(s.childId));
  if (orphaned.length > 0) {
    const fallbackName = orphaned[0].childName;
    groups.push({ heading: fallbackName ? `${t('history_removed_child_heading')} (${fallbackName})` : t('history_removed_child_heading'), stories: orphaned });
  }

  groups.forEach((group) => {
    if (group.stories.length === 0) return;
    const heading = document.createElement('h3');
    heading.textContent = group.heading;
    historyList.appendChild(heading);
    group.stories.slice(0, 50).forEach((s) => historyList.appendChild(renderStoryItem(s)));
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
    resetChildForm();
    await loadAppLimits();
    await loadSettings();
    await loadChildren();
    await loadHistory();
  }
}

setupPinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    setupBtn.click();
  }
});

loginPinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    loginBtn.click();
  }
});

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
      soundsEnabled: soundsEnabledInput.checked,
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
  if (data.maxLengthClamped) {
    maxLengthInput.value = data.maxLength;
    settingsMsg.textContent = `${t('settings_saved_msg')} ${tn('max_length_clamped_msg', data.maxLength)}`;
  } else {
    settingsMsg.textContent = t('settings_saved_msg');
  }
  settingsMsg.style.display = 'block';
});

logoutBtn.addEventListener('click', async () => {
  await fetch('api/parent/logout', { method: 'POST' });
  await checkSession();
});

checkSession();
