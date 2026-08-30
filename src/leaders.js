function playerKey(name, team) {
  return `${team}::${name}`;
}

function accumulate(map, items, team, field) {
  for (const item of items) {
    const name = String(item?.name ?? '').trim();
    const count = Number(item?.count ?? 0);
    if (!name || !Number.isFinite(count) || count <= 0) {
      continue;
    }

    const key = playerKey(name, team);
    const current = map.get(key) ?? { name, team, goals: 0, assists: 0, mvpCount: 0, mvpScoreTotal: 0 };

    const next = { ...current, team, [field]: current[field] + count };
    map.set(key, next);
  }
}

export function validateContributionTotals(match) {
  const homeScorerTotal = match.homeScorers.reduce((sum, item) => sum + Number(item.count ?? 0), 0);
  const awayScorerTotal = match.awayScorers.reduce((sum, item) => sum + Number(item.count ?? 0), 0);
  const homeAssistTotal = match.homeAssists.reduce((sum, item) => sum + Number(item.count ?? 0), 0);
  const awayAssistTotal = match.awayAssists.reduce((sum, item) => sum + Number(item.count ?? 0), 0);

  if (homeScorerTotal !== match.homeGoals) {
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
    const mvpName = String(match.mvp?.name ?? '').trim();
    const mvpTeam = String(match.mvp?.team ?? '').trim();
    const mvpScore = Number(match.mvp?.score ?? NaN);
    if (mvpName && mvpTeam && Number.isFinite(mvpScore)) {
      const key = playerKey(mvpName, mvpTeam);
      const current = stats.get(key) ?? {
        name: mvpName,
        team: mvpTeam,
        goals: 0,
        assists: 0,
        mvpCount: 0,
        mvpScoreTotal: 0,
      };
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
