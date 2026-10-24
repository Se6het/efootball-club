function createTeamStats(team) {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    fairPlayPoints: 0,
    needsPlayoff: false,
  };
}

function updateStats(stats, forGoals, againstGoals, cards) {
  const next = {
    ...stats,
    played: stats.played + 1,
    goalsFor: stats.goalsFor + forGoals,
    goalsAgainst: stats.goalsAgainst + againstGoals,
    goalDifference: stats.goalDifference + (forGoals - againstGoals),
    fairPlayPoints: stats.fairPlayPoints + (cards.yellow ?? 0) + (cards.red ?? 0) * 3,
  };

  if (forGoals > againstGoals) {
    next.wins += 1;
    next.points += 3;
  } else if (forGoals < againstGoals) {
    next.losses += 1;
  } else {
    next.draws += 1;
    next.points += 1;
  }

  return next;
}

function compareOverall(left, right) {
  return (
    right.points - left.points ||
    right.goalDifference - left.goalDifference ||
    right.goalsFor - left.goalsFor ||
    left.fairPlayPoints - right.fairPlayPoints ||
    left.team.localeCompare(right.team, 'zh-Hans-CN')
  );
}

function compareTwoTeamTie(left, right, matches, canRequirePlayoff) {
  let leftHeadToHead = 0;
  let rightHeadToHead = 0;

  for (const match of matches) {
    if (!match.isPlayed) {
      continue;
    }

    const involved =
      (match.homeTeam === left.team && match.awayTeam === right.team) ||
      (match.homeTeam === right.team && match.awayTeam === left.team);

    if (!involved) {
      continue;
    }

    if (match.homeTeam === left.team) {
      leftHeadToHead += match.homeGoals - match.awayGoals;
      rightHeadToHead += match.awayGoals - match.homeGoals;
    } else {
      leftHeadToHead += match.awayGoals - match.homeGoals;
      rightHeadToHead += match.homeGoals - match.awayGoals;
    }
  }

  const leftKey = {
    headToHead: leftHeadToHead,
    goalDifference: left.goalDifference,
    goalsFor: left.goalsFor,
    fairPlayPoints: left.fairPlayPoints,
    team: left.team,
  };
  const rightKey = {
    headToHead: rightHeadToHead,
    goalDifference: right.goalDifference,
    goalsFor: right.goalsFor,
    fairPlayPoints: right.fairPlayPoints,
    team: right.team,
  };

  const cmp =
    rightKey.headToHead - leftKey.headToHead ||
    rightKey.goalDifference - leftKey.goalDifference ||
    rightKey.goalsFor - leftKey.goalsFor ||
    leftKey.fairPlayPoints - rightKey.fairPlayPoints ||
    leftKey.team.localeCompare(rightKey.team, 'zh-Hans-CN');

  const isTotallyTied =
    leftKey.headToHead === rightKey.headToHead &&
    leftKey.goalDifference === rightKey.goalDifference &&
    leftKey.goalsFor === rightKey.goalsFor &&
    leftKey.fairPlayPoints === rightKey.fairPlayPoints;

  const ordered = cmp <= 0 ? [left, right] : [right, left];
  if (isTotallyTied && canRequirePlayoff) {
    return ordered.map((item) => ({ ...item, needsPlayoff: true }));
  }

  return ordered.map((item) => ({ ...item, needsPlayoff: false }));
}

function createMiniTable(group, matches) {
  const teamSet = new Set(group.map((item) => item.team));
  const miniStats = new Map(group.map((item) => [item.team, createTeamStats(item.team)]));

  for (const match of matches) {
    if (!match.isPlayed) {
      continue;
    }
    if (!teamSet.has(match.homeTeam) || !teamSet.has(match.awayTeam)) {
      continue;
    }

    miniStats.set(
      match.homeTeam,
      updateStats(miniStats.get(match.homeTeam), match.homeGoals, match.awayGoals, match.homeCards)
    );
    miniStats.set(
      match.awayTeam,
      updateStats(miniStats.get(match.awayTeam), match.awayGoals, match.homeGoals, match.awayCards)
    );
  }

  return miniStats;
}

function compareMultiTeamTie(left, right, miniStats) {
  const leftMini = miniStats.get(left.team);
  const rightMini = miniStats.get(right.team);

  return (
    rightMini.points - leftMini.points ||
    rightMini.goalDifference - leftMini.goalDifference ||
    right.goalDifference - left.goalDifference ||
    right.goalsFor - left.goalsFor ||
    left.fairPlayPoints - right.fairPlayPoints ||
    left.team.localeCompare(right.team, 'zh-Hans-CN')
  );
}

