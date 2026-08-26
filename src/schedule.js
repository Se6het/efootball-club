import { normalizeAwardSettings } from './awards.js';
import { canonicalTeamName } from './teams.js';

const STATE_KEY = 'efootball-league:club:v1';

function normalizeName(name) {
  return String(name ?? '').trim();
}

export function validateSetup({ teamsA, teamsB, matchesPerPair }) {
  const listA = (teamsA ?? []).map(normalizeName).filter(Boolean);
  const listB = (teamsB ?? []).map(normalizeName).filter(Boolean);
  const x = listA.length;
  const y = Number(matchesPerPair);

  if (x === 0 || listB.length === 0) {
    return '请为玩家A和玩家B各填写至少一支俱乐部';
  }

  if (x !== listB.length) {
    return '玩家A和玩家B的俱乐部数量必须相同';
  }

  if (new Set(listA).size !== listA.length || new Set(listB).size !== listB.length) {
    return '每位玩家选择的俱乐部不能重复';
  }

  const overlap = listA.filter((team) => listB.includes(team));
  if (overlap.length > 0) {
    return '玩家A和玩家B不能选择相同的俱乐部';
  }

  if (!Number.isInteger(y) || y < 2 || y % 2 !== 0) {
    return '每对球队的比赛场数 y 必须是大于等于 2 的偶数';
  }

  return null;
}

export function generateSchedule({ teamsA, teamsB, matchesPerPair }) {
  const x = teamsA.length;
  const y = matchesPerPair;
  const matches = [];
  let matchNumber = 1;

  for (let leg = 0; leg < y; leg += 1) {
    for (let round = 0; round < x; round += 1) {
      for (let index = 0; index < x; index += 1) {
        const homeTeamA = teamsA[index];
        const awayTeamB = teamsB[(index + round) % x];
        const swap = (leg + round) % 2 === 1;
        const homeTeam = swap ? awayTeamB : homeTeamA;
        const awayTeam = swap ? homeTeamA : awayTeamB;

        matches.push({
          id: `m-${matchNumber}`,
          matchNumber,
          round: leg * x + round + 1,
          homeTeam,
          awayTeam,
          isPlayed: false,
          homeGoals: 0,
          awayGoals: 0,
          homeCards: { yellow: 0, red: 0 },
          awayCards: { yellow: 0, red: 0 },
          homeScorers: [],
          awayScorers: [],
          homeAssists: [],
          awayAssists: [],
        });
        matchNumber += 1;
      }
    }
  }

  return matches;
}

export function createInitialState(config) {
  const createdAt = new Date().toISOString();
  const teamsA = config.teamsA.map(canonicalTeamName);
  const teamsB = config.teamsB.map(canonicalTeamName);
  const matches = generateSchedule({
    teamsA,
    teamsB,
    matchesPerPair: config.matchesPerPair,
  });
  const awards = normalizeAwardSettings(config.awards ?? {});

  return {
    version: 1,
    createdAt,
    config: {
      playerA: config.playerA,
      playerB: config.playerB,
      teamsA,
      teamsB,
      matchesPerPair: config.matchesPerPair,
    },
    awards,
    matches,
  };
}

export { STATE_KEY };
