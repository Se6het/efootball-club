// 新闻「看点与记录」引擎：把赛季里最近发生的事，翻译成一条条有主次的看点。
// 纯逻辑、无 DOM 依赖，便于测试。
//
// 每条看点都带一个「稀有度」tier —— 越难达成的记录层级越高，用来排主次和上色：
// legend > epic > rare > common。界面上只表现成颜色/难度条，不写「传说」这类字。
// metric 是算稀有度用的原始数字（连续场次、进球数等），也用于同级排序。
//
// 新闻是有时效的：每条看点都记着它对应的轮次，超过 NEWS_WINDOW 轮就从列表里消失，
// 免得太久以前的旧事一直挂在「新闻」里。

import { computePlayerStats } from './leaders.js';

export const TIER_ORDER = Object.freeze(['legend', 'epic', 'rare', 'common']);

export const TIER_META = Object.freeze({
  legend: { label: '传说', weight: 4, icon: '🟣' },
  epic: { label: '史诗', weight: 3, icon: '🟠' },
  rare: { label: '稀有', weight: 2, icon: '🔵' },
  common: { label: '常规', weight: 1, icon: '⚪' },
});

// 分类只用来做栏目标签：球员/球队/交锋是正经战报，「数据」是硬指标，
// 「趣闻」才放那些不那么正经的记录，「战报」就是刚打完那场。
export const NEWS_CATEGORIES = Object.freeze({
  player: '球员',
  team: '球队',
  h2h: '交锋',
  stat: '数据',
  quirk: '趣闻',
  report: '战报',
});

// 一条看点最多挂多久（按轮次算）；赛季还没打满 NEWS_WINDOW 轮时不会误杀。
const NEWS_WINDOW = 3;

// 一屏看点总数上限：头条 3 条 + 更多若干条，太多了反而没人看。
const MAX_ITEMS = 10;

// 同一名球员/同一支球队最多贡献几条，避免一个人刷满整个列表。
const MAX_PER_PLAYER = 2;
const MAX_PER_TEAM = 3;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function nameOf(value) {
  return String(value ?? '').trim();
}

function playedMatches(matches) {
  return (Array.isArray(matches) ? matches : [])
    .filter((match) => match?.isPlayed)
    .sort((left, right) => num(left.matchNumber) - num(right.matchNumber));
}

export function teamsOf(config) {
  return [...(config?.teamsA ?? []), ...(config?.teamsB ?? [])];
}

function sideOf(match, team) {
  if (match?.homeTeam === team) return 'home';
  if (match?.awayTeam === team) return 'away';
  return null;
}

function sideGoals(match, side) {
  const value = side === 'home' ? match?.homeGoals : match?.awayGoals;
  return num(value);
}

function goalsFor(match, team) {
  const side = sideOf(match, team);
  return side ? sideGoals(match, side) : 0;
}

function goalsAgainst(match, team) {
  const side = sideOf(match, team);
  return side ? sideGoals(match, side === 'home' ? 'away' : 'home') : 0;
}

function outcomeFor(match, team) {
  const diff = goalsFor(match, team) - goalsAgainst(match, team);
  return diff > 0 ? 'win' : diff < 0 ? 'loss' : 'draw';
}

// 某队在某场吃到的黄牌数（取球队汇总字段，兼容旧存档）。
function yellowsFor(match, team) {
  const side = sideOf(match, team);
  return side ? num(match?.[`${side}Cards`]?.yellow) : 0;
}

function matchesOfTeam(played, team) {
  return played.filter((match) => sideOf(match, team));
}

// 看点对应的轮次：没有 round 的老数据就退回用场次序号，保证总是能排新旧。
function roundOf(match) {
  return num(match?.round) || num(match?.matchNumber);
}

function lastRoundOf(teamMatches) {
  return roundOf(teamMatches[teamMatches.length - 1]);
}

function entryList(match, team, kind) {
  const side = sideOf(match, team);
  if (!side) return [];
  const list = match?.[`${side}${kind}`];
  return Array.isArray(list) ? list : [];
}

