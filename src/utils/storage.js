/**
 * localStorage management for progress & settings
 *
 * Progress states: "new" → "learning" → "mastered"
 * Promotion: 3 consecutive correct answers → mastered
 * Demotion: 1 incorrect answer → learning
 */

const PROGRESS_KEY = 'hyakuichi_progress';
const SETTINGS_KEY = 'hyakuichi_settings';

const DEFAULT_SETTINGS = {
  quizCount: 10,
  showKanji: true,
};

// --- Progress ---

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress(data) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

export function getStatus(poemId) {
  const progress = loadProgress();
  return progress[poemId]?.status || 'new';
}

export function getStreak(poemId) {
  const progress = loadProgress();
  return progress[poemId]?.streak || 0;
}

export function getAllProgress() {
  return loadProgress();
}

export function getProgressSummary() {
  const progress = loadProgress();
  const summary = { new: 0, learning: 0, mastered: 0 };

  for (let id = 1; id <= 100; id++) {
    const status = progress[id]?.status || 'new';
    summary[status]++;
  }
  return summary;
}

export function setStatus(poemId, status) {
  const progress = loadProgress();
  if (!progress[poemId]) {
    progress[poemId] = { status: 'new', streak: 0 };
  }
  progress[poemId].status = status;
  if (status === 'new') {
    progress[poemId].streak = 0;
  }
  saveProgress(progress);
}

/**
 * Record a quiz answer and update status accordingly
 */
export function recordAnswer(poemId, correct) {
  const progress = loadProgress();
  if (!progress[poemId]) {
    progress[poemId] = { status: 'new', streak: 0 };
  }

  const entry = progress[poemId];

  // First time seeing this poem in quiz → learning
  if (entry.status === 'new') {
    entry.status = 'learning';
  }

  if (correct) {
    entry.streak = (entry.streak || 0) + 1;
    // 3 consecutive correct → mastered
    if (entry.streak >= 3) {
      entry.status = 'mastered';
    }
  } else {
    entry.streak = 0;
    // Any wrong answer → demote to learning
    if (entry.status === 'mastered') {
      entry.status = 'learning';
    }
  }

  saveProgress(progress);
  return entry;
}

export function resetAllProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}

// --- Settings ---

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function getSettings() {
  return loadSettings();
}

export function updateSettings(partial) {
  const settings = loadSettings();
  Object.assign(settings, partial);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

export function resetSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}
