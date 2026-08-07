const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const STORIES_PATH = path.join(DATA_DIR, 'stories.json');

const DEFAULT_SETTINGS = {
  pinHash: null,
  allowedTopics: [],
  blockedTopics: [],
  includeMoralLessonNext: false,
};

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  }
  if (!fs.existsSync(STORIES_PATH)) {
    fs.writeFileSync(STORIES_PATH, JSON.stringify([], null, 2));
  }
}

function getSettings() {
  ensureDataFiles();
  const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
  return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
}

function saveSettings(partial) {
  const current = getSettings();
  const updated = { ...current, ...partial };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2));
  return updated;
}

function getStories() {
  ensureDataFiles();
  const raw = fs.readFileSync(STORIES_PATH, 'utf-8');
  return JSON.parse(raw);
}

function addStory(story) {
  const stories = getStories();
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    ...story,
  };
  stories.unshift(record);
  fs.writeFileSync(STORIES_PATH, JSON.stringify(stories, null, 2));
  return record;
}

module.exports = {
  getSettings,
  saveSettings,
  getStories,
  addStory,
};