function mvpOf(match, team) {
  const mvp = match?.mvp;
  if (!mvp || mvp.team !== team || !nameOf(mvp.name)) return null;
  return mvp;
}

// 某球员在某场里为某队贡献的进球/助攻/MVP（没有记录就算 0）。
function contributionFor(match, team, playerName) {
  let goals = 0;
  for (const item of entryList(match, team, 'Scorers')) {
    if (nameOf(item?.name) === playerName) goals += num(item?.count);
  }
  let assists = 0;
  for (const item of entryList(match, team, 'Assists')) {
    if (nameOf(item?.name) === playerName) assists += num(item?.count);
  }
  const isMvp = nameOf(mvpOf(match, team)?.name) === playerName;
  return { goals, assists, mvp: isMvp, involved: goals > 0 || assists > 0 };
}

// 当前正在延续的连续场次（从最后一场往前数）。
function trailingStreak(list, predicate) {
  let count = 0;
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (predicate(list[index])) count += 1;
    else break;
  }
  return count;
}

// 连续场次 → 稀有度：thresholds 给了 rare/epic/legend 的下限。
function tierForStreak(value, { rare = 3, epic = 4, legend = 5 } = {}) {
  if (value >= legend) return 'legend';
  if (value >= epic) return 'epic';
  if (value >= rare) return 'rare';
  return 'common';
}

function item({ id, category, icon, tier, title, detail, metric = 0, teams = [], round = 0 }) {
  return {
    id,
    category,
    icon,
    tier,
    title,
    detail,
    metric,
    teams: teams.filter(Boolean),
    round: num(round),
  };
}

function weightOf(entry) {
  return TIER_META[entry?.tier]?.weight ?? 0;
}

// 同一主体产生的多条看点里，只留层级最高、指标最大的那几条。
function pickTop(list, limit) {
  return [...list]
    .sort((left, right) => weightOf(right) - weightOf(left) || right.metric - left.metric)
    .slice(0, limit);
}

// 每个球队有牌/有数据的球员名册：从比赛中出现过的贡献里收集。
function rosterOfTeam(played, team) {
  const names = new Set();
  for (const match of matchesOfTeam(played, team)) {
    for (const item of [...entryList(match, team, 'Scorers'), ...entryList(match, team, 'Assists')]) {
      const name = nameOf(item?.name);
      if (name) names.add(name);
    }
    const mvp = mvpOf(match, team);
    if (mvp) names.add(nameOf(mvp.name));
  }
  return [...names];
}

// ---------- 球员类看点 ----------

