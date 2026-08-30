import { STATE_KEY } from './schedule.js';
import { normalizeAwardSettings, validateAwardSettings } from './awards.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function isValidState(value) {
  const allowedTeams = [
    ...(Array.isArray(value?.config?.teamsA) ? value.config.teamsA : []),
    ...(Array.isArray(value?.config?.teamsB) ? value.config.teamsB : []),
  ];

  return Boolean(
    value &&
      typeof value === 'object' &&
      value.version === 1 &&
      value.config &&
      typeof value.config === 'object' &&
      Array.isArray(value.matches) &&
      typeof value.config.playerA === 'string' &&
      typeof value.config.playerB === 'string' &&
      Array.isArray(value.config.teamsA) &&
      Array.isArray(value.config.teamsB) &&
      (value.awards === undefined ||
        (value.awards &&
          typeof value.awards === 'object' &&
          validateAwardSettings(normalizeAwardSettings(value.awards), allowedTeams, { requireSelection: false }) === null))
  );
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  const snapshot = clone(state);
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(snapshot));
  } catch {
    return snapshot;
  }
  return snapshot;
}

export function clearState() {
  try {
    window.localStorage.removeItem(STATE_KEY);
  } catch {
    return null;
  }
  return null;
}

export function updateMatch(state, matchId, updater) {
  const matches = state.matches.map((match) => {
    if (match.id !== matchId) {
      return match;
    }
    return updater(clone(match));
  });

  return {
    ...state,
    matches,
  };
}

export function updateAwards(state, awards) {
  return {
    ...state,
    awards: clone(awards),
  };
}

export function serializeState(state) {
  return JSON.stringify(state, null, 2);
}

export function parseBackup(text) {
  try {
    const parsed = JSON.parse(text);
    if (!isValidState(parsed)) {
      return { state: null, error: '备份文件无效：数据结构不匹配或版本不兼容' };
    }
    return { state: parsed, error: null };
  } catch {
    return { state: null, error: '无法读取备份文件：不是有效的 JSON 格式' };
  }
}
