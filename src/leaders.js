import { computeDisciplineStats } from './discipline.js';

function playerKey(name, team) {
  return `${team}::${name}`;
}

function countValue(value) {
  const count = Number(value ?? 0);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

function emptyStats(name, team) {
  return { name, team, goals: 0, assists: 0, mvpCount: 0, mvpScoreTotal: 0 };
}

function accumulate(map, items, team, field) {
  for (const item of Array.isArray(items) ? items : []) {
    const name = String(item?.name ?? '').trim();
    const count = countValue(item?.count);
    if (!name || count === null || count <= 0) continue;

    const key = playerKey(name, team);
    const current = map.get(key) ?? emptyStats(name, team);
    map.set(key, { ...current, team, [field]: current[field] + count });
  }
}

function accumulateCards(map, items, team) {
  for (const item of Array.isArray(items) ? items : []) {
    const name = String(item?.name ?? '').trim();
    const yellow = countValue(item?.yellow);
    const red = countValue(item?.red);
    if (!name || yellow === null || red === null || (yellow === 0 && red === 0)) continue;
    const key = playerKey(name, team);
    const current = map.get(key) ?? emptyStats(name, team);
    map.set(key, {
      ...current,
      yellowCards: (current.yellowCards ?? 0) + yellow,
      redCards: (current.redCards ?? 0) + red,
    });
  }
}

function sumContribution(items, name) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item?.name === name)
    .reduce((sum, item) => sum + (countValue(item?.count) ?? 0), 0);
}
export function validateContributionTotals(match) {
  const lists = [match.homeScorers, match.awayScorers, match.homeAssists, match.awayAssists];
  if (!lists.every(Array.isArray)) return '进球和助攻记录格式无效';
  const allCountsValid = lists.every((items) => items.every((item) => Number.isInteger(Number(item?.count)) && Number(item.count) >= 0));
  if (!allCountsValid || !Number.isInteger(Number(match.homeGoals)) || Number(match.homeGoals) < 0 || !Number.isInteger(Number(match.awayGoals)) || Number(match.awayGoals) < 0) {
    return '比分、进球和助攻数量必须是非负整数';
  }
  const homeScorerTotal = match.homeScorers.reduce((sum, item) => sum + Number(item.count), 0);
  const awayScorerTotal = match.awayScorers.reduce((sum, item) => sum + Number(item.count), 0);
  const homeAssistTotal = match.homeAssists.reduce((sum, item) => sum + Number(item.count), 0);
  const awayAssistTotal = match.awayAssists.reduce((sum, item) => sum + Number(item.count), 0);

  if (homeScorerTotal !== Number(match.homeGoals)) {
    return '主队进球数与进球球员数量不一致';
  }
  if (awayScorerTotal !== match.awayGoals) {
    return '客队进球数与进球球员数量不一致';
  }
  if (homeAssistTotal > match.homeGoals) {
    return '主队助攻总数不能超过进球数';
  }
  if (awayAssistTotal > match.awayGoals) {
    return '客队助攻总数不能超过进球数';
  }

  return null;
}

export function validateMvpSelection(match) {
  const name = String(match.mvp?.name ?? '').trim();
  const team = String(match.mvp?.team ?? '').trim();
  const score = Number(match.mvp?.score ?? NaN);

  if (!name || !team || !Number.isFinite(score)) {
    return '请填写 MVP 球员、球队和评分';
  }
  if (score < 0 || score > 10) {
    return 'MVP 评分必须在 0 到 10 之间';
  }

  return null;
}