function playerItems(played, config, leaders) {
  const items = [];
  const teams = teamsOf(config);

  for (const team of teams) {
    const teamMatches = matchesOfTeam(played, team);
    if (teamMatches.length === 0) continue;
    const round = lastRoundOf(teamMatches);

    for (const playerName of rosterOfTeam(played, team)) {
      const gameCounts = teamMatches.map((match) => contributionFor(match, team, playerName));
      const mine = [];

      // 1) 连续进球
      const scoringStreak = trailingStreak(gameCounts, (game) => game.goals > 0);
      if (scoringStreak >= 2) {
        const goalsInStreak = gameCounts.slice(-scoringStreak).reduce((sum, game) => sum + game.goals, 0);
        mine.push(item({
          id: `player-scoring-streak:${team}:${playerName}`,
          category: 'player',
          icon: '🔥',
          tier: tierForStreak(scoringStreak, { rare: 3, epic: 4, legend: 5 }),
          title: `${playerName} 连续 ${scoringStreak} 场进球`,
          detail: `${team} · 这 ${scoringStreak} 场共打进 ${goalsInStreak} 球`,
          metric: scoringStreak,
          teams: [team],
          round,
        }));
      }

      // 2) 最近几场火力
      const window = Math.min(3, teamMatches.length);
      if (window >= 3) {
        const recentGoals = gameCounts.slice(-window).reduce((sum, game) => sum + game.goals, 0);
        if (recentGoals >= 3) {
          mine.push(item({
            id: `player-hot-window:${team}:${playerName}`,
            category: 'player',
            icon: '📈',
            tier: tierForStreak(recentGoals, { rare: 3, epic: 4, legend: 5 }),
            title: `${playerName} 最近 ${window} 场打进 ${recentGoals} 球`,
            detail: `${team} · 状态正热`,
            metric: recentGoals,
            teams: [team],
            round,
          }));
        }
      }

      // 3) 连续参与进球（进球或助攻）
      const involvementStreak = trailingStreak(gameCounts, (game) => game.involved);
      if (involvementStreak >= 3) {
        mine.push(item({
          id: `player-involvement-streak:${team}:${playerName}`,
          category: 'player',
          icon: '🧩',
          tier: tierForStreak(involvementStreak, { rare: 3, epic: 4, legend: 6 }),
          title: `${playerName} 连续 ${involvementStreak} 场参与进球`,
          detail: `${team} · 每场都有进球或助攻`,
          metric: involvementStreak,
          teams: [team],
          round,
        }));
      }

      // 4) 连场 MVP
      const mvpStreak = trailingStreak(gameCounts, (game) => game.mvp);
      if (mvpStreak >= 2) {
        mine.push(item({
          id: `player-mvp-streak:${team}:${playerName}`,
          category: 'player',
          icon: '🌟',
          tier: tierForStreak(mvpStreak, { rare: 2, epic: 3, legend: 4 }),
          title: `${playerName} 连续 ${mvpStreak} 场当选 MVP`,
          detail: `${team} · 全场最佳非他莫属`,
          metric: mvpStreak,
          teams: [team],
          round,
        }));
      }

      items.push(...pickTop(mine, MAX_PER_PLAYER));
    }
  }

  // 5) 射手榜 / 助攻榜领跑
  const scorerList = Array.isArray(leaders?.scorerList) ? leaders.scorerList : [];
  const assistList = Array.isArray(leaders?.assistList) ? leaders.assistList : [];
  const topScorer = scorerList[0];
  if (topScorer && num(topScorer.goals) >= 2) {
    const gap = num(topScorer.goals) - num(scorerList[1]?.goals);
    items.push(item({
      id: `player-top-scorer:${topScorer.team}:${topScorer.name}`,
      category: 'player',
      icon: '👟',
      tier: gap >= 3 ? 'epic' : gap >= 2 ? 'rare' : 'common',
      title: `${topScorer.name} 以 ${topScorer.goals} 球领跑射手榜`,
      detail: gap > 0 ? `${topScorer.team} · 领先次席 ${gap} 球` : `${topScorer.team} · 与身后球员紧咬`,
      metric: num(topScorer.goals),
      teams: [topScorer.team],
      round: lastRoundOf(matchesOfTeam(played, topScorer.team)),
    }));
  }
  const topAssister = assistList[0];
  if (topAssister && num(topAssister.assists) >= 2) {
    items.push(item({
      id: `player-top-assister:${topAssister.team}:${topAssister.name}`,
      category: 'player',
      icon: '🎯',
      tier: tierForStreak(num(topAssister.assists), { rare: 3, epic: 5, legend: 7 }),
      title: `${topAssister.name} 以 ${topAssister.assists} 次助攻领跑`,
      detail: `${topAssister.team} · 队内组织核心`,
      metric: num(topAssister.assists),
      teams: [topAssister.team],
      round: lastRoundOf(matchesOfTeam(played, topAssister.team)),
    }));
  }

  // 6) 效率怪：场均参与进球（要求出场够多，别让一场论霸榜）
  for (const stat of computePlayerStats(played)) {
    const apps = played.filter((match) => sideOf(match, stat.team)).length;
    if (apps < 3) continue;
    const involvements = num(stat.goals) + num(stat.assists);
    const perGame = involvements / apps;
    if (perGame >= 1.5) {
      items.push(item({
        id: `player-efficiency:${stat.team}:${stat.name}`,
        category: 'player',
        icon: '⚡',
        tier: perGame >= 2.5 ? 'legend' : perGame >= 2 ? 'epic' : 'rare',
        title: `${stat.name} 场均参与 ${perGame.toFixed(2)} 球`,
        detail: `${stat.team} · ${apps} 场里贡献 ${involvements} 球（进球+助攻）`,
        metric: perGame,
        teams: [stat.team],
        round: lastRoundOf(matchesOfTeam(played, stat.team)),
      }));
    }
  }

  return items;
}

