const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');
const LEGACY_SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const LEGACY_STORIES_PATH = path.join(DATA_DIR, 'stories.json');
const APP_LIMITS_PATH = path.join(DATA_DIR, 'app-limits.json');

const DEFAULT_APP_LIMITS = {
  maxChildren: 5,
  dailyStoryLimit: 3,
  maxStoryLength: 1000,
};

const TENANT_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{1,29}$/;

const DEFAULT_SETTINGS = {
  pinHash: null,
  allowedTopics: [],
  blockedTopics: [],
  moralLessonNext: '',
  minLength: 250,
  maxLength: 400,
  // Hlas na citanie sa vybera len per-dieta (viz addChild nizsie) - rodinne nastavenie ma zmysel
  // len pre rychlost citania, ktora ostava spolocna.
  voiceRate: 1,
  girlNames: [],
  boyNames: [],
  adultNames: [],
  language: 'sk',
  soundsEnabled: false,
  createdAt: null,
  // Existujuce (uz vytvorene) rodiny musia po tejto zmene ostat povolene - preto je merge-fallback
  // pre chybajuce pole "enabled" v starych settings.json suboroch "true". Nove rodiny dostavaju
  // "enabled: false" explicitne pri prvom vytvoreni v ensureTenantFiles nizsie.
  enabled: true,
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

function childrenPath(tenant) {
  return path.join(tenantDir(tenant), 'children.json');
}

function ensureTenantFiles(tenant) {
  const dir = tenantDir(tenant);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(settingsPath(tenant))) {
    // Novo vytvorena rodina (zadanim doteraz neexistujuceho mena) zacina ako "enabled: false" -
    // admin ju musi v portali najprv povolit, kym deti mozu generovat rozpravky.
    fs.writeFileSync(settingsPath(tenant), JSON.stringify({ ...DEFAULT_SETTINGS, enabled: false }, null, 2));
  }
  if (!fs.existsSync(storiesPath(tenant))) {
    fs.writeFileSync(storiesPath(tenant), JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(childrenPath(tenant))) {
    fs.writeFileSync(childrenPath(tenant), JSON.stringify([], null, 2));
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

// Aplikacne limity (maximalny pocet deti, rozpravok/24h, slov na rozpravku) su spolocne pre
// vsetky rodiny - na rozdiel od DEFAULT_SETTINGS nie su per-tenant, ziju v jedinom subore.
function getAppLimits() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(APP_LIMITS_PATH)) {
    fs.writeFileSync(APP_LIMITS_PATH, JSON.stringify(DEFAULT_APP_LIMITS, null, 2));
  }
  const raw = fs.readFileSync(APP_LIMITS_PATH, 'utf-8');
  return { ...DEFAULT_APP_LIMITS, ...JSON.parse(raw) };
}

function saveAppLimits(partial) {
  const current = getAppLimits();
  const updated = { ...current, ...partial };
  fs.writeFileSync(APP_LIMITS_PATH, JSON.stringify(updated, null, 2));
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
    reported: false,
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

function getRecentAndFavoriteStories(tenant, childId, recentCount = 5) {
  const stories = getStories(tenant).filter((s) => s.childId === childId);
  const recent = stories.slice(0, recentCount);
  const favorites = stories.filter((s) => s.favorite);
  const merged = new Map();
  [...recent, ...favorites].forEach((s) => merged.set(s.id, s));
  return Array.from(merged.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function getChildren(tenant) {
  ensureTenantFiles(tenant);
  return JSON.parse(fs.readFileSync(childrenPath(tenant), 'utf-8'));
}

function saveChildrenList(tenant, list) {
  fs.writeFileSync(childrenPath(tenant), JSON.stringify(list, null, 2));
}

function getChild(tenant, id) {
  return getChildren(tenant).find((c) => c.id === id) || null;
}

function addChild(tenant, { name, age, gender, intensity, language, voiceName }) {
  const children = getChildren(tenant);
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name,
    age,
    gender,
    intensity: typeof intensity === 'number' ? intensity : 50,
    // "" znamena "rovnaky jazyk ako rodina" (dynamicky sleduje zmeny rodinneho jazyka),
    // 'sk'/'en' je explicitne prebitie len pre toto dieta - viz resolveStoryLanguage nizsie.
    language: language === 'en' || language === 'sk' ? language : '',
    voiceName: typeof voiceName === 'string' ? voiceName : '',
    createdAt: new Date().toISOString(),
  };
  children.push(record);
  saveChildrenList(tenant, children);
  return record;
}

function updateChild(tenant, id, partial) {
  const children = getChildren(tenant);
  const idx = children.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  children[idx] = { ...children[idx], ...partial };
  saveChildrenList(tenant, children);
  return children[idx];
}

function deleteChild(tenant, id) {
  const children = getChildren(tenant);
  const filtered = children.filter((c) => c.id !== id);
  if (filtered.length === children.length) return false;
  saveChildrenList(tenant, filtered);
  return true;
}

// Jazyk, v akom sa pre toto dieta generuju a citaju rozpravky: explicitne "sk"/"en" na dietati
// ma prednost, inak (chyba - vratane starych zaznamov spred tejto funkcie) sa pouzije jazyk rodiny.
function resolveStoryLanguage(child, settings) {
  if (child && (child.language === 'en' || child.language === 'sk')) return child.language;
  return settings && settings.language === 'en' ? 'en' : 'sk';
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
        enabled: settings.enabled !== false,
        language: settings.language || 'sk',
        storyCount: stories.length,
        createdAt: settings.createdAt || null,
        lastStoryAt: stories.length > 0 ? stories[0].createdAt : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const USAGE_WINDOWS = [
  { key: 'h24', ms: 24 * 60 * 60 * 1000 },
  { key: 'd7', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: 'd28', ms: 28 * 24 * 60 * 60 * 1000 },
  { key: 'd365', ms: 365 * 24 * 60 * 60 * 1000 },
];

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function summarizeStoriesByWindow(stories, now) {
  const summary = {};
  USAGE_WINDOWS.forEach(({ key, ms }) => {
    const cutoff = now - ms;
    const inWindow = stories.filter((s) => new Date(s.createdAt).getTime() >= cutoff);
    summary[key] = {
      count: inWindow.length,
      words: inWindow.reduce((sum, s) => sum + countWords(s.content), 0),
    };
  });
  return summary;
}

function getUsageSummary() {
  const now = Date.now();
  return listTenants().map(({ name }) => {
    const stories = getStories(name);
    const children = getChildren(name);
    return {
      tenant: name,
      family: summarizeStoriesByWindow(stories, now),
      children: children.map((child) => ({
        id: child.id,
        name: child.name,
        usage: summarizeStoriesByWindow(stories.filter((s) => s.childId === child.id), now),
      })),
    };
  });
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

function setTenantEnabled(tenant, enabled) {
  return saveSettings(tenant, { enabled: !!enabled });
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
  getAppLimits,
  saveAppLimits,
  getStories,
  addStory,
  getStory,
  updateStory,
  deleteStory,
  getRecentAndFavoriteStories,
  getChildren,
  getChild,
  addChild,
  updateChild,
  deleteChild,
  resolveStoryLanguage,
  tenantExists,
  listTenants,
  getUsageSummary,
  deleteTenant,
  resetTenantPin,
  setTenantEnabled,
  migrateLegacyData,
};
