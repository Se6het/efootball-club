import { computePlayerStats } from './leaders.js';

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function sortByScorer(left, right) {
  return right.goals - left.goals || right.assists - left.assists || left.name.localeCompare(right.name, 'zh-Hans-CN');
}

function sortByAssister(left, right) {
  return right.assists - left.assists || right.goals - left.goals || left.name.localeCompare(right.name, 'zh-Hans-CN');
}

function getWinners(items, comparator, primaryField, secondaryField) {
  const sorted = [...items].sort(comparator);
  if (sorted.length === 0) {
    return [];
  }
  const topPrimary = sorted[0][primaryField];
  const topSecondary = sorted[0][secondaryField];
  return sorted.filter((item) => item[primaryField] === topPrimary && item[secondaryField] === topSecondary);
}

export function isSeasonFinished(matches) {
  return matches.length > 0 && matches.every((match) => match.isPlayed);
}

export function validateAwardSettings(settings, allowedTeams = [], { requireSelection = true } = {}) {
  const prizeKeys = ['firstPlace', 'secondPlace', 'thirdPlace', 'topScorer', 'topAssist', 'fmvp'];
  for (const key of prizeKeys) {
    if (!isNonNegativeInteger(Number(settings?.[key]))) {
      return `${key} 奖金必须是非负整数元`;
    }
  }

  const fmvpPlayerName = normalizeText(settings?.fmvpPlayerName);
  const fmvpTeam = normalizeText(settings?.fmvpTeam);

  if (requireSelection) {
    if (!fmvpPlayerName) {
      return 'FMVP 球员姓名不能为空';
    }
    if (!fmvpTeam) {
      return 'FMVP 球队不能为空';
    }
    if (allowedTeams.length > 0 && !allowedTeams.includes(fmvpTeam)) {
      return 'FMVP 球队必须属于当前赛季';
    }
  }

  return null;
}

export function normalizeAwardSettings(settings) {
  return {
    firstPlace: Number(settings?.firstPlace ?? 0),
    secondPlace: Number(settings?.secondPlace ?? 0),
    thirdPlace: Number(settings?.thirdPlace ?? 0),
    topScorer: Number(settings?.topScorer ?? 0),
    topAssist: Number(settings?.topAssist ?? 0),
    fmvp: Number(settings?.fmvp ?? 0),
    fmvpPlayerName: normalizeText(settings?.fmvpPlayerName),
    fmvpTeam: normalizeText(settings?.fmvpTeam),
  };
}

export function buildAwardSummary(awardSettings, { rankedTeams, playerStats }) {
  const prizes = normalizeAwardSettings(awardSettings);
  const eligibleScorers = playerStats.filter((item) => item.goals > 0);
  const eligibleAssisters = playerStats.filter((item) => item.assists > 0);
  const podium = rankedTeams.slice(0, 3).map((team, index) => ({
    rank: team.rank,
    team: team.team,
    prize: [prizes.firstPlace, prizes.secondPlace, prizes.thirdPlace][index] ?? 0,
    needsPlayoff: team.needsPlayoff,
  }));

  const scorerWinners = getWinners(eligibleScorers, sortByScorer, 'goals', 'assists');
  const assistWinners = getWinners(eligibleAssisters, sortByAssister, 'assists', 'goals');

  return {
    podium,
    topScorer: {
      prize: prizes.topScorer,
      winners: scorerWinners,
    },
    topAssist: {
      prize: prizes.topAssist,
      winners: assistWinners,
    },
    fmvp: {
      name: prizes.fmvpPlayerName,
      team: prizes.fmvpTeam,
      prize: prizes.fmvp,
    },
  };
}

export function buildSeasonAwards(state, rankedTeams) {
  return buildAwardSummary(state.awards ?? {}, {
    rankedTeams,
    playerStats: computePlayerStats(state.matches),
  });
}