// ---------- 球队类看点 ----------

function teamItems(played, config) {
  const items = [];
  const teams = teamsOf(config);

  for (const team of teams) {
    const teamMatches = matchesOfTeam(played, team);
    if (teamMatches.length === 0) continue;
    const outcomes = teamMatches.map((match) => outcomeFor(match, team));
    const round = lastRoundOf(teamMatches);
    const mine = [];

    const winStreak = trailingStreak(outcomes, (value) => value === 'win');
    if (winStreak >= 2) {
      mine.push(item({
        id: `team-win-streak:${team}`,
        category: 'team',
        icon: '⚡',
        tier: tierForStreak(winStreak, { rare: 3, epic: 4, legend: 6 }),
        title: `${team} ${winStreak} 连胜`,
        detail: `当前状态火热`,
        metric: winStreak,
        teams: [team],
        round,
      }));
    }

    const unbeaten = trailingStreak(outcomes, (value) => value !== 'loss');
    if (unbeaten >= 2) {
      mine.push(item({
        id: `team-unbeaten:${team}`,
        category: 'team',
        icon: '🛡️',
        tier: tierForStreak(unbeaten, { rare: 4, epic: 6, legend: 8 }),
        title: `${team} 已 ${unbeaten} 场不败`,
        detail: '最近一段稳如磐石',
        metric: unbeaten,
        teams: [team],
        round,
      }));
    }

    const winless = trailingStreak(outcomes, (value) => value !== 'win');
    if (winless >= 3) {
      mine.push(item({
        id: `team-winless:${team}`,
        category: 'team',
        icon: '😰',
        tier: tierForStreak(winless, { rare: 4, epic: 6, legend: 8 }),
        title: `${team} 已经 ${winless} 场不胜`,
        detail: '急需一场胜利止血',
        metric: winless,
        teams: [team],
        round,
      }));
    }

    const lossStreak = trailingStreak(outcomes, (value) => value === 'loss');
    if (lossStreak >= 2) {
      mine.push(item({
        id: `team-loss-streak:${team}`,
        category: 'team',
        icon: '💧',
        tier: tierForStreak(lossStreak, { rare: 3, epic: 4, legend: 5 }),
        title: `${team} 遭遇 ${lossStreak} 连败`,
        detail: '更衣室压力不小',
        metric: lossStreak,
        teams: [team],
        round,
      }));
    }

    // 连续零封
    const cleanSheets = trailingStreak(teamMatches, (match) => goalsAgainst(match, team) === 0);
    if (cleanSheets >= 2) {
      mine.push(item({
        id: `team-clean-sheet-streak:${team}`,
        category: 'team',
        icon: '🧱',
        tier: tierForStreak(cleanSheets, { rare: 2, epic: 3, legend: 4 }),
        title: `${team} 连续 ${cleanSheets} 场零封`,
        detail: '后防线完全封锁了对手',
        metric: cleanSheets,
        teams: [team],
        round,
      }));
    }

    // 场场破门（从未被零封）
    if (teamMatches.length >= 3 && teamMatches.every((match) => goalsFor(match, team) > 0)) {
      mine.push(item({
        id: `team-always-scored:${team}`,
        category: 'team',
        icon: '🎯',
        tier: teamMatches.length >= 6 ? 'epic' : 'rare',
        title: `${team} 场场都有进球`,
        detail: `${teamMatches.length} 场比赛从未被零封`,
        metric: teamMatches.length,
        teams: [team],
        round,
      }));
    }

    // 主场全胜
    const homeMatches = teamMatches.filter((match) => sideOf(match, team) === 'home');
    if (homeMatches.length >= 2 && homeMatches.every((match) => outcomeFor(match, team) === 'win')) {
      mine.push(item({
        id: `team-home-perfect:${team}`,
        category: 'team',
        icon: '🏟️',
        tier: 'epic',
        title: `${team} 主场全胜`,
        detail: `${homeMatches.length} 个主场全部拿下`,
        metric: homeMatches.length,
        teams: [team],
        round,
      }));
    }

    items.push(...pickTop(mine, MAX_PER_TEAM));
  }

  // 唯一一支还没赢过的球队（正儿八经的纪录，归到球队类里）
  const noWin = teams.filter((team) => {
    const list = matchesOfTeam(played, team);
    return list.length >= 3 && list.every((match) => outcomeFor(match, team) !== 'win');
  });
  if (noWin.length === 1) {
    items.push(item({
      id: `team-only-winless:${noWin[0]}`,
      category: 'team',
      icon: '🕳️',
      tier: 'rare',
      title: `${noWin[0]} 是唯一还没赢过球的球队`,
      detail: '全联赛的难兄难弟',
      metric: 1,
      teams: [noWin[0]],
      round: lastRoundOf(matchesOfTeam(played, noWin[0])),
    }));
  }

  return items;
}

