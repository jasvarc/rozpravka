const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const LEGACY_SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const LEGACY_STORIES_PATH = path.join(DATA_DIR, 'stories.json');

const TENANT_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{1,29}$/;

const DEFAULT_SETTINGS = {
  pinHash: null,
  allowedTopics: [],
  blockedTopics: [],
  moralLessonNext: '',
  minLength: 250,
  maxLength: 400,
  voiceName: '',
  voiceRate: 1,
  girlNames: [],
  boyNames: [],
  adultNames: [],
  language: 'sk',
  soundsEnabled: false,
  createdAt: null,
};

function isValidTenantName(name) {
  return typeof name === 'string' && TENANT_NAME_PATTERN.test(name);
}

function tenantDir(tenant) {
  return path.join(TENANTS_DIR, tenant);
}

function settingsPath(tenant) {
  return path.join(tenantDir(tenant), 'settings.json');
}

function storiesPath(tenant) {
  return path.join(tenantDir(tenant), 'stories.json');
}

function ensureTenantFiles(tenant) {
  const dir = tenantDir(tenant);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(settingsPath(tenant))) {
    fs.writeFileSync(settingsPath(tenant), JSON.stringify(DEFAULT_SETTINGS, null, 2));
  }
  if (!fs.existsSync(storiesPath(tenant))) {
    fs.writeFileSync(storiesPath(tenant), JSON.stringify([], null, 2));
  }
}

function getSettings(tenant) {
  ensureTenantFiles(tenant);
  const raw = fs.readFileSync(settingsPath(tenant), 'utf-8');
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

function saveSettings(tenant, partial) {
  const current = getSettings(tenant);
  const updated = { ...current, ...partial };
  fs.writeFileSync(settingsPath(tenant), JSON.stringify(updated, null, 2));
  return updated;
}

function getStories(tenant) {
  ensureTenantFiles(tenant);
  const raw = fs.readFileSync(storiesPath(tenant), 'utf-8');
  return JSON.parse(raw);
}

function addStory(tenant, story) {
  const stories = getStories(tenant);
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    favorite: false,
    ...story,
  };
  stories.unshift(record);
  fs.writeFileSync(storiesPath(tenant), JSON.stringify(stories, null, 2));
  return record;
}

function getStory(tenant, id) {
  return getStories(tenant).find((s) => s.id === id) || null;
}

function updateStory(tenant, id, partial) {
  const stories = getStories(tenant);
  const idx = stories.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  stories[idx] = { ...stories[idx], ...partial };
  fs.writeFileSync(storiesPath(tenant), JSON.stringify(stories, null, 2));
  return stories[idx];
}

function deleteStory(tenant, id) {
  const stories = getStories(tenant);
  const filtered = stories.filter((s) => s.id !== id);
  if (filtered.length === stories.length) return false;
  fs.writeFileSync(storiesPath(tenant), JSON.stringify(filtered, null, 2));
  return true;
}

function getRecentAndFavoriteStories(tenant, recentCount = 5) {
  const stories = getStories(tenant);
  const recent = stories.slice(0, recentCount);
  const favorites = stories.filter((s) => s.favorite);
  const merged = new Map();
  [...recent, ...favorites].forEach((s) => merged.set(s.id, s));
  return Array.from(merged.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function tenantExists(tenant) {
  return fs.existsSync(settingsPath(tenant));
}

function listTenants() {
  if (!fs.existsSync(TENANTS_DIR)) return [];
  return fs
    .readdirSync(TENANTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== 'admin' && isValidTenantName(name))
    .map((name) => {
      const settings = getSettings(name);
      const stories = getStories(name);
      return {
        name,
        hasPin: !!settings.pinHash,
        language: settings.language || 'sk',
        storyCount: stories.length,
        createdAt: settings.createdAt || null,
        lastStoryAt: stories.length > 0 ? stories[0].createdAt : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function deleteTenant(tenant) {
  if (tenant === 'admin') {
    throw new Error('Nemožno zmazať admin účet.');
  }
  const dir = tenantDir(tenant);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function resetTenantPin(tenant) {
  return saveSettings(tenant, { pinHash: null });
}

function migrateLegacyData(tenant) {
  if (!isValidTenantName(tenant)) {
    throw new Error('Neplatný názov pre migráciu.');
  }
  if (!fs.existsSync(LEGACY_SETTINGS_PATH)) {
    return { migrated: false, reason: 'Žiadne staré dáta (data/settings.json) sa nenašli.' };
  }
  if (tenantExists(tenant)) {
    return { migrated: false, reason: `Tenant "${tenant}" už existuje, migrácia by ho prepísala - nič som nezmenil.` };
  }
  const dir = tenantDir(tenant);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(LEGACY_SETTINGS_PATH, settingsPath(tenant));
  fs.renameSync(LEGACY_SETTINGS_PATH, `${LEGACY_SETTINGS_PATH}.bak`);
  if (fs.existsSync(LEGACY_STORIES_PATH)) {
    fs.copyFileSync(LEGACY_STORIES_PATH, storiesPath(tenant));
    fs.renameSync(LEGACY_STORIES_PATH, `${LEGACY_STORIES_PATH}.bak`);
  } else {
    fs.writeFileSync(storiesPath(tenant), JSON.stringify([], null, 2));
  }
  return { migrated: true };
}

module.exports = {
  isValidTenantName,
  getSettings,
  saveSettings,
  getStories,
  addStory,
  getStory,
  updateStory,
  deleteStory,
  getRecentAndFavoriteStories,
  tenantExists,
  listTenants,
  deleteTenant,
  resetTenantPin,
  migrateLegacyData,
};
