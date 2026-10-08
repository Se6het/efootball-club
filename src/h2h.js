// 历史交锋：统计两支球队在本场之前的全部已赛交锋，并生成球队/球员亮点。
// 纯逻辑，无 DOM 依赖，便于测试。

const MAX_HIGHLIGHTS = 6;

function normalizeName(value) {
  return String(value ?? '').trim();
}

function isFixture(match, teamA, teamB) {
  return Boolean(match) && (
    (match.homeTeam === teamA && match.awayTeam === teamB) ||
    (match.homeTeam === teamB && match.awayTeam === teamA)
  );
}

// 取出在对阵本场之前、两队之间已经打完的交锋，按场次升序。
export function getPriorMeetings(matches, targetMatch) {
  const homeTeam = targetMatch?.homeTeam;
  const awayTeam = targetMatch?.awayTeam;
  if (!homeTeam || !awayTeam) return [];
  const before = Number(targetMatch?.matchNumber);
  return (Array.isArray(matches) ? matches : [])
    .filter((match) => match?.isPlayed && isFixture(match, homeTeam, awayTeam))
    .filter((match) => !Number.isFinite(before) || Number(match.matchNumber) < before)
    .sort((left, right) => Number(left.matchNumber ?? 0) - Number(right.matchNumber ?? 0));
}

function buildMeeting(match, teamHome) {
  const isHomeFirst = match.homeTeam === teamHome;
  const forHome = isHomeFirst ? match.homeGoals : match.awayGoals;
  const forAway = isHomeFirst ? match.awayGoals : match.homeGoals;
  return {
    matchNumber: match.matchNumber,
    round: match.round,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    // 以 targetMatch 的主队视角归一化的比分。
    forHome,
    forAway,
    winner: forHome > forAway ? 'home' : forHome < forAway ? 'away' : 'draw',
  };
}