// ---------- 交锋类看点 ----------

function h2hItems(played, config) {
  const items = [];
  const teams = teamsOf(config);

  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      const [teamA, teamB] = [teams[i], teams[j]];
      const meetings = played.filter(
        (match) =>
          (match.homeTeam === teamA && match.awayTeam === teamB) ||
          (match.homeTeam === teamB && match.awayTeam === teamA)
      );
      if (meetings.length < 2) continue;

      const round = roundOf(meetings[meetings.length - 1]);

      for (const [team, rival] of [[teamA, teamB], [teamB, teamA]]) {
        const results = meetings.map((match) => outcomeFor(match, team));
        const wins = trailingStreak(results, (value) => value === 'win');
        const unbeaten = trailingStreak(results, (value) => value !== 'loss');
        const mine = [];

        if (wins >= 2) {
          mine.push(item({
            id: `h2h-win-streak:${team}:${rival}`,
            category: 'h2h',
            icon: '🥊',
            tier: tierForStreak(wins, { rare: 2, epic: 3, legend: 4 }),
            title: `${team} 已连续 ${wins} 场击败 ${rival}`,
            detail: '这对冤家目前呈单向压制',
            metric: wins,
            teams: [team, rival],
            round,
          }));
        } else if (unbeaten >= 2) {
          mine.push(item({
            id: `h2h-unbeaten:${team}:${rival}`,
            category: 'h2h',
            icon: '🤝',
            tier: tierForStreak(unbeaten, { rare: 3, epic: 4, legend: 6 }),
            title: `${team} 面对 ${rival} 已连续 ${unbeaten} 场不败`,
            detail: '心理优势明显',
            metric: unbeaten,
            teams: [team, rival],
            round,
          }));
        }

        if (meetings.length >= 3 && results.every((value) => value !== 'win')) {
          mine.push(item({
            id: `h2h-never-beaten:${team}:${rival}`,
            category: 'h2h',
            icon: '😵',
            tier: 'epic',
            title: `${team} 至今未能战胜 ${rival}`,
            detail: `交手 ${meetings.length} 场仍未取胜`,
            metric: meetings.length,
            teams: [team, rival],
            round,
          }));
        }

        items.push(...pickTop(mine, 2));
      }
    }
  }

  return items;
}

// ---------- 战报：刚打完的那一场 ----------

function reportItems(played) {
  const latest = played[played.length - 1];
  return [
    item({
      id: `report-latest:${latest.matchNumber}`,
      category: 'report',
      icon: '🆕',
      tier: 'common',
      title: `最新战报：${latest.homeTeam} ${num(latest.homeGoals)}:${num(latest.awayGoals)} ${latest.awayTeam}`,
      detail: `第 ${latest.round} 轮 · 刚打完的一场`,
      metric: 0,
      teams: [latest.homeTeam, latest.awayTeam],
      round: roundOf(latest),
    }),
  ];
}

// ---------- 数据类看点：硬指标，正经的纪录 ----------