function markIfFullyTied(items, canRequirePlayoff) {
  const first = items[0];
  const same = items.every((item) => {
    return (
      item.points === first.points &&
      item.goalDifference === first.goalDifference &&
      item.goalsFor === first.goalsFor &&
      item.fairPlayPoints === first.fairPlayPoints
    );
  });

  if (same && canRequirePlayoff) {
    return items.map((item) => ({ ...item, needsPlayoff: true }));
  }

  return items.map((item) => ({ ...item, needsPlayoff: false }));
}

export function computeStandings(config, matches) {
  const teams = [...config.teamsA, ...config.teamsB];
  const stats = new Map(teams.map((team) => [team, createTeamStats(team)]));

  for (const match of matches) {
    if (!match.isPlayed) {
      continue;
    }

    stats.set(
      match.homeTeam,
      updateStats(stats.get(match.homeTeam), match.homeGoals, match.awayGoals, match.homeCards)
    );
    stats.set(
      match.awayTeam,
      updateStats(stats.get(match.awayTeam), match.awayGoals, match.homeGoals, match.awayCards)
    );
  }

  return [...stats.values()];
}

// 某队「每一轮结束后」的排名快照，用于球队详情里的赛季排名折线图。
// 逐轮累积已完成的比赛再排名，避免只打了一半的一轮造成排名抖动。
export function computeRankProgression(config, matches, team) {
  const played = (Array.isArray(matches) ? matches : []).filter((match) => match?.isPlayed);
  const rounds = [...new Set(played.map((match) => match.round))].sort((left, right) => left - right);
  const progression = [];

  for (const round of rounds) {
    const upto = played.filter((match) => match.round <= round);
    const ranked = rankTeams(config, upto);
    const entry = ranked.find((item) => item.team === team);
    if (!entry) {
      continue;
    }
    progression.push({
      round,
      rank: entry.rank,
      points: entry.points,
      played: entry.played,
      isLeader: entry.rank === 1,
    });
  }

  return progression;
}

// 同分集团：积分相同的球队归成一组，附上它们「相互之间」的迷你积分榜，
// 积分榜视图可以展开它，一眼看清同分时谁凭什么排在前面。
export function computeTieGroups(config, matches) {
  const ranked = rankTeams(config, matches);
  const groups = [];

  let index = 0;
  while (index < ranked.length) {
    const start = index;
    const points = ranked[index].points;
    index += 1;
    while (index < ranked.length && ranked[index].points === points) {
      index += 1;
    }

    const members = ranked.slice(start, index);
    if (members.length < 2) {
      continue;
    }
    // 赛季还没开打时所有队都是 0 分，排成一个大集团；这种「空同分」没有可比性，跳过。
    if (members.every((item) => item.played === 0)) {
      continue;
    }

    const miniStats = createMiniTable(members, matches);
    const rows = members.map((item) => ({ ...miniStats.get(item.team), rank: item.rank }));
    groups.push({ points, teams: members.map((item) => item.team), rows });
  }

  return groups;
}

export function rankTeams(config, matches) {
  const standings = computeStandings(config, matches);
  const ordered = standings.slice().sort(compareOverall);
  const result = [];
  const isSeasonComplete = matches.length > 0 && matches.every((match) => match.isPlayed);
  let index = 0;
  let rank = 1;

  while (index < ordered.length) {
    const current = ordered[index];
    const group = [current];
    index += 1;

    while (index < ordered.length && ordered[index].points === current.points) {
      group.push(ordered[index]);
      index += 1;
    }

    if (group.length === 1) {
      result.push({ ...group[0], rank, needsPlayoff: false });
      rank += 1;
      continue;
    }

    if (group.length === 2) {
      const resolved = compareTwoTeamTie(group[0], group[1], matches, isSeasonComplete);
      for (const item of resolved) {
        result.push({ ...item, rank });
        rank += 1;
      }
      continue;
    }

    const miniStats = createMiniTable(group, matches);
    const resolved = group.slice().sort((left, right) => compareMultiTeamTie(left, right, miniStats));
    const flagged = markIfFullyTied(resolved, isSeasonComplete);
    for (const item of flagged) {
      result.push({ ...item, rank });
      rank += 1;
    }
  }

  return result;
}
