const setupSection = document.getElementById('setupSection');
const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');

const setupPinInput = document.getElementById('setupPinInput');
const setupBtn = document.getElementById('setupBtn');
const setupError = document.getElementById('setupError');

const loginPinInput = document.getElementById('loginPinInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminMsg = document.getElementById('adminMsg');
const adminError = document.getElementById('adminError');
const tenantList = document.getElementById('tenantList');
const usageTableBody = document.getElementById('usageTableBody');

const limitMaxChildrenInput = document.getElementById('limitMaxChildrenInput');
const limitDailyStoriesInput = document.getElementById('limitDailyStoriesInput');
const limitMaxWordsInput = document.getElementById('limitMaxWordsInput');
const saveLimitsBtn = document.getElementById('saveLimitsBtn');
const limitsMsg = document.getElementById('limitsMsg');
const limitsError = document.getElementById('limitsError');

const healthSummary = document.getElementById('healthSummary');
const logsRefreshBtn = document.getElementById('logsRefreshBtn');
const logsAutoRefreshInput = document.getElementById('logsAutoRefreshInput');
const logViewer = document.getElementById('logViewer');

let logsInterval = null;

// Ked admin odide zo stranky (spat, zatvorenie karty, novy URL), zabudnime jeho prihlasenie,
// aby pri navrate opat muselo zadat PIN.
window.addEventListener('pagehide', () => {
  stopLogsAutoRefresh();
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
  adminSection.style.display = 'none';
  section.style.display = 'block';
  if (section === setupSection) setupPinInput.focus();
  else if (section === loginSection) loginPinInput.focus();
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('sk-SK');
}

function formatTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('sk-SK', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function showMsg(text) {
  adminError.style.display = 'none';
  adminMsg.textContent = text;
  adminMsg.style.display = 'block';
}

function showErr(text) {
  adminMsg.style.display = 'none';
  adminError.textContent = text;
  adminError.style.display = 'block';
}

async function loadTenants() {
  const res = await fetch('api/admin/tenants');
  if (!res.ok) return;
  const tenants = await res.json();
  tenantList.innerHTML = '';

  if (tenants.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'subtitle';
    empty.textContent = 'Zatiaľ žiadne rodiny.';
    tenantList.appendChild(empty);
    return;
  }

  tenants.forEach((tenant) => {
    const item = document.createElement('div');
    item.className = 'story-history-item';

    const title = document.createElement('strong');
    title.textContent = tenant.name;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `jazyk: ${tenant.language} · rozprávok: ${tenant.storyCount} · vytvorené: ${formatDate(tenant.createdAt)} · posledná rozprávka: ${formatDate(tenant.lastStoryAt)} · PIN: ${tenant.hasPin ? 'nastavený' : 'nenastavený'}`;

    const actions = document.createElement('div');
    actions.className = 'actions-row';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'secondary';
    resetBtn.textContent = '🔑 Resetovať PIN';
    resetBtn.addEventListener('click', () => resetPin(tenant.name));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger';
    deleteBtn.textContent = '🗑️ Zmazať';
    deleteBtn.addEventListener('click', () => deleteTenant(tenant.name));

    actions.appendChild(resetBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(actions);
    tenantList.appendChild(item);
  });
}

const USAGE_WINDOW_KEYS = ['h24', 'd7', 'd28', 'd365'];

function formatUsageCell(usage) {
  return `${usage.count} (${usage.words})`;
}

function appendUsageRow(name, usage, isFamily) {
  const row = document.createElement('tr');
  row.className = isFamily ? 'usage-family' : 'usage-child';

  const nameCell = document.createElement('td');
  nameCell.textContent = name;
  row.appendChild(nameCell);

  USAGE_WINDOW_KEYS.forEach((key) => {
    const cell = document.createElement('td');
    cell.textContent = formatUsageCell(usage[key]);
    row.appendChild(cell);
  });

  usageTableBody.appendChild(row);
}

async function loadUsage() {
  const res = await fetch('api/admin/usage');
  if (!res.ok) return;
  const summaries = await res.json();
  usageTableBody.innerHTML = '';

  if (summaries.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'subtitle';
    cell.textContent = 'Zatiaľ žiadne rodiny.';
    row.appendChild(cell);
    usageTableBody.appendChild(row);
    return;
  }

  summaries.forEach((entry) => {
    appendUsageRow(entry.tenant, entry.family, true);
    entry.children.forEach((child) => appendUsageRow(child.name, child.usage, false));
  });
}

async function loadLimits() {
  const res = await fetch('api/admin/limits');
  if (!res.ok) return;
  const data = await res.json();
  limitMaxChildrenInput.value = data.maxChildren;
  limitDailyStoriesInput.value = data.dailyStoryLimit;
  limitMaxWordsInput.value = data.maxStoryLength;
}

saveLimitsBtn.addEventListener('click', async () => {
  limitsMsg.style.display = 'none';
  limitsError.style.display = 'none';
  const res = await fetch('api/admin/limits', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      maxChildren: Number(limitMaxChildrenInput.value),
      dailyStoryLimit: Number(limitDailyStoriesInput.value),
      maxStoryLength: Number(limitMaxWordsInput.value),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    limitsError.textContent = data.error || 'Niečo sa pokazilo.';
    limitsError.style.display = 'block';
    return;
  }
  limitMaxChildrenInput.value = data.maxChildren;
  limitDailyStoriesInput.value = data.dailyStoryLimit;
  limitMaxWordsInput.value = data.maxStoryLength;
  limitsMsg.textContent = 'Limity uložené.';
  limitsMsg.style.display = 'block';
});

async function resetPin(name) {
  if (!confirm(`Naozaj chceš resetovať PIN pre "${name}"? Rodič si pri ďalšej návšteve nastaví nový PIN, ostatné nastavenia a história zostanú zachované.`)) return;
  const res = await fetch(`api/admin/tenants/${encodeURIComponent(name)}/reset-pin`, { method: 'POST' });
  const data = await res.json();
  if (!res.ok) {
    showErr(data.error || 'Niečo sa pokazilo.');
    return;
  }
  showMsg(`PIN pre "${name}" bol resetovaný.`);
  await loadTenants();
}

async function deleteTenant(name) {
  if (!confirm(`Naozaj chceš NAVŽDY zmazať "${name}" vrátane všetkých nastavení a histórie rozprávok? Túto akciu nemožno vrátiť späť.`)) return;
  const res = await fetch(`api/admin/tenants/${encodeURIComponent(name)}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) {
    showErr(data.error || 'Niečo sa pokazilo.');
    return;
  }
  showMsg(`"${name}" bol zmazaný.`);
  await Promise.all([loadTenants(), loadUsage()]);
}

let apiKeyStatus = null;

function formatApiKeyStatus(data) {
  if (!data.apiKeyConfigured) return '❌ NENASTAVENÝ';
  if (!apiKeyStatus) return '✅ nastavený (overuje sa platnosť…)';
  if (apiKeyStatus.valid === true) {
    return apiKeyStatus.reason === 'rate_limited' ? '✅ platný (momentálne rate-limited/bez kreditu)' : '✅ platný';
  }
  if (apiKeyStatus.valid === false) {
    return '❌ NEPLATNÝ (Anthropic ho odmietol)';
  }
  return '⚠️ nastavený, platnosť sa nepodarilo overiť';
}

async function loadHealth() {
  const res = await fetch('api/admin/health');
  if (!res.ok) return;
  const data = await res.json();
  const apiKeyPart = formatApiKeyStatus(data);
  healthSummary.textContent = `API kľúč: ${apiKeyPart} · Beží: ${formatUptime(data.uptimeSeconds)} · Node: ${data.nodeVersion}`;
}

// Skutocna platnost API kluca sa da overit iba realnym (velmi malym) requestom na Anthropic -
// preto sa to spusta len raz pri nacitani stranky, nie pri kazdom automatickom obnoveni logu.
async function loadApiKeyValidity() {
  const res = await fetch('api/admin/api-key-check');
  if (res.ok) {
    apiKeyStatus = await res.json();
  }
  await loadHealth();
}

function renderLogEntry(entry) {
  const line = document.createElement('div');
  const time = formatTime(entry.timestamp);
  if (entry.level === 'error') {
    line.className = 'log-line log-error';
    line.textContent = `[${time}] CHYBA: ${entry.message}`;
  } else {
    line.className = 'log-line';
    line.textContent = `[${time}] ${entry.message}`;
  }
  return line;
}

async function loadLogs() {
  const res = await fetch('api/admin/logs');
  if (!res.ok) return;
  const entries = await res.json();
  const wasScrolledToTop = logViewer.scrollTop === 0;
  logViewer.innerHTML = '';
  if (entries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'subtitle';
    empty.textContent = 'Zatiaľ žiadny záznam.';
    logViewer.appendChild(empty);
    return;
  }
  entries.forEach((entry) => logViewer.appendChild(renderLogEntry(entry)));
  if (wasScrolledToTop) logViewer.scrollTop = 0;
}

function startLogsAutoRefresh() {
  stopLogsAutoRefresh();
  if (!logsAutoRefreshInput.checked) return;
  logsInterval = setInterval(() => {
    loadLogs();
    loadHealth();
  }, 5000);
}

function stopLogsAutoRefresh() {
  if (logsInterval) {
    clearInterval(logsInterval);
    logsInterval = null;
  }
}

async function checkSession() {
  stopLogsAutoRefresh();
  const res = await fetch('api/parent/session');
  const data = await res.json();
  if (!data.hasPin) {
    showOnly(setupSection);
  } else if (!data.authenticated) {
    showOnly(loginSection);
  } else {
    showOnly(adminSection);
    await Promise.all([loadTenants(), loadLimits(), loadUsage(), loadHealth(), loadLogs()]);
    startLogsAutoRefresh();
    loadApiKeyValidity();
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

refreshBtn.addEventListener('click', async () => {
  await Promise.all([loadTenants(), loadUsage()]);
});

logsRefreshBtn.addEventListener('click', async () => {
  await Promise.all([loadHealth(), loadLogs()]);
});

logsAutoRefreshInput.addEventListener('change', () => {
  if (logsAutoRefreshInput.checked) {
    startLogsAutoRefresh();
  } else {
    stopLogsAutoRefresh();
  }
});

logoutBtn.addEventListener('click', async () => {
  await fetch('api/parent/logout', { method: 'POST' });
  await checkSession();
});

checkSession();
