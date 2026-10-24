// 教练档案（「足球世界」）：把每个赛季冻结成一份存档，再跨档统计教练荣誉与交手记录。
// 这里只放纯逻辑——存储读写、归档快照、统计；DOM 渲染都在 src/views/archive.js。
//
// 设计取舍：教练以「名字」为身份（本档就两位教练，跨档同名即视为同一位教练）。
// 这样「从未交手」有一个干净的定义：两位教练从未出现在同一个档里。

import { buildAwardSummary, isSeasonFinished } from './awards.js';
import { computePlayerStats } from './leaders.js';
import { rankTeams } from './standings.js';

const WORLD_KEY = 'efootball-league:world:v1';

function textOf(value) {
  return String(value ?? '').trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isInteger(value) {
  return Number.isInteger(value);
}

function isNonNegative(value) {
  return Number.isInteger(value) && value >= 0;
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function byName(left, right) {
  return left.localeCompare(right, 'zh-Hans-CN');
}

// 赛季 id：时间戳 + 自增序号，导入导出时用来去重。
let seasonCounter = 0;
export function makeSeasonId(now = Date.now()) {
  seasonCounter += 1;
  return `s-${Number(now).toString(36)}-${seasonCounter.toString(36)}`;
}

export function emptyWorld() {
  return { version: 1, seasons: [] };
}

export function normalizeWorld(value) {
  if (Array.isArray(value)) return { version: 1, seasons: value };
  if (!value || typeof value !== 'object') return emptyWorld();
  return { version: 1, seasons: Array.isArray(value.seasons) ? value.seasons : [] };
}

function validStandingRow(row) {
  return Boolean(row) && typeof row === 'object' &&
    isText(row.team) && typeof row.coach === 'string' &&
    [row.rank, row.played, row.wins, row.draws, row.losses, row.goalsFor, row.goalsAgainst].every(isNonNegative) &&
    isInteger(row.goalDifference) && isNonNegative(row.points) &&
    typeof row.needsPlayoff === 'boolean';
}

function validPodium(entry) {
  return Boolean(entry) && typeof entry === 'object' &&
    isText(entry.team) && typeof entry.coach === 'string' &&
    isNonNegative(entry.rank) && typeof entry.needsPlayoff === 'boolean';
}

function validWinner(entry, field) {
  return Boolean(entry) && typeof entry === 'object' &&
    isText(entry.name) && isText(entry.team) && typeof entry.coach === 'string' && isNonNegative(entry[field]);
}

function validAwards(awards) {
  if (!awards || typeof awards !== 'object') return false;
  const { champion, podium, topScorers, topAssists, fmvp } = awards;
  if (champion !== null && !validPodium(champion)) return false;
  if (!Array.isArray(podium) || !podium.every(validPodium)) return false;
  if (!Array.isArray(topScorers) || !topScorers.every((entry) => validWinner(entry, 'goals'))) return false;
  if (!Array.isArray(topAssists) || !topAssists.every((entry) => validWinner(entry, 'assists'))) return false;
  if (fmvp !== null && !(fmvp && isText(fmvp.name) && isText(fmvp.team) && typeof fmvp.coach === 'string')) return false;
  return true;
}

function validH2H(h2h) {
  if (!h2h || typeof h2h !== 'object') return false;
  if (![h2h.played, h2h.winsA, h2h.draws, h2h.winsB, h2h.goalsA, h2h.goalsB].every(isNonNegative)) return false;
  const margin = h2h.biggestMargin;
  if (margin !== null && !(margin && isInteger(margin.diff) && typeof margin.score === 'string' && typeof margin.coach === 'string')) {
    return false;
  }
  return true;
}

export function isValidSeason(season) {
  if (!season || typeof season !== 'object') return false;
  if (!isText(season.id) || !isText(season.label) || typeof season.archivedAt !== 'string' || typeof season.complete !== 'boolean') return false;
  if (season.sourceId !== undefined && typeof season.sourceId !== 'string') return false;
  if (!Array.isArray(season.coaches) || season.coaches.length !== 2 || !season.coaches.every(isText)) return false;
  if (!isNonNegative(season.playedMatches) || !isNonNegative(season.totalMatches)) return false;
  if (!Array.isArray(season.standings) || !season.standings.every(validStandingRow)) return false;
  if (!validAwards(season.awards)) return false;
  if (!validH2H(season.h2h)) return false;
  return true;
}

// 单个赛季被包成「世界档案」时也能识别：有 id + coaches 就当时一档存档处理。
export function isValidWorld(value) {
  const { seasons } = normalizeWorld(value);
  return seasons.every(isValidSeason);
}

export function loadWorld() {
  try {
    const raw = window.localStorage.getItem(WORLD_KEY);
    if (!raw) return emptyWorld();
    const parsed = normalizeWorld(JSON.parse(raw));
    return { version: 1, seasons: parsed.seasons.filter(isValidSeason) };
  } catch {
    return emptyWorld();
  }
}

export function saveWorld(world) {
  const snapshot = { version: 1, seasons: normalizeWorld(world).seasons.map(clone) };
  try {
    window.localStorage.setItem(WORLD_KEY, JSON.stringify(snapshot));
    saveWorld.lastPersisted = true;
    saveWorld.lastError = null;
  } catch {
    saveWorld.lastPersisted = false;
    saveWorld.lastError = '浏览器存储失败，世界档案未能保存，请立即导出。';
  }
  return snapshot;
}

saveWorld.lastPersisted = true;
saveWorld.lastError = null;

// 归档：同一个存档（sourceId 相同）重复归档时替换旧记录，避免出现重复档。
export function addSeason(world, season) {
  const base = normalizeWorld(world);
  if (!isValidSeason(season)) return { world: base, added: false, replaced: false };
  const sourceId = textOf(season.sourceId);
  const hit = sourceId ? base.seasons.find((item) => textOf(item.sourceId) === sourceId) : null;
  if (hit) {
    return {
      world: { version: 1, seasons: base.seasons.map((item) => (item === hit ? season : item)) },
      added: true,
      replaced: true,
    };
  }
  if (base.seasons.some((item) => item.id === season.id)) return { world: base, added: false, replaced: false };
  return { world: { version: 1, seasons: [...base.seasons, season] }, added: true, replaced: false };
}

export function removeSeason(world, seasonId) {
  const base = normalizeWorld(world);
  return { version: 1, seasons: base.seasons.filter((item) => item.id !== seasonId) };
}

export function mergeSeasons(world, incoming) {
  const base = normalizeWorld(world);
  const ids = new Set(base.seasons.map((item) => item.id));
  const added = [];
  for (const season of Array.isArray(incoming) ? incoming : []) {
    if (!isValidSeason(season) || ids.has(season.id)) continue;
    ids.add(season.id);
    added.push(season);
  }
  return { world: { version: 1, seasons: [...base.seasons, ...added] }, added: added.length };
}

export function parseWorldBackup(text) {
  try {
    const parsed = JSON.parse(text);
    const seasons = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.seasons)
        ? parsed.seasons
        : (parsed && parsed.id && Array.isArray(parsed.coaches) ? [parsed] : null);
    if (!seasons) return { seasons: null, error: '档案文件无效：既不是世界档案，也不是单个赛季存档' };
    const valid = seasons.filter(isValidSeason);
    if (valid.length === 0) return { seasons: null, error: '档案文件无效：没有可用的赛季记录（可能已损坏或版本不兼容）' };
    return { seasons: valid, error: null };
  } catch {
    return { seasons: null, error: '无法读取档案文件：不是有效的 JSON 格式' };
  }
}

export function sortSeasons(seasons) {
  return [...(Array.isArray(seasons) ? seasons : [])].sort(
    (left, right) => String(left.archivedAt).localeCompare(String(right.archivedAt)) || String(left.id).localeCompare(String(right.id))
  );
}

export function previousCoaches(world) {
  const names = new Set();
  for (const season of normalizeWorld(world).seasons) {
    for (const name of season.coaches) if (isText(name)) names.add(name);
  }
  return [...names].sort(byName);
}

export function worldStats(world) {
  const seasons = normalizeWorld(world).seasons;
  const names = new Set();
  let matches = 0;
  for (const season of seasons) {
    for (const name of season.coaches) if (isText(name)) names.add(name);
    matches += season.playedMatches;
  }
  return { seasons: seasons.length, coaches: names.size, matches };
}

// 把当前赛季冻结成一份存档快照。只存渲染与统计需要的字段，不再依赖原始逐场数据。
export function buildSeasonRecord(state, options = {}) {
  if (!state || !state.config || !Array.isArray(state.matches)) return null;

  const config = state.config;
  const coachA = textOf(config.playerA) || '玩家A';
  const coachB = textOf(config.playerB) || '玩家B';
  const label = textOf(options.label) || `${coachA} vs ${coachB}`;
  const id = textOf(options.id) || makeSeasonId();
  const archivedAt = textOf(options.archivedAt) || new Date().toISOString();
  const complete = isSeasonFinished(state.matches);

  const rankedTeams = rankTeams(config, state.matches);
  const playerStats = computePlayerStats(state.matches);
  const summary = buildAwardSummary(state.awards ?? {}, { rankedTeams, playerStats });

  const coachOf = new Map();
  for (const team of config.teamsA) coachOf.set(team, coachA);
  for (const team of config.teamsB) coachOf.set(team, coachB);
  const homeIsA = new Set(config.teamsA);

  const standings = rankedTeams.map((item) => ({
    team: item.team,
    coach: coachOf.get(item.team) ?? '',
    rank: item.rank,
    needsPlayoff: Boolean(item.needsPlayoff),
    played: item.played,
    wins: item.wins,
    draws: item.draws,
    losses: item.losses,
    goalsFor: item.goalsFor,
    goalsAgainst: item.goalsAgainst,
    goalDifference: item.goalDifference,
    points: item.points,
  }));

  const podium = complete
    ? rankedTeams.slice(0, 3).map((item) => ({
        rank: item.rank,
        team: item.team,
        coach: coachOf.get(item.team) ?? '',
        needsPlayoff: Boolean(item.needsPlayoff),
      }))
    : [];

  const championRow = podium.find((entry) => entry.rank === 1);
  // 赛季没打完时名次只是临时领先，不写成荣誉；needsPlayoff 表示名次仍需加赛，也不颁冠军。
  const champion = championRow && !championRow.needsPlayoff ? championRow : null;

  const topScorers = complete ? (summary.topScorer.winners ?? []).map((winner) => ({
    name: winner.name,
    team: winner.team,
    coach: coachOf.get(winner.team) ?? '',
    goals: winner.goals,
  })) : [];
  const topAssists = complete ? (summary.topAssist.winners ?? []).map((winner) => ({
    name: winner.name,
    team: winner.team,
    coach: coachOf.get(winner.team) ?? '',
    assists: winner.assists,
  })) : [];
  const fmvpName = textOf(state.awards?.fmvpPlayerName);
  const fmvpTeam = textOf(state.awards?.fmvpTeam);
  const fmvp = complete && fmvpName && fmvpTeam ? { name: fmvpName, team: fmvpTeam, coach: coachOf.get(fmvpTeam) ?? '' } : null;

  // 本档每一场已结算的比赛都是教练 A vs 教练 B，直接汇总成教练层面交手。
  const h2h = { played: 0, winsA: 0, draws: 0, winsB: 0, goalsA: 0, goalsB: 0, biggestMargin: null };
  for (const match of state.matches) {
    if (!match.isPlayed) continue;
    const homeA = homeIsA.has(match.homeTeam);
    const squadA = homeA ? match.homeTeam : match.awayTeam;
    const squadB = homeA ? match.awayTeam : match.homeTeam;
    const goalsA = homeA ? match.homeGoals : match.awayGoals;
    const goalsB = homeA ? match.awayGoals : match.homeGoals;
    h2h.played += 1;
    h2h.goalsA += goalsA;
    h2h.goalsB += goalsB;
    if (goalsA > goalsB) h2h.winsA += 1;
    else if (goalsA < goalsB) h2h.winsB += 1;
    else h2h.draws += 1;

    const diff = goalsA - goalsB;
    if (diff !== 0 && (h2h.biggestMargin === null || Math.abs(diff) > Math.abs(h2h.biggestMargin.diff))) {
      h2h.biggestMargin = {
        diff,
        score: `${match.homeGoals}:${match.awayGoals}`,
        coach: diff > 0 ? coachA : coachB,
        winner: diff > 0 ? squadA : squadB,
        loser: diff > 0 ? squadB : squadA,
      };
    }
  }

  return {
    id,
    // 指向产生这份存档的那个赛季（沿用 state.createdAt），重复归档时用它替换旧记录。
    sourceId: textOf(state.createdAt) || id,
    label,
    archivedAt,
    complete,
    coaches: [coachA, coachB],
    playedMatches: state.matches.filter((match) => match.isPlayed).length,
    totalMatches: state.matches.length,
    standings,
    awards: { champion, podium, topScorers, topAssists, fmvp },
    h2h,
  };
}

function emptyProfile(name) {
  return {
    name,
    seasons: 0,
    completeSeasons: 0,
    matches: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    pointsFor: 0,
    clubs: new Map(),
    titles: [],
    runnerUps: [],
    thirds: [],
    sweeps: [],
    goldenBoots: [],
    assistCrowns: [],
    fmvps: [],
    bestFinish: null,
    worstFinish: null,
    lastPlaces: 0,
    seasonOrder: [],
    seasonEntries: [],
    titleSeasonIds: new Set(),
    firstTitle: null,
    titleDrought: 0,
    rivals: [],
    neverFaced: [],
    biggestWin: null,
    biggestLoss: null,
  };
}

function decorate(profile) {
  profile.titlesCount = profile.titles.length;
  profile.runnerUpCount = profile.runnerUps.length;
  profile.thirdCount = profile.thirds.length;
  profile.sweepCount = profile.sweeps.length;
  profile.goldenBootCount = profile.goldenBoots.length;
  profile.assistCrownCount = profile.assistCrowns.length;
  profile.fmvpCount = profile.fmvps.length;
  profile.honorCount = profile.titlesCount + profile.runnerUpCount + profile.thirdCount +
    profile.goldenBootCount + profile.assistCrownCount + profile.fmvpCount + profile.sweepCount;
  profile.winRate = profile.matches > 0 ? profile.wins / profile.matches : 0;
  profile.goalDifference = profile.goalsFor - profile.goalsAgainst;
  profile.pointsPerGame = profile.matches > 0 ? profile.pointsFor / profile.matches : 0;
  profile.goalsForPerGame = profile.matches > 0 ? profile.goalsFor / profile.matches : 0;
  profile.goalsAgainstPerGame = profile.matches > 0 ? profile.goalsAgainst / profile.matches : 0;
  profile.titleRate = profile.completeSeasons > 0 ? profile.titlesCount / profile.completeSeasons : 0;
  profile.clubList = [...profile.clubs.entries()]
    .map(([team, count]) => ({ team, count }))
    .sort((left, right) => right.count - left.count || byName(left.team, right.team));
  profile.clubCount = profile.clubList.length;
  profile.clubSeasons = profile.clubList.reduce((max, item) => Math.max(max, item.count), 0);
  if (profile.titles.length > 0) {
    const lastTitleId = profile.titles[profile.titles.length - 1].seasonId;
    const index = profile.seasonOrder.lastIndexOf(lastTitleId);
    profile.titleDrought = index >= 0 ? profile.seasonOrder.length - 1 - index : 0;
  } else {
    profile.titleDrought = profile.seasons;
  }
  return profile;
}

function buildFacts(profiles, pairs, stats, firstChampion) {
  const facts = [];

  if (firstChampion) {
    facts.push({
      id: 'fact-first-champion',
      icon: '👑',
      title: `世界里的首位冠军：${firstChampion.coach}`,
      detail: `${firstChampion.label} 带 ${firstChampion.team} 首个捧杯。`,
    });
  }

  const crownless = profiles
    .filter((profile) => profile.titlesCount === 0 && profile.seasons >= 2)
    .sort((left, right) => right.seasons - left.seasons || byName(left.name, right.name))[0];
  if (crownless) {
    facts.push({
      id: 'fact-crownless',
      icon: '🫅',
      title: `无冕之王：${crownless.name}`,
      detail: `已经在世界里征战 ${crownless.seasons} 个赛季（${crownless.matches} 场 ${crownless.wins} 胜），却还没拿过一次冠军。`,
    });
  }

  const mostRunnerUp = profiles
    .filter((profile) => profile.runnerUpCount > 0)
    .sort((left, right) => right.runnerUpCount - left.runnerUpCount || byName(left.name, right.name))[0];
  if (mostRunnerUp && mostRunnerUp.runnerUpCount >= 2) {
    facts.push({
      id: 'fact-runnerup',
      icon: '🥈',
      title: `最多次亚军：${mostRunnerUp.name}`,
      detail: `一共 ${mostRunnerUp.runnerUpCount} 次与冠军擦肩而过。`,
    });
  }

  const mostLast = profiles
    .filter((profile) => profile.lastPlaces > 0)
    .sort((left, right) => right.lastPlaces - left.lastPlaces || byName(left.name, right.name))[0];
  if (mostLast && mostLast.lastPlaces >= 2) {
    facts.push({
      id: 'fact-lastplace',
      icon: '🐌',
      title: `垫底常客：${mostLast.name}`,
      detail: `已经 ${mostLast.lastPlaces} 次在赛季末排在末位。`,
    });
  }

  const mostClubs = profiles
    .filter((profile) => profile.clubCount >= 2)
    .sort((left, right) => right.clubCount - left.clubCount || byName(left.name, right.name))[0];
  if (mostClubs) {
    facts.push({
      id: 'fact-clubs',
      icon: '🧳',
      title: `执教俱乐部最多：${mostClubs.name}`,
      detail: `先后执教过 ${mostClubs.clubCount} 支俱乐部：${mostClubs.clubList.map((item) => item.team).join('、')}。`,
    });
  }

  const loyal = profiles
    .filter((profile) => profile.clubSeasons >= 2)
    .sort((left, right) => right.clubSeasons - left.clubSeasons || byName(left.name, right.name))[0];
  if (loyal) {
    const club = loyal.clubList[0];
    facts.push({
      id: 'fact-loyal',
      icon: '🏠',
      title: `最忠诚：${loyal.name}`,
      detail: `在 ${club.team} 一待就是 ${club.count} 个赛季。`,
    });
  }

  const busiest = [...pairs].sort((left, right) => right.played - left.played || byName(left.a, right.a))[0];
  if (busiest && busiest.played > 0) {
    facts.push({
      id: 'fact-rivalry',
      icon: '⚔️',
      title: `宿敌：${busiest.a} 与 ${busiest.b}`,
      detail: `世界里交手最多的一对，共 ${busiest.played} 场（${busiest.a} ${busiest.winsA} 胜 ${busiest.draws} 平 ${busiest.winsB} 负）。`,
    });
  }

  const lopsided = [...pairs]
    .filter((pair) => pair.played >= 3 && (pair.winsA === 0 || pair.winsB === 0))
    .sort((left, right) => right.played - left.played || byName(left.a, right.a))[0];
  if (lopsided && !(lopsided.winsA === 0 && lopsided.winsB === 0)) {
    const winner = lopsided.winsA > 0 ? lopsided.a : lopsided.b;
    const loser = lopsided.winsA > 0 ? lopsided.b : lopsided.a;
    const won = Math.max(lopsided.winsA, lopsided.winsB);
    facts.push({
      id: 'fact-lopsided',
      icon: '🪨',
      title: `全面压制：${winner} → ${loser}`,
      detail: `${lopsided.played} 次交锋 ${winner} 拿下 ${won} 胜，对手一场没赢。`,
    });
  }

  if (stats.seasons > 0) {
    facts.push({
      id: 'fact-scale',
      icon: '🌍',
      title: '世界版图',
      detail: `至今 ${stats.seasons} 个赛季、${stats.coaches} 位教练、${stats.matches} 场已结算比赛。`,
    });
  }

  const mostTitles = profiles
    .filter((profile) => profile.titlesCount >= 2)
    .sort((left, right) => right.titlesCount - left.titlesCount || byName(left.name, right.name))[0];
  if (mostTitles) {
    facts.push({
      id: 'fact-king',
      icon: '🏆',
      title: `夺冠最多：${mostTitles.name}`,
      detail: `已经 ${mostTitles.titlesCount} 次带队登顶，夺冠率 ${Math.round(mostTitles.titleRate * 100)}%。`,
    });
  }

  const sharpest = profiles
    .filter((profile) => profile.matches >= 4)
    .sort((left, right) => right.winRate - left.winRate || right.matches - left.matches || byName(left.name, right.name))[0];
  if (sharpest && sharpest.winRate > 0) {
    facts.push({
      id: 'fact-winrate',
      icon: '📈',
      title: `胜率之王：${sharpest.name}`,
      detail: `${sharpest.matches} 场拿下 ${sharpest.wins} 胜，胜率 ${Math.round(sharpest.winRate * 100)}%。`,
    });
  }

  const firepower = profiles
    .filter((profile) => profile.matches >= 4)
    .sort((left, right) => right.goalsForPerGame - left.goalsForPerGame || byName(left.name, right.name))[0];
  if (firepower && firepower.goalsForPerGame >= 2) {
    facts.push({
      id: 'fact-firepower',
      icon: '🔥',
      title: `火力最猛：${firepower.name}`,
      detail: `场均打进 ${firepower.goalsForPerGame.toFixed(1)} 球，是世界里最锋利的进攻。`,
    });
  }

  const fortress = profiles
    .filter((profile) => profile.matches >= 4)
    .sort((left, right) => left.goalsAgainstPerGame - right.goalsAgainstPerGame || right.matches - left.matches || byName(left.name, right.name))[0];
  if (fortress) {
    facts.push({
      id: 'fact-fortress',
      icon: '🛡️',
      title: `防守最稳：${fortress.name}`,
      detail: `场均只丢 ${fortress.goalsAgainstPerGame.toFixed(1)} 球，是最难攻破的防线。`,
    });
  }

  const blowout = profiles
    .filter((profile) => profile.biggestWin)
    .sort((left, right) => right.biggestWin.margin - left.biggestWin.margin || byName(left.name, right.name))[0];
  if (blowout) {
    facts.push({
      id: 'fact-blowout',
      icon: '💥',
      title: `最大屠杀：${blowout.name}`,
      detail: `最酣畅的一战 ${blowout.biggestWin.score}，净胜 ${blowout.biggestWin.margin} 球（${blowout.biggestWin.club}）。`,
    });
  }

  const crushed = profiles
    .filter((profile) => profile.biggestLoss)
    .sort((left, right) => right.biggestLoss.margin - left.biggestLoss.margin || byName(left.name, right.name))[0];
  if (crushed) {
    facts.push({
      id: 'fact-crushed',
      icon: '🩹',
      title: `最惨失利：${crushed.name}`,
      detail: `曾以 ${crushed.biggestLoss.score} 吞下败仗，净负 ${crushed.biggestLoss.margin} 球（${crushed.biggestLoss.club}）。`,
    });
  }

  const totalGoals = profiles.reduce((sum, profile) => sum + profile.goalsFor, 0);
  if (stats.matches > 0) {
    facts.push({
      id: 'fact-goals',
      icon: '🥅',
      title: '世界总进球',
      detail: `至今一共打进了 ${totalGoals} 球，平均每场 ${(totalGoals / stats.matches).toFixed(1)} 球。`,
    });
  }

  return facts;
}

// 跨档统计：每位教练的荣誉/交手/杂项，以及世界之最。
export function computeCoachRecords(world) {
  const seasons = sortSeasons(normalizeWorld(world).seasons);
  const annotated = seasons.map((season, index) => ({ ...season, ordinal: index + 1 }));

  const profiles = new Map();
  const pairs = new Map();
  const names = new Set();
  for (const season of annotated) {
    for (const name of season.coaches) if (isText(name)) names.add(name);
  }
  for (const name of names) profiles.set(name, emptyProfile(name));

  let firstChampion = null;

  for (const season of annotated) {
    const [first, second] = season.coaches;
    const seasonLabel = `第 ${season.ordinal} 赛季`;

    for (const name of season.coaches) {
      const profile = profiles.get(name);
      if (!profile) continue;
      profile.seasons += 1;
      if (season.complete) profile.completeSeasons += 1;
      profile.seasonOrder.push(season.id);
    }

    for (const row of season.standings) {
      const profile = profiles.get(row.coach);
      if (!profile) continue;
      profile.matches += row.played;
      profile.wins += row.wins;
      profile.draws += row.draws;
      profile.losses += row.losses;
      profile.goalsFor += row.goalsFor;
      profile.goalsAgainst += row.goalsAgainst;
      profile.pointsFor += row.points;
      profile.clubs.set(row.team, (profile.clubs.get(row.team) ?? 0) + 1);
      if (season.complete) {
        profile.bestFinish = profile.bestFinish === null ? row.rank : Math.min(profile.bestFinish, row.rank);
        profile.worstFinish = profile.worstFinish === null ? row.rank : Math.max(profile.worstFinish, row.rank);
        if (row.rank === season.standings.length) profile.lastPlaces += 1;
      }
    }

    // 每位教练在本赛季的履历：带了哪些队，每支队拿了什么荣誉。
    // 荣誉按「队」归属，赛季多了也能一眼看清谁带过哪些队、带哪支队上过台。
    const teamsByCoach = new Map();
    for (const row of season.standings) {
      if (!isText(row.coach)) continue;
      if (!teamsByCoach.has(row.coach)) teamsByCoach.set(row.coach, []);
      teamsByCoach.get(row.coach).push(row);
    }
    const seasonChampion = season.complete && season.awards.champion ? season.awards.champion.coach : null;
    const championTeam = season.complete && season.awards.champion ? season.awards.champion.team : null;
    const runnerUpTeam = season.complete ? season.awards.podium.find((entry) => entry.rank === 2)?.team ?? null : null;
    const thirdTeam = season.complete ? season.awards.podium.find((entry) => entry.rank === 3)?.team ?? null : null;
    const goldenBootTeams = new Set(season.awards.topScorers.map((entry) => entry.team));
    const assistCrownTeams = new Set(season.awards.topAssists.map((entry) => entry.team));
    const fmvpTeam = season.complete && season.awards.fmvp ? season.awards.fmvp.team : null;
    for (const name of season.coaches) {
      const profile = profiles.get(name);
      if (!profile) continue;
      const rows = (teamsByCoach.get(name) ?? []).slice().sort((left, right) => left.rank - right.rank);
      profile.seasonEntries.push({
        seasonId: season.id,
        ordinal: season.ordinal,
        seasonLabel,
        complete: season.complete,
        teams: rows.map((item) => item.team),
        ranks: rows.map((item) => item.rank),
        bestRank: season.complete && rows.length > 0 ? rows[0].rank : null,
        champion: seasonChampion === name,
        teamRows: rows.map((item) => ({
          team: item.team,
          rank: item.rank,
          champion: item.team === championTeam,
          runnerUp: item.team === runnerUpTeam,
          third: item.team === thirdTeam,
          goldenBoot: goldenBootTeams.has(item.team),
          assistCrown: assistCrownTeams.has(item.team),
          fmvp: item.team === fmvpTeam,
        })),
      });
    }

    // 荣誉只在「赛季已结束」时结算，尽量避开半截赛季的临时名次。
    if (season.complete) {
      const champion = season.awards.champion;
      if (champion) {
        const profile = profiles.get(champion.coach);
        if (profile) {
          profile.titles.push({ seasonId: season.id, seasonLabel, team: champion.team });
          profile.titleSeasonIds.add(season.id);
          if (!profile.firstTitle) profile.firstTitle = { seasonId: season.id, seasonLabel, team: champion.team };
        }
        if (!firstChampion) firstChampion = { coach: champion.coach, team: champion.team, label: seasonLabel };
      }

      for (const entry of season.awards.podium) {
        const profile = profiles.get(entry.coach);
        if (!profile) continue;
        if (entry.rank === 2) profile.runnerUps.push({ seasonId: season.id, seasonLabel, team: entry.team });
        if (entry.rank === 3) profile.thirds.push({ seasonId: season.id, seasonLabel, team: entry.team });
      }

      const podiumCoaches = season.awards.podium.map((entry) => entry.coach);
      if (season.awards.podium.length === 3 && new Set(podiumCoaches).size === 1) {
        const profile = profiles.get(podiumCoaches[0]);
        if (profile) {
          profile.sweeps.push({ seasonId: season.id, seasonLabel, teams: season.awards.podium.map((entry) => entry.team) });
        }
      }

      for (const winner of season.awards.topScorers) {
        const profile = profiles.get(winner.coach);
        if (profile) profile.goldenBoots.push({ seasonId: season.id, seasonLabel, player: winner.name, team: winner.team, goals: winner.goals });
      }
      for (const winner of season.awards.topAssists) {
        const profile = profiles.get(winner.coach);
        if (profile) profile.assistCrowns.push({ seasonId: season.id, seasonLabel, player: winner.name, team: winner.team, assists: winner.assists });
      }
      if (season.awards.fmvp) {
        const profile = profiles.get(season.awards.fmvp.coach);
        if (profile) {
          profile.fmvps.push({ seasonId: season.id, seasonLabel, player: season.awards.fmvp.name, team: season.awards.fmvp.team });
        }
      }
    }

    // 教练交手：本档所有已结算比赛都发生在两位教练之间。
    if (isText(first) && isText(second) && first !== second) {
      const [low, high] = first.localeCompare(second) <= 0 ? [first, second] : [second, first];
      const key = `${low}\u0000${high}`;
      if (!pairs.has(key)) {
        pairs.set(key, { a: low, b: high, seasonIds: [], played: 0, winsA: 0, draws: 0, winsB: 0, goalsA: 0, goalsB: 0, biggestMargin: null });
      }
      const pair = pairs.get(key);
      const forward = first === low;
      pair.seasonIds.push(season.id);
      pair.played += season.h2h.played;
      pair.winsA += forward ? season.h2h.winsA : season.h2h.winsB;
      pair.winsB += forward ? season.h2h.winsB : season.h2h.winsA;
      pair.draws += season.h2h.draws;
      pair.goalsA += forward ? season.h2h.goalsA : season.h2h.goalsB;
      pair.goalsB += forward ? season.h2h.goalsB : season.h2h.goalsA;

      const margin = season.h2h.biggestMargin;
      if (margin) {
        const diff = forward ? margin.diff : -margin.diff;
        if (!pair.biggestMargin || Math.abs(diff) > Math.abs(pair.biggestMargin.diff)) {
          pair.biggestMargin = { diff, score: margin.score, coach: diff > 0 ? low : high, winner: margin.winner, loser: margin.loser };
        }
      }
    }
  }

  // 交手记录拆回每位教练的视角。
  for (const pair of pairs.values()) {
    const left = profiles.get(pair.a);
    const right = profiles.get(pair.b);
    const marginForB = pair.biggestMargin
      ? { diff: -pair.biggestMargin.diff, score: pair.biggestMargin.score, coach: pair.biggestMargin.coach, winner: pair.biggestMargin.winner, loser: pair.biggestMargin.loser }
      : null;
    if (left) {
      left.rivals.push({
        name: pair.b, played: pair.played, wins: pair.winsA, draws: pair.draws, losses: pair.winsB,
        goalsFor: pair.goalsA, goalsAgainst: pair.goalsB, biggestMargin: pair.biggestMargin,
      });
    }
    if (right) {
      right.rivals.push({
        name: pair.a, played: pair.played, wins: pair.winsB, draws: pair.draws, losses: pair.winsA,
        goalsFor: pair.goalsB, goalsAgainst: pair.goalsA, biggestMargin: marginForB,
      });
    }

    if (pair.biggestMargin) {
      const { diff, score, winner, loser } = pair.biggestMargin;
      const winnerProfile = profiles.get(diff > 0 ? pair.a : pair.b);
      const loserProfile = profiles.get(diff > 0 ? pair.b : pair.a);
      const magnitude = Math.abs(diff);
      if (winnerProfile && (!winnerProfile.biggestWin || magnitude > winnerProfile.biggestWin.margin)) {
        winnerProfile.biggestWin = { margin: magnitude, score, opponent: loserProfile?.name ?? '', club: winner };
      }
      if (loserProfile && (!loserProfile.biggestLoss || magnitude > loserProfile.biggestLoss.margin)) {
        loserProfile.biggestLoss = { margin: magnitude, score, opponent: winnerProfile?.name ?? '', club: loser };
      }
    }
  }

  const list = [...profiles.values()];
  for (const profile of list) {
    profile.rivals.sort((left, right) => right.played - left.played || byName(left.name, right.name));
    profile.neverFaced = [...names].filter((name) => name !== profile.name && !profile.rivals.some((rival) => rival.name === name)).sort(byName);
    decorate(profile);
  }

  list.sort((left, right) =>
    right.titlesCount - left.titlesCount ||
    right.honorCount - left.honorCount ||
    right.matches - left.matches ||
    byName(left.name, right.name)
  );

  const pairList = [...pairs.values()].sort((left, right) => right.played - left.played || byName(left.a, right.a));
  const stats = worldStats({ version: 1, seasons: annotated });

  return {
    seasons: annotated,
    coaches: list,
    pairs: pairList,
    facts: buildFacts(list, pairList, stats, firstChampion),
    stats,
  };
}