function statItems(played) {
  const items = [];

  // 最大分差
  const biggest = played
    .map((match) => ({ match, diff: Math.abs(num(match.homeGoals) - num(match.awayGoals)) }))
    .sort((left, right) => right.diff - left.diff)[0];
  if (biggest && biggest.diff >= 3) {
    const winner = num(biggest.match.homeGoals) > num(biggest.match.awayGoals) ? biggest.match.homeTeam : biggest.match.awayTeam;
    const loser = winner === biggest.match.homeTeam ? biggest.match.awayTeam : biggest.match.homeTeam;
    const hiSide = winner === biggest.match.homeTeam ? num(biggest.match.homeGoals) : num(biggest.match.awayGoals);
    const loSide = winner === biggest.match.homeTeam ? num(biggest.match.awayGoals) : num(biggest.match.homeGoals);
    items.push(item({
      id: 'stat-biggest-margin',
      category: 'stat',
      icon: '💥',
      tier: biggest.diff >= 5 ? 'epic' : 'rare',
      title: `本赛季最大分差：${winner} ${hiSide}:${loSide} ${loser}`,
      detail: `第 ${biggest.match.round} 轮 · 分差 ${biggest.diff} 球`,
      metric: biggest.diff,
      teams: [winner, loser],
      round: roundOf(biggest.match),
    }));
  }

  // 单场总进球最多的比赛
  const wildest = played
    .map((match) => ({ match, total: num(match.homeGoals) + num(match.awayGoals) }))
    .sort((left, right) => right.total - left.total)[0];
  if (wildest && wildest.total >= 6) {
    items.push(item({
      id: 'stat-goalfest',
      category: 'stat',
      icon: '🎪',
      tier: wildest.total >= 8 ? 'epic' : 'rare',
      title: `进球大战：${wildest.match.homeTeam} ${wildest.match.homeGoals}:${wildest.match.awayGoals} ${wildest.match.awayTeam}`,
      detail: `单场共 ${wildest.total} 球 · 观众大饱眼福`,
      metric: wildest.total,
      teams: [wildest.match.homeTeam, wildest.match.awayTeam],
      round: roundOf(wildest.match),
    }));
  }

  // 单场个人进球（帽子戏法及以上）
  for (const match of played) {
    for (const side of ['home', 'away']) {
      const team = match[`${side}Team`];
      for (const entry of Array.isArray(match[`${side}Scorers`]) ? match[`${side}Scorers`] : []) {
        const count = num(entry?.count);
        const name = nameOf(entry?.name);
        if (name && count >= 3) {
          items.push(item({
            id: `stat-haul:${match.matchNumber}:${team}:${name}`,
            category: 'stat',
            icon: '🎩',
            tier: count >= 4 ? 'legend' : 'epic',
            title: `${name} 单场打进 ${count} 球`,
            detail: `第 ${match.round} 轮 · ${team}`,
            metric: count,
            teams: [team],
            round: roundOf(match),
          }));
        }
      }
    }
  }

  return items;
}

// ---------- 趣闻类看点：正经的都搬走了，这里专放不那么正经的 ----------