function buildLeaderLists(playerStats) {
  const scorerList = playerStats
    .filter((item) => item.goals > 0)
    .sort((left, right) => right.goals - left.goals || right.assists - left.assists || left.name.localeCompare(right.name, 'zh-Hans-CN'))
    .map((item) => ({
      name: item.name,
      team: item.team,
      goals: item.goals,
      assists: item.assists,
      mvpCount: item.mvpCount,
      averageScore: item.mvpCount > 0 ? Number((item.mvpScoreTotal / item.mvpCount).toFixed(2)) : 0,
      count: item.goals,
    }));

  const assistList = playerStats
    .filter((item) => item.assists > 0)
    .sort((left, right) => right.assists - left.assists || right.goals - left.goals || left.name.localeCompare(right.name, 'zh-Hans-CN'))
    .map((item) => ({
      name: item.name,
      team: item.team,
      goals: item.goals,
      assists: item.assists,
      mvpCount: item.mvpCount,
      averageScore: item.mvpCount > 0 ? Number((item.mvpScoreTotal / item.mvpCount).toFixed(2)) : 0,
      count: item.assists,
    }));

  const mvpList = playerStats
    .filter((item) => item.mvpCount > 0)
    .map((item) => ({
      name: item.name,
      team: item.team,
      count: item.mvpCount,
      averageScore: Number((item.mvpScoreTotal / item.mvpCount).toFixed(2)),
      goals: item.goals,
      assists: item.assists,
      yellowCards: item.yellowCards ?? 0,
      redCards: item.redCards ?? 0,
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        right.averageScore - left.averageScore ||
        left.name.localeCompare(right.name, 'zh-Hans-CN')
    );

  return { scorerList, assistList, mvpList };
}

export function computeLeaders(matches) {
  return buildLeaderLists(computePlayerStats(matches));
}

export function computeTeamLeaders(matches, team) {
  const playerStats = computePlayerStats(matches).filter((item) => item.team === team);
  return buildLeaderLists(playerStats);
}

export function computePlayerStats(matches) {
  const stats = new Map();

  for (const match of matches) {
    if (!match.isPlayed) {
      continue;
    }
    accumulate(stats, match.homeScorers, match.homeTeam, 'goals');
    accumulate(stats, match.awayScorers, match.awayTeam, 'goals');
    accumulate(stats, match.homeAssists, match.homeTeam, 'assists');
    accumulate(stats, match.awayAssists, match.awayTeam, 'assists');
    accumulateCards(stats, match.homePlayerCards, match.homeTeam);
    accumulateCards(stats, match.awayPlayerCards, match.awayTeam);
    const mvpName = String(match.mvp?.name ?? '').trim();
    const mvpTeam = String(match.mvp?.team ?? '').trim();
    const mvpScore = Number(match.mvp?.score ?? NaN);
    if (mvpName && mvpTeam && Number.isFinite(mvpScore)) {
      const key = playerKey(mvpName, mvpTeam);
      const current = stats.get(key) ?? emptyStats(mvpName, mvpTeam);
      stats.set(key, {
        ...current,
        team: mvpTeam,
        mvpCount: current.mvpCount + 1,
        mvpScoreTotal: current.mvpScoreTotal + mvpScore,
      });
    }
  }

  return [...stats.values()];
}

export function computePlayerDetail(matches, name, team) {
  const stats = computePlayerStats(matches).find((item) => item.name === name && item.team === team);
  if (!stats) {
    return null;
  }

  const lines = [];
  for (const match of matches) {
    if (!match.isPlayed) {
      continue;
    }

    const isHome = match.homeTeam === team;
    const isAway = match.awayTeam === team;
    if (!isHome && !isAway) {
      continue;
    }

    const scorers = isHome ? match.homeScorers : match.awayScorers;
    const assisters = isHome ? match.homeAssists : match.awayAssists;
    const goals = sumContribution(scorers, name);
    const assists = sumContribution(assisters, name);
    const cardEntries = isHome ? match.homePlayerCards : match.awayPlayerCards;
    const card = (Array.isArray(cardEntries) ? cardEntries : []).filter((item) => item?.name === name).reduce((result, item) => ({ yellow: result.yellow + (countValue(item?.yellow) ?? 0), red: result.red + (countValue(item?.red) ?? 0) }), { yellow: 0, red: 0 });
    const isMvp = match.mvp?.name === name && match.mvp?.team === team;

    const forGoals = isHome ? match.homeGoals : match.awayGoals;
    const againstGoals = isHome ? match.awayGoals : match.homeGoals;
    const contributed = goals > 0 || assists > 0 || card.yellow > 0 || card.red > 0 || isMvp;
    lines.push({
      matchNumber: match.matchNumber,
      round: match.round,
      opponent: isHome ? match.awayTeam : match.homeTeam,
      isHome,
      forGoals,
      againstGoals,
      result: forGoals > againstGoals ? '胜' : forGoals < againstGoals ? '负' : '平',
      goals,
      assists,
      yellowCards: card.yellow,
      redCards: card.red,
      mvpScore: isMvp ? match.mvp.score : null,
      contributed,
    });
  }

  lines.sort((left, right) => left.matchNumber - right.matchNumber);

  return {
    name: stats.name,
    team: stats.team,
    goals: stats.goals,
    assists: stats.assists,
    mvpCount: stats.mvpCount,
    mvpScoreTotal: stats.mvpScoreTotal,
    yellowCards: stats.yellowCards ?? 0,
    redCards: stats.redCards ?? 0,
    averageScore: stats.mvpCount > 0 ? Number((stats.mvpScoreTotal / stats.mvpCount).toFixed(2)) : 0,
    appearances: lines.length,
    goalInvolvements: stats.goals + stats.assists,
    matches: lines,
  };
}

export function collectKnownPlayers(matches) {
  const byTeam = new Map();

  const add = (team, name) => {
    const normalized = String(name ?? '').trim();
    if (!team || !normalized) {
      return;
    }
    if (!byTeam.has(team)) {
      byTeam.set(team, new Set());
    }
    byTeam.get(team).add(normalized);
  };

  for (const match of matches) {
    if (!match.isPlayed) {
      continue;
    }
    for (const item of match.homeScorers ?? []) add(match.homeTeam, item?.name);
    for (const item of match.homeAssists ?? []) add(match.homeTeam, item?.name);
    for (const item of match.awayScorers ?? []) add(match.awayTeam, item?.name);
    for (const item of match.awayAssists ?? []) add(match.awayTeam, item?.name);
    for (const item of match.homePlayerCards ?? []) add(match.homeTeam, item?.name);
    for (const item of match.awayPlayerCards ?? []) add(match.awayTeam, item?.name);
    add(match.mvp?.team, match.mvp?.name);
  }

  const result = {};
  for (const [team, names] of byTeam) {
    result[team] = [...names].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'));
  }
  return result;
}
