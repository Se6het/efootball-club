import { STATE_KEY } from './schedule.js';
import { normalizeAwardSettings, validateAwardSettings } from './awards.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function normalizeCountEntries(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry) => ({
    name: String(entry?.name ?? '').trim(),
    count: Number(entry?.count ?? 0),
  }));
}

function normalizeCardEntries(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry) => ({
    name: String(entry?.name ?? '').trim(),
    yellow: Number(entry?.yellow ?? 0),
    red: Number(entry?.red ?? 0),
  }));
}

function normalizeCards(cards) {
  return {
    yellow: Number(cards?.yellow ?? 0),
    red: Number(cards?.red ?? 0),
  };
}

function normalizeMatch(match) {
  return {
    ...match,
    homeCards: normalizeCards(match?.homeCards),
    awayCards: normalizeCards(match?.awayCards),
    homePlayerCards: normalizeCardEntries(match?.homePlayerCards),
    awayPlayerCards: normalizeCardEntries(match?.awayPlayerCards),
    homeScorers: normalizeCountEntries(match?.homeScorers),
    awayScorers: normalizeCountEntries(match?.awayScorers),
    homeAssists: normalizeCountEntries(match?.homeAssists),
    awayAssists: normalizeCountEntries(match?.awayAssists),
  };
}

export function normalizeState(value) {
  if (!value || typeof value !== 'object') return value;
  return {
    ...value,
    matches: Array.isArray(value.matches) ? value.matches.map(normalizeMatch) : value.matches,
  };
}

function validContributionEntries(entries) {
  return Array.isArray(entries) && entries.every((entry) =>
    entry && typeof entry === 'object' && typeof entry.name === 'string' && entry.name.trim() && isNonNegativeInteger(entry.count)
  );
}

function validCardEntries(entries) {
  return Array.isArray(entries) && entries.every((entry) =>
    entry && typeof entry === 'object' && typeof entry.name === 'string' && entry.name.trim() &&
    isNonNegativeInteger(entry.yellow) && isNonNegativeInteger(entry.red) && entry.yellow + entry.red > 0
  );
}

function validCards(cards) {
  return cards && typeof cards === 'object' && isNonNegativeInteger(cards.yellow) && isNonNegativeInteger(cards.red);
}

function isValidMatch(match, allowedTeams) {
  if (!match || typeof match !== 'object') return false;
  if (typeof match.id !== 'string' || !match.id || !Number.isInteger(match.matchNumber) || match.matchNumber < 1) return false;
  if (!Number.isInteger(match.round) || match.round < 1 || typeof match.isPlayed !== 'boolean') return false;
  if (!allowedTeams.has(match.homeTeam) || !allowedTeams.has(match.awayTeam) || match.homeTeam === match.awayTeam) return false;
  if (!isNonNegativeInteger(match.homeGoals) || !isNonNegativeInteger(match.awayGoals)) return false;
  if (!validCards(match.homeCards) || !validCards(match.awayCards)) return false;
  if (!validContributionEntries(match.homeScorers) || !validContributionEntries(match.awayScorers)) return false;
  if (!validContributionEntries(match.homeAssists) || !validContributionEntries(match.awayAssists)) return false;
  if (!validCardEntries(match.homePlayerCards) || !validCardEntries(match.awayPlayerCards)) return false;

  const homePlayerCards = match.homePlayerCards.reduce((sum, entry) => ({ yellow: sum.yellow + entry.yellow, red: sum.red + entry.red }), { yellow: 0, red: 0 });
  const awayPlayerCards = match.awayPlayerCards.reduce((sum, entry) => ({ yellow: sum.yellow + entry.yellow, red: sum.red + entry.red }), { yellow: 0, red: 0 });
  if (match.homePlayerCards.length > 0 && (homePlayerCards.yellow !== match.homeCards.yellow || homePlayerCards.red !== match.homeCards.red)) return false;
  if (match.awayPlayerCards.length > 0 && (awayPlayerCards.yellow !== match.awayCards.yellow || awayPlayerCards.red !== match.awayCards.red)) return false;
  return true;
}

export function isValidState(value) {
  const teamsA = value?.config?.teamsA;
  const teamsB = value?.config?.teamsB;
  if (!value || typeof value !== 'object' || value.version !== 1 || !value.config || typeof value.config !== 'object') return false;
  if (typeof value.config.playerA !== 'string' || typeof value.config.playerB !== 'string') return false;
  if (!Array.isArray(teamsA) || !Array.isArray(teamsB) || teamsA.length === 0 || teamsA.length !== teamsB.length) return false;
  if (![...teamsA, ...teamsB].every((team) => typeof team === 'string' && team.trim())) return false;
  const allTeams = [...teamsA, ...teamsB];
  if (new Set(allTeams).size !== allTeams.length) return false;
  if (!Number.isInteger(value.config.matchesPerPair) || value.config.matchesPerPair < 2 || value.config.matchesPerPair % 2 !== 0) return false;
  if (!Array.isArray(value.matches)) return false;
  const allowedTeams = new Set(allTeams);
  if (!value.matches.every((match) => isValidMatch(match, allowedTeams))) return false;
  const ids = value.matches.map((match) => match.id);
  if (new Set(ids).size !== ids.length) return false;
  if (value.awards !== undefined && (!value.awards || typeof value.awards !== 'object' ||
    validateAwardSettings(normalizeAwardSettings(value.awards), allTeams, { requireSelection: false }) !== null)) return false;
  return true;
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = normalizeState(JSON.parse(raw));
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  const snapshot = clone(state);
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(snapshot));
    saveState.lastPersisted = true;
    saveState.lastError = null;
  } catch {
    saveState.lastPersisted = false;
    saveState.lastError = '浏览器存储失败，本次修改仅保留在当前页面，请立即导出备份。';
  }
  return snapshot;
}

saveState.lastPersisted = true;
saveState.lastError = null;

export function clearState() {
  try {
    window.localStorage.removeItem(STATE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function updateMatch(state, matchId, updater) {
  return {
    ...state,
    matches: state.matches.map((match) => match.id === matchId ? updater(clone(match)) : match),
  };
}

export function updateAwards(state, awards) {
  return { ...state, awards: clone(awards) };
}

export function serializeState(state) {
  return JSON.stringify(state, null, 2);
}

export function parseBackup(text) {
  try {
    const parsed = normalizeState(JSON.parse(text));
    if (!isValidState(parsed)) return { state: null, error: '备份文件无效：数据结构不匹配、内容损坏或版本不兼容' };
    return { state: parsed, error: null };
  } catch {
    return { state: null, error: '无法读取备份文件：不是有效的 JSON 格式' };
  }
}
