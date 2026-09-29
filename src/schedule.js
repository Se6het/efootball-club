import { normalizeAwardSettings } from './awards.js';
import { canonicalTeamName } from './teams.js';

const STATE_KEY = 'efootball-league:club:v1';
const MAX_TEAMS_PER_SIDE = 20;
const MAX_MATCHES_PER_PAIR = 20;

function normalizeName(name) {
  return String(name ?? '').trim();
}

function createRng(seed = Math.random()) {
  if (typeof seed === 'function') return seed;
  let value = Number.isFinite(Number(seed)) ? Number(seed) >>> 0 : Math.floor(Math.random() * 0xffffffff);
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function validateSetup({ teamsA, teamsB, matchesPerPair }) {
  const listA = (teamsA ?? []).map((team) => canonicalTeamName(normalizeName(team))).filter(Boolean);
  const listB = (teamsB ?? []).map((team) => canonicalTeamName(normalizeName(team))).filter(Boolean);
  const x = listA.length;
  const y = Number(matchesPerPair);

  if (x === 0 || listB.length === 0) return '请为玩家A和玩家B各填写至少一支俱乐部';
  if (x !== listB.length) return '玩家A和玩家B的俱乐部数量必须相同';
  if (x > MAX_TEAMS_PER_SIDE) return `每位玩家最多选择 ${MAX_TEAMS_PER_SIDE} 支俱乐部`;
  if (new Set(listA).size !== listA.length || new Set(listB).size !== listB.length) return '每位玩家选择的俱乐部不能重复';
  if (listA.some((team) => listB.includes(team))) return '玩家A和玩家B不能选择相同的俱乐部';
  if (!Number.isInteger(y) || y < 2 || y > MAX_MATCHES_PER_PAIR || y % 2 !== 0) {
    return `每对球队的比赛场数 y 必须是 2-${MAX_MATCHES_PER_PAIR} 的偶数`;
  }
  return null;
}

function createBaseHalf(teamsA, teamsB, appearancesPerPair, half, random) {
  const size = teamsA.length;
  const rounds = Array.from({ length: size * appearancesPerPair }, () => []);
  const teamAIndex = new Map(teamsA.map((team, index) => [team, index]));
  const teamBIndex = new Map(teamsB.map((team, index) => [team, index]));

  for (let appearance = 0; appearance < appearancesPerPair; appearance += 1) {
    const orderA = shuffle(teamsA, random);
    const orderB = shuffle(teamsB, random);
    const offsets = shuffle(Array.from({ length: size }, (_, index) => index), random);
    for (let round = 0; round < size; round += 1) {
      for (let index = 0; index < size; index += 1) {
        const teamA = orderA[index];
        const teamB = orderB[(index + offsets[round]) % size];
        const occurrence = half * appearancesPerPair + appearance;
        const pairParity = teamAIndex.get(teamA) + teamBIndex.get(teamB) + occurrence;
        const homeA = pairParity % 2 === 0;
        rounds[appearance * size + round].push({
          homeTeam: homeA ? teamA : teamB,
          awayTeam: homeA ? teamB : teamA,
        });
      }
    }
  }
  return rounds;
}

function spreadHalf(baseRounds, random, roundsPerAppearance) {
  if (roundsPerAppearance === 1) return baseRounds.map((round) => shuffle(round, random));

  const result = [];
  for (let start = 0; start < baseRounds.length; start += roundsPerAppearance) {
    const appearanceRounds = baseRounds.slice(start, start + roundsPerAppearance).map((round) => shuffle(round, random));
    const splitIndex = Math.floor(random() * appearanceRounds.length);
    const splitRound = appearanceRounds.splice(splitIndex, 1)[0];
    const cut = Math.max(1, Math.min(splitRound.length - 1, Math.floor(splitRound.length / 2)));
    const splitPair = [splitRound.slice(0, cut), splitRound.slice(cut)];
    const insertAt = Math.floor(random() * (appearanceRounds.length + 1));
    appearanceRounds.splice(insertAt, 0, ...splitPair);
    result.push(...appearanceRounds);
  }
  return result;
}

export function generateSchedule({ teamsA, teamsB, matchesPerPair, seed }) {
  const random = createRng(seed);
  const appearancesPerHalf = matchesPerPair / 2;
  const scheduledRounds = [];
  for (let half = 0; half < 2; half += 1) {
    const base = createBaseHalf(teamsA, teamsB, appearancesPerHalf, half, random);
    scheduledRounds.push(...spreadHalf(base, random, teamsA.length));
  }

  const matches = [];
  let matchNumber = 1;
  scheduledRounds.forEach((fixtures, roundIndex) => {
    for (const fixture of fixtures) {
      matches.push({
        id: `m-${matchNumber}`,
        matchNumber,
        round: roundIndex + 1,
        ...fixture,
        isPlayed: false,
        homeGoals: 0,
        awayGoals: 0,
        homeCards: { yellow: 0, red: 0 },
        awayCards: { yellow: 0, red: 0 },
        homePlayerCards: [],
        awayPlayerCards: [],
        homeScorers: [],
        awayScorers: [],
        homeAssists: [],
        awayAssists: [],
      });
      matchNumber += 1;
    }
  });
  return matches;
}

export function createInitialState(config) {
  const createdAt = new Date().toISOString();
  const teamsA = config.teamsA.map((team) => canonicalTeamName(normalizeName(team)));
  const teamsB = config.teamsB.map((team) => canonicalTeamName(normalizeName(team)));
  const matches = generateSchedule({ teamsA, teamsB, matchesPerPair: config.matchesPerPair, seed: config.scheduleSeed });
  const awards = normalizeAwardSettings(config.awards ?? {});
  return {
    version: 1,
    createdAt,
    config: { playerA: config.playerA, playerB: config.playerB, teamsA, teamsB, matchesPerPair: config.matchesPerPair },
    awards,
    matches,
  };
}

export { STATE_KEY, MAX_TEAMS_PER_SIDE, MAX_MATCHES_PER_PAIR };
