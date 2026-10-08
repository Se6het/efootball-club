// 近期状态与未来赛程：纯逻辑，便于测试与复用。
// 赛果统一用 胜/平/负 表示，均从「该球队视角」判断。

function isInvolved(match, team) {
  return Boolean(team) && (match?.homeTeam === team || match?.awayTeam === team);
}

function byMatchNumber(left, right) {
  return Number(left?.matchNumber ?? 0) - Number(right?.matchNumber ?? 0);
}

function playedTeamMatches(matches, team) {
  return (Array.isArray(matches) ? matches : [])
    .filter((match) => match?.isPlayed && isInvolved(match, team))
    .sort(byMatchNumber);
}

function upcomingTeamMatches(matches, team) {
  return (Array.isArray(matches) ? matches : [])
    .filter((match) => match && !match.isPlayed && isInvolved(match, team))
    .sort(byMatchNumber);
}

function resultFrom(forGoals, againstGoals) {
  if (forGoals > againstGoals) return '胜';
  if (forGoals < againstGoals) return '负';
  return '平';
}

function takeLast(items, count) {
  if (!Number.isFinite(count) || count <= 0) return items;
  return items.slice(-count);
}

function takeFirst(items, count) {
  if (!Number.isFinite(count) || count <= 0) return items;
  return items.slice(0, count);
}

// 最近 count 场战绩，按时间从早到晚排列，结果以该队视角计。
export function computeTeamForm(matches, team, count = 5) {
  return takeLast(playedTeamMatches(matches, team), count).map((match) => {
    const isHome = match.homeTeam === team;
    const forGoals = isHome ? match.homeGoals : match.awayGoals;
    const againstGoals = isHome ? match.awayGoals : match.homeGoals;
    return {
      matchNumber: match.matchNumber,
      round: match.round,
      opponent: isHome ? match.awayTeam : match.homeTeam,
      isHome,
      forGoals,
      againstGoals,
      result: resultFrom(forGoals, againstGoals),
    };
  });
}

// 未来 count 场赛程，按时间先后排列。
export function computeUpcomingFixtures(matches, team, count = 5) {
  return takeFirst(upcomingTeamMatches(matches, team), count).map((match) => {
    const isHome = match.homeTeam === team;
    return {
      matchNumber: match.matchNumber,
      round: match.round,
      opponent: isHome ? match.awayTeam : match.homeTeam,
      isHome,
    };
  });
}

// 批量计算多支球队的近期状态，返回 Map<team, form[]>。
export function computeTeamFormMap(matches, teams, count = 5) {
  const map = new Map();
  for (const team of Array.isArray(teams) ? teams : []) {
    map.set(team, computeTeamForm(matches, team, count));
  }
  return map;
}

// 近期战绩汇总：胜/平/负场数与近期积分。
export function summarizeForm(form) {
  const summary = { wins: 0, draws: 0, losses: 0, points: 0 };
  for (const item of Array.isArray(form) ? form : []) {
    if (item?.result === '胜') {
      summary.wins += 1;
      summary.points += 3;
    } else if (item?.result === '平') {
      summary.draws += 1;
      summary.points += 1;
    } else if (item?.result === '负') {
      summary.losses += 1;
    }
  }
  return summary;
}
