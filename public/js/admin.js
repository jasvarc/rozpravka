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

// Ked admin odide zo stranky (spat, zatvorenie karty, novy URL), zabudnime jeho prihlasenie,
// aby pri navrate opat muselo zadat PIN.
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
  adminSection.style.display = 'none';
  section.style.display = 'block';
  if (section === setupSection) setupPinInput.focus();
  else if (section === loginSection) loginPinInput.focus();
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('sk-SK');
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
  await loadTenants();
}

async function checkSession() {
  const res = await fetch('api/parent/session');
  const data = await res.json();
  if (!data.hasPin) {
    showOnly(setupSection);
  } else if (!data.authenticated) {
    showOnly(loginSection);
  } else {
    showOnly(adminSection);
    await loadTenants();
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

refreshBtn.addEventListener('click', loadTenants);

logoutBtn.addEventListener('click', async () => {
  await fetch('api/parent/logout', { method: 'POST' });
  await checkSession();
});

checkSession();