function quirkItems(played, config) {
  const items = [];
  const teams = teamsOf(config);
  const buckets = new Map();

  function push(team, entry) {
    if (!buckets.has(team)) buckets.set(team, []);
    buckets.get(team).push(entry);
  }

  for (const team of teams) {
    const list = matchesOfTeam(played, team);
    if (list.length < 3) continue;
    const round = lastRoundOf(list);
    const conceded = list.reduce((sum, match) => sum + goalsAgainst(match, team), 0);
    const scored = list.reduce((sum, match) => sum + goalsFor(match, team), 0);
    const wins = list.filter((match) => outcomeFor(match, team) === 'win');

    // 防线漏勺：踢了这么多场，一次都没零封过
    if (list.every((match) => goalsAgainst(match, team) > 0)) {
      push(team, item({
        id: `quirk-leaky:${team}`,
        category: 'quirk',
        icon: '🥅',
        tier: 'rare',
        title: `防线漏勺：${team} 场场丢球`,
        detail: `${list.length} 场比赛一个零封都没拿到`,
        metric: list.length,
        teams: [team],
        round,
      }));
    }

    // 锋线失踪：一球未进
    if (scored === 0) {
      push(team, item({
        id: `quirk-scoreless:${team}`,
        category: 'quirk',
        icon: '🧊',
        tier: 'rare',
        title: `${team} 至今一球未进`,
        detail: `${list.length} 场比赛全部交白卷`,
        metric: list.length,
        teams: [team],
        round,
      }));
    }

    // 一球小胜之王：赢的全是 1 球
    if (wins.length >= 3 && wins.every((match) => goalsFor(match, team) - goalsAgainst(match, team) === 1)) {
      push(team, item({
        id: `quirk-one-goal-wins:${team}`,
        category: 'quirk',
        icon: '😬',
        tier: 'rare',
        title: `${team} 的 ${wins.length} 场胜利全是 1 球小胜`,
        detail: '赢得惊险，但赢得全部',
        metric: wins.length,
        teams: [team],
        round,
      }));
    }

    // 完美中庸：进多少丢多少
    if (list.length >= 4 && scored === conceded && scored > 0) {
      push(team, item({
        id: `quirk-balanced:${team}`,
        category: 'quirk',
        icon: '⚖️',
        tier: 'rare',
        title: `${team} 进多少丢多少`,
        detail: `进 ${scored} 球丢 ${conceded} 球，账目刚好扯平`,
        metric: list.length,
        teams: [team],
        round,
      }));
    }

    // 惜败专家：输的球全是净负一球
    const losses = list.filter((match) => outcomeFor(match, team) === 'loss');
    if (losses.length >= 3 && losses.every((match) => goalsAgainst(match, team) - goalsFor(match, team) === 1)) {
      push(team, item({
        id: `quirk-close-losses:${team}`,
        category: 'quirk',
        icon: '🥲',
        tier: 'rare',
        title: `${team} 的 ${losses.length} 场失利全都只输一球`,
        detail: '总是差那么一点点',
        metric: losses.length,
        teams: [team],
        round,
      }));
    }

    // 卡牌收藏家：黄牌攒得比谁都快
    const yellows = list.reduce((sum, match) => sum + yellowsFor(match, team), 0);
    if (yellows >= 6) {
      push(team, item({
        id: `quirk-card-collector:${team}`,
        category: 'quirk',
        icon: '🃏',
        tier: yellows >= 10 ? 'epic' : 'rare',
        title: `${team} 已经领到 ${yellows} 张黄牌`,
        detail: '卡牌收藏家，主教练该管管脾气了',
        metric: yellows,
        teams: [team],
        round,
      }));
    }
  }

  for (const bucket of buckets.values()) {
    items.push(...pickTop(bucket, 2));
  }

  // 独角戏：全联赛最「靠一个人」的球队，只取最极端的那一支，免得同一句话刷屏。
  const solo = teams
    .map((team) => {
      const list = matchesOfTeam(played, team);
      const scored = list.reduce((sum, match) => sum + goalsFor(match, team), 0);
      const byScorer = new Map();
      for (const match of list) {
        for (const entry of entryList(match, team, 'Scorers')) {
          const name = nameOf(entry?.name);
          if (!name) continue;
          byScorer.set(name, (byScorer.get(name) ?? 0) + num(entry?.count));
        }
      }
      const top = [...byScorer.entries()].sort((left, right) => right[1] - left[1])[0];
      return { team, scored, top, share: top && scored > 0 ? top[1] / scored : 0 };
    })
    .filter((row) => row.scored >= 5 && row.top && row.top[1] >= 3 && row.share >= 0.6)
    .sort((left, right) => right.share - left.share)[0];
  if (solo) {
    items.push(item({
      id: `quirk-one-man-show:${solo.team}`,
      category: 'quirk',
      icon: '🎬',
      tier: 'rare',
      title: `${solo.team} 的进球有 ${Math.round(solo.share * 100)}% 来自 ${solo.top[0]}`,
      detail: `全队 ${solo.scored} 球，他一个人包办 ${solo.top[1]} 球`,
      metric: solo.top[1],
      teams: [solo.team],
      round: lastRoundOf(matchesOfTeam(played, solo.team)),
    }));
  }

  // 平局大师：得有一个明确领跑的
  const drawBoard = teams
    .map((team) => ({ team, draws: matchesOfTeam(played, team).filter((match) => outcomeFor(match, team) === 'draw').length }))
    .sort((left, right) => right.draws - left.draws);
  if (drawBoard[0] && drawBoard[0].draws >= 3 && drawBoard[0].draws > (drawBoard[1]?.draws ?? 0)) {
    items.push(item({
      id: 'quirk-draw-king',
      category: 'quirk',
      icon: '🤷',
      tier: 'rare',
      title: `平局大师：${drawBoard[0].team}`,
      detail: `已打出 ${drawBoard[0].draws} 场平局`,
      metric: drawBoard[0].draws,
      teams: [drawBoard[0].team],
      round: lastRoundOf(matchesOfTeam(played, drawBoard[0].team)),
    }));
  }

  // 最没看头的球队：场均总进球最少的那个
  const dullest = teams
    .map((team) => {
      const list = matchesOfTeam(played, team);
      const total = list.reduce((sum, match) => sum + goalsFor(match, team) + goalsAgainst(match, team), 0);
      return { team, played: list.length, perGame: list.length > 0 ? total / list.length : Infinity };
    })
    .filter((row) => row.played >= 3 && row.perGame <= 1.5)
    .sort((left, right) => left.perGame - right.perGame || left.team.localeCompare(right.team, 'zh-Hans-CN'))[0];
  if (dullest) {
    items.push(item({
      id: `quirk-dullest:${dullest.team}`,
      category: 'quirk',
      icon: '😴',
      tier: 'rare',
      title: `${dullest.team} 的比赛最没看头`,
      detail: `${dullest.played} 场平均每场只有 ${dullest.perGame.toFixed(1)} 个进球`,
      metric: dullest.played,
      teams: [dullest.team],
      round: lastRoundOf(matchesOfTeam(played, dullest.team)),
    }));
  }

  return items;
}