function trailingStreak(meetings, predicate) {
  let streak = 0;
  for (let index = meetings.length - 1; index >= 0; index -= 1) {
    if (predicate(meetings[index])) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

// 传入的是带进球/助攻/MVP 明细的原始比赛数组（buildMeeting 只保留比分）。
function collectPlayerTotals(rawMatches, teamHome, teamAway) {
  const goals = new Map();
  const assists = new Map();
  const mvps = new Map();
  const goalStreak = new Map();

  const keyOf = (team, name) => `${team}::${name}`;
  const bump = (map, team, name, amount = 1) => {
    const key = keyOf(team, name);
    const current = map.get(key) ?? { name, team, total: 0 };
    current.total += amount;
    map.set(key, current);
  };

  for (const match of rawMatches) {
    const sides = [
      { team: match.homeTeam, scorers: match.homeScorers, assists: match.homeAssists },
      { team: match.awayTeam, scorers: match.awayScorers, assists: match.awayAssists },
    ];
    const scoredKeys = new Set();

    for (const side of sides) {
      if (!side.team) continue;
      for (const item of Array.isArray(side.scorers) ? side.scorers : []) {
        const name = normalizeName(item?.name);
        const count = Math.max(0, Number(item?.count ?? 0));
        if (!name || count <= 0) continue;
        bump(goals, side.team, name, count);
        scoredKeys.add(keyOf(side.team, name));
      }
      for (const item of Array.isArray(side.assists) ? side.assists : []) {
        const name = normalizeName(item?.name);
        const count = Math.max(0, Number(item?.count ?? 0));
        if (!name || count <= 0) continue;
        bump(assists, side.team, name, count);
      }
    }

    // 更新连续进球：本场有进球则 +1，否则清零。
    for (const [key, entry] of goals) {
      goalStreak.set(key, scoredKeys.has(key) ? (goalStreak.get(key) ?? 0) + 1 : 0);
    }

    const mvpName = normalizeName(match.mvp?.name);
    const mvpTeam = normalizeName(match.mvp?.team);
    if (mvpName && (mvpTeam === teamHome || mvpTeam === teamAway)) {
      bump(mvps, mvpTeam, mvpName, 1);
    }
  }

  return { goals, assists, mvps, goalStreak };
}

function buildHighlights(rawMatches, meetings, teamHome, teamAway) {
  const { goals, assists, mvps, goalStreak } = collectPlayerTotals(rawMatches, teamHome, teamAway);
  const highlights = [];
  const seenPlayers = new Set();

  const addHighlight = (icon, text) => {
    if (highlights.length >= MAX_HIGHLIGHTS) return;
    highlights.push({ icon, text });
  };
  const claimPlayer = (entry) => {
    const key = `${entry.team}::${entry.name}`;
    if (seenPlayers.has(key)) return false;
    seenPlayers.add(key);
    return true;
  };
  const opponentOf = (team) => (team === teamHome ? teamAway : teamHome);

  // 1) 连续面对该对手进球。
  const streakEntries = [...goals.entries()]
    .map(([key, entry]) => ({ ...entry, streak: goalStreak.get(key) ?? 0 }))
    .filter((entry) => entry.streak >= 2)
    .sort((left, right) => right.streak - left.streak || right.total - left.total);
  for (const entry of streakEntries) {
    if (!claimPlayer(entry)) continue;
    addHighlight('🔥', `${entry.name}（${entry.team}）连续 ${entry.streak} 场面对 ${opponentOf(entry.team)} 取得进球`);
  }

  // 2) 交锋射手王。
  const topScorer = [...goals.values()].sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, 'zh-Hans-CN'))[0];
  if (topScorer && topScorer.total >= 1 && claimPlayer(topScorer)) {
    addHighlight('⚽', `${topScorer.name}（${topScorer.team}）已在两队交锋中打入 ${topScorer.total} 球`);
  }

  // 3) 交锋助攻王。
  const topAssister = [...assists.values()].sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, 'zh-Hans-CN'))[0];
  if (topAssister && topAssister.total >= 2 && claimPlayer(topAssister)) {
    addHighlight('🅰️', `${topAssister.name}（${topAssister.team}）面对 ${opponentOf(topAssister.team)} 已送出 ${topAssister.total} 次助攻`);
  }

  // 4) 交锋最佳球员。
  const topMvp = [...mvps.values()].sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, 'zh-Hans-CN'))[0];
  if (topMvp && topMvp.total >= 1 && claimPlayer(topMvp)) {
    addHighlight('⭐', `${topMvp.name}（${topMvp.team}）在双方交锋中 ${topMvp.total} 次当选全场最佳`);
  }

  // 5) 球队连胜 / 不败纪录。
  const homeWins = trailingStreak(meetings, (match) => match.winner === 'home');
  const awayWins = trailingStreak(meetings, (match) => match.winner === 'away');
  const homeUnbeaten = trailingStreak(meetings, (match) => match.winner !== 'away');
  const awayUnbeaten = trailingStreak(meetings, (match) => match.winner !== 'home');
  const totalHomeWins = meetings.filter((match) => match.winner === 'home').length;
  const totalAwayWins = meetings.filter((match) => match.winner === 'away').length;

  if (homeWins >= 2) {
    addHighlight('⚡', `${teamHome} 已连续 ${homeWins} 场击败 ${teamAway}`);
  } else if (awayWins >= 2) {
    addHighlight('⚡', `${teamAway} 已连续 ${awayWins} 场击败 ${teamHome}`);
  } else if (homeUnbeaten >= 3) {
    addHighlight('🛡️', `${teamHome} 面对 ${teamAway} 已连续 ${homeUnbeaten} 场不败`);
  } else if (awayUnbeaten >= 3) {
    addHighlight('🛡️', `${teamAway} 面对 ${teamHome} 已连续 ${awayUnbeaten} 场不败`);
  }

  if (meetings.length >= 3 && totalHomeWins === 0) {
    addHighlight('😅', `${teamHome} 至今还未战胜过 ${teamAway}`);
  } else if (meetings.length >= 3 && totalAwayWins === 0) {
    addHighlight('😅', `${teamAway} 至今还未战胜过 ${teamHome}`);
  }

  return highlights;
}

export function computeHeadToHead(matches, targetMatch) {
  const homeTeam = targetMatch?.homeTeam;
  const awayTeam = targetMatch?.awayTeam;
  if (!homeTeam || !awayTeam) return null;

  const prior = getPriorMeetings(matches, targetMatch);
  const meetings = prior.map((match) => buildMeeting(match, homeTeam));

  const summary = meetings.reduce((acc, meeting) => {
    if (meeting.winner === 'home') acc.homeWins += 1;
    else if (meeting.winner === 'away') acc.awayWins += 1;
    else acc.draws += 1;
    acc.homeGoals += meeting.forHome;
    acc.awayGoals += meeting.forAway;
    return acc;
  }, { homeWins: 0, draws: 0, awayWins: 0, homeGoals: 0, awayGoals: 0 });

  return {
    homeTeam,
    awayTeam,
    meetingNumber: meetings.length + 1,
    playedCount: meetings.length,
    summary,
    meetings,
    highlights: buildHighlights(prior, meetings, homeTeam, awayTeam),
  };
}