// 把「稀有度 + 指标」折成一个 0-100 的难度值，供界面画难度条。
// 稀有度决定基线，指标只做小幅加成（不同记录的指标量纲差很多，不适合直接比大小）。
const DIFFICULTY_BASE = { legend: 82, epic: 64, rare: 46, common: 28 };

export function newsDifficulty(entry) {
  const base = DIFFICULTY_BASE[entry?.tier] ?? DIFFICULTY_BASE.common;
  const bonus = Math.min(16, Math.max(0, num(entry?.metric)) * 2);
  return Math.round(Math.min(99, base + bonus));
}

export function tierLabel(tier) {
  return TIER_META[tier]?.label ?? TIER_META.common.label;
}

// 去重 + 排序：先按稀有度，再比新鲜（新的一轮排前面），然后比指标，最后按 id 保证稳定。
function rankItems(items) {
  const seen = new Map();
  for (const entry of items) {
    const weight = TIER_META[entry.tier]?.weight ?? 0;
    const existing = seen.get(entry.id);
    if (!existing || weight > existing.weight) {
      seen.set(entry.id, { ...entry, weight });
    }
  }
  return [...seen.values()].sort(
    (left, right) =>
      right.weight - left.weight ||
      right.round - left.round ||
      right.metric - left.metric ||
      left.id.localeCompare(right.id)
  );
}

// 主入口：返回按主次排好的看点列表（太久以前的旧闻会被丢掉）。
export function computeNews({ config, matches, leaders } = {}) {
  const played = playedMatches(matches);
  if (played.length === 0) return [];

  const items = [
    ...playerItems(played, config ?? {}, leaders),
    ...teamItems(played, config ?? {}),
    ...h2hItems(played, config ?? {}),
    ...statItems(played),
    ...quirkItems(played, config ?? {}),
    ...reportItems(played),
  ];

  const latestRound = Math.max(...played.map(roundOf));
  const fresh = items.filter((entry) => latestRound - entry.round < NEWS_WINDOW);

  return rankItems(fresh).slice(0, MAX_ITEMS);
}

// 头条 / 更多看点的切分：头条取前 headCount 条。
export function splitNews(items, headCount = 3) {
  const list = Array.isArray(items) ? items : [];
  return {
    headlines: list.slice(0, headCount),
    more: list.slice(headCount),
  };
}
