// 新闻「看点与记录」引擎：把赛季里已经发生的事，翻译成一条条有主次的看点。
// 纯逻辑、无 DOM 依赖，便于测试。
//
// 每条看点都带一个「稀有度」tier —— 越难达成的记录层级越高，这样一屏里自然分出主次：
// legend(传说) > epic(史诗) > rare(稀有) > common(常规)。
// metric 是算稀有度用的原始数字（连续场次、进球数等），也用于同级排序。

import { computePlayerStats } from './leaders.js';

export const TIER_ORDER = Object.freeze(['legend', 'epic', 'rare', 'common']);

export const TIER_META = Object.freeze({
  legend: { label: '传说', weight: 4, icon: '🟣' },
  epic: { label: '史诗', weight: 3, icon: '🟠' },
  rare: { label: '稀有', weight: 2, icon: '🔵' },
  common: { label: '常规', weight: 1, icon: '⚪' },
});

export const NEWS_CATEGORIES = Object.freeze({
  player: '球员',
  team: '球队',
  h2h: '交锋',
  fun: '趣闻',
});

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

function matchesOfTeam(played, team) {
  return played.filter((match) => sideOf(match, team));
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

function item({ id, category, icon, tier, title, detail, metric = 0 }) {
  return { id, category, icon, tier, title, detail, metric };
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

    for (const playerName of rosterOfTeam(played, team)) {
      const gameCounts = teamMatches.map((match) => contributionFor(match, team, playerName));

      // 1) 连续进球
      const scoringStreak = trailingStreak(gameCounts, (game) => game.goals > 0);
      if (scoringStreak >= 2) {
        const goalsInStreak = gameCounts.slice(-scoringStreak).reduce((sum, game) => sum + game.goals, 0);
        items.push(item({
          id: `player-scoring-streak:${team}:${playerName}`,
          category: 'player',
          icon: '🔥',
          tier: tierForStreak(scoringStreak, { rare: 3, epic: 4, legend: 5 }),
          title: `${playerName} 连续 ${scoringStreak} 场进球`,
          detail: `${team} · 这 ${scoringStreak} 场共打进 ${goalsInStreak} 球`,
          metric: scoringStreak,
        }));
      }

      // 2) 最近几场火力
      const window = Math.min(3, teamMatches.length);
      if (window >= 3) {
        const recentGoals = gameCounts.slice(-window).reduce((sum, game) => sum + game.goals, 0);
        if (recentGoals >= 3) {
          items.push(item({
            id: `player-hot-window:${team}:${playerName}`,
            category: 'player',
            icon: '📈',
            tier: tierForStreak(recentGoals, { rare: 3, epic: 4, legend: 5 }),
            title: `${playerName} 最近 ${window} 场打进 ${recentGoals} 球`,
            detail: `${team} · 状态正热`,
            metric: recentGoals,
          }));
        }
      }

      // 3) 连续参与进球（进球或助攻）
      const involvementStreak = trailingStreak(gameCounts, (game) => game.involved);
      if (involvementStreak >= 3) {
        items.push(item({
          id: `player-involvement-streak:${team}:${playerName}`,
          category: 'player',
          icon: '🧩',
          tier: tierForStreak(involvementStreak, { rare: 3, epic: 4, legend: 6 }),
          title: `${playerName} 连续 ${involvementStreak} 场参与进球`,
          detail: `${team} · 每场都有进球或助攻`,
          metric: involvementStreak,
        }));
      }

      // 4) 连场 MVP
      const mvpStreak = trailingStreak(gameCounts, (game) => game.mvp);
      if (mvpStreak >= 2) {
        items.push(item({
          id: `player-mvp-streak:${team}:${playerName}`,
          category: 'player',
          icon: '🌟',
          tier: tierForStreak(mvpStreak, { rare: 2, epic: 3, legend: 4 }),
          title: `${playerName} 连续 ${mvpStreak} 场当选 MVP`,
          detail: `${team} · 全场最佳非他莫属`,
          metric: mvpStreak,
        }));
      }
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

    const winStreak = trailingStreak(outcomes, (value) => value === 'win');
    if (winStreak >= 2) {
      items.push(item({
        id: `team-win-streak:${team}`,
        category: 'team',
        icon: '⚡',
        tier: tierForStreak(winStreak, { rare: 3, epic: 4, legend: 6 }),
        title: `${team} ${winStreak} 连胜`,
        detail: `当前状态火热`,
        metric: winStreak,
      }));
    }

    const unbeaten = trailingStreak(outcomes, (value) => value !== 'loss');
    if (unbeaten >= 2) {
      items.push(item({
        id: `team-unbeaten:${team}`,
        category: 'team',
        icon: '🛡️',
        tier: tierForStreak(unbeaten, { rare: 4, epic: 6, legend: 8 }),
        title: `${team} 已 ${unbeaten} 场不败`,
        detail: '最近一段稳如磐石',
        metric: unbeaten,
      }));
    }

    const winless = trailingStreak(outcomes, (value) => value !== 'win');
    if (winless >= 3) {
      items.push(item({
        id: `team-winless:${team}`,
        category: 'team',
        icon: '😰',
        tier: tierForStreak(winless, { rare: 4, epic: 6, legend: 8 }),
        title: `${team} 已经 ${winless} 场不胜`,
        detail: '急需一场胜利止血',
        metric: winless,
      }));
    }

    const lossStreak = trailingStreak(outcomes, (value) => value === 'loss');
    if (lossStreak >= 2) {
      items.push(item({
        id: `team-loss-streak:${team}`,
        category: 'team',
        icon: '💧',
        tier: tierForStreak(lossStreak, { rare: 3, epic: 4, legend: 5 }),
        title: `${team} 遭遇 ${lossStreak} 连败`,
        detail: '更衣室压力不小',
        metric: lossStreak,
      }));
    }

    // 连续零封
    const cleanSheets = trailingStreak(teamMatches, (match) => goalsAgainst(match, team) === 0);
    if (cleanSheets >= 2) {
      items.push(item({
        id: `team-clean-sheet-streak:${team}`,
        category: 'team',
        icon: '🧱',
        tier: tierForStreak(cleanSheets, { rare: 2, epic: 3, legend: 4 }),
        title: `${team} 连续 ${cleanSheets} 场零封`,
        detail: '后防线完全封锁了对手',
        metric: cleanSheets,
      }));
    }

    // 场场破门（从未被零封）
    if (teamMatches.length >= 3) {
      const scoringEveryGame = teamMatches.every((match) => goalsFor(match, team) > 0);
      if (scoringEveryGame) {
        items.push(item({
          id: `team-always-scored:${team}`,
          category: 'team',
          icon: '🎯',
          tier: teamMatches.length >= 6 ? 'epic' : 'rare',
          title: `${team} 场场都有进球`,
          detail: `${teamMatches.length} 场比赛从未被零封`,
          metric: teamMatches.length,
        }));
      }
    }

    // 主场全胜
    const homeMatches = teamMatches.filter((match) => sideOf(match, team) === 'home');
    if (homeMatches.length >= 2 && homeMatches.every((match) => outcomeFor(match, team) === 'win')) {
      items.push(item({
        id: `team-home-perfect:${team}`,
        category: 'team',
        icon: '🏟️',
        tier: 'epic',
        title: `${team} 主场全胜`,
        detail: `${homeMatches.length} 个主场全部拿下`,
        metric: homeMatches.length,
      }));
    }
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

      for (const [team, rival] of [[teamA, teamB], [teamB, teamA]]) {
        const results = meetings.map((match) => outcomeFor(match, team));
        const wins = trailingStreak(results, (value) => value === 'win');
        const unbeaten = trailingStreak(results, (value) => value !== 'loss');

        if (wins >= 2) {
          items.push(item({
            id: `h2h-win-streak:${team}:${rival}`,
            category: 'h2h',
            icon: '🥊',
            tier: tierForStreak(wins, { rare: 2, epic: 3, legend: 4 }),
            title: `${team} 已连续 ${wins} 场击败 ${rival}`,
            detail: '这对冤家目前呈单向压制',
            metric: wins,
          }));
        } else if (unbeaten >= 2) {
          items.push(item({
            id: `h2h-unbeaten:${team}:${rival}`,
            category: 'h2h',
            icon: '🤝',
            tier: tierForStreak(unbeaten, { rare: 3, epic: 4, legend: 6 }),
            title: `${team} 面对 ${rival} 已连续 ${unbeaten} 场不败`,
            detail: '心理优势明显',
            metric: unbeaten,
          }));
        }

        if (meetings.length >= 3 && results.every((value) => value !== 'win')) {
          items.push(item({
            id: `h2h-never-beaten:${team}:${rival}`,
            category: 'h2h',
            icon: '😵',
            tier: 'epic',
            title: `${team} 至今未能战胜 ${rival}`,
            detail: `交手 ${meetings.length} 场仍未取胜`,
            metric: meetings.length,
          }));
        }
      }
    }
  }

  return items;
}

// ---------- 趣闻类看点 ----------

function funItems(played, config) {
  const items = [];
  const teams = teamsOf(config);
  if (played.length === 0) return items;

  // 最新战报：赛季刚开打、还没有任何"纪录"时，至少有一条新闻可看。
  const latest = played[played.length - 1];
  items.push(item({
    id: `fun-latest:${latest.matchNumber}`,
    category: 'fun',
    icon: '🆕',
    tier: 'common',
    title: `最新战报：${latest.homeTeam} ${num(latest.homeGoals)}:${num(latest.awayGoals)} ${latest.awayTeam}`,
    detail: `第 ${latest.round} 轮 · 刚打完的一场`,
    metric: 0,
  }));

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
      id: 'fun-biggest-margin',
      category: 'fun',
      icon: '💥',
      tier: biggest.diff >= 5 ? 'epic' : 'rare',
      title: `本赛季最大分差：${winner} ${hiSide}:${loSide} ${loser}`,
      detail: `第 ${biggest.match.round} 轮 · 分差 ${biggest.diff} 球`,
      metric: biggest.diff,
    }));
  }

  // 单场总进球最多的比赛
  const wildest = played
    .map((match) => ({ match, total: num(match.homeGoals) + num(match.awayGoals) }))
    .sort((left, right) => right.total - left.total)[0];
  if (wildest && wildest.total >= 6) {
    items.push(item({
      id: 'fun-wildest-match',
      category: 'fun',
      icon: '🎪',
      tier: wildest.total >= 8 ? 'epic' : 'rare',
      title: `进球大战：${wildest.match.homeTeam} ${wildest.match.homeGoals}:${wildest.match.awayGoals} ${wildest.match.awayTeam}`,
      detail: `单场共 ${wildest.total} 球 · 观众大饱眼福`,
      metric: wildest.total,
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
            id: `fun-haul:${match.matchNumber}:${team}:${name}`,
            category: 'fun',
            icon: '🎩',
            tier: count >= 4 ? 'legend' : 'epic',
            title: `${name} 单场打进 ${count} 球`,
            detail: `第 ${match.round} 轮 · ${team}`,
            metric: count,
          }));
        }
      }
    }
  }

  // 平局大师
  const drawBoard = teams
    .map((team) => ({ team, draws: matchesOfTeam(played, team).filter((match) => outcomeFor(match, team) === 'draw').length }))
    .sort((left, right) => right.draws - left.draws);
  if (drawBoard[0] && drawBoard[0].draws >= 3) {
    items.push(item({
      id: 'fun-draw-king',
      category: 'fun',
      icon: '🤷',
      tier: 'rare',
      title: `平局大师：${drawBoard[0].team}`,
      detail: `已打出 ${drawBoard[0].draws} 场平局`,
      metric: drawBoard[0].draws,
    }));
  }

  // 唯一一支还没赢过的球队
  const noWin = teams.filter((team) => {
    const list = matchesOfTeam(played, team);
    return list.length >= 3 && list.every((match) => outcomeFor(match, team) !== 'win');
  });
  if (noWin.length === 1) {
    items.push(item({
      id: `fun-only-winless:${noWin[0]}`,
      category: 'fun',
      icon: '🕳️',
      tier: 'rare',
      title: `${noWin[0]} 是唯一还没赢过球的球队`,
      detail: '全联赛的难兄难弟',
      metric: 1,
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

// 去重 + 排序：先按稀有度，再按指标，最后按 id 保证稳定。
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
      right.metric - left.metric ||
      left.id.localeCompare(right.id)
  );
}

// 主入口：返回按主次排好的看点列表。
export function computeNews({ config, matches, leaders } = {}) {
  const played = playedMatches(matches);
  if (played.length === 0) return [];

  const items = [
    ...playerItems(played, config ?? {}, leaders),
    ...teamItems(played, config ?? {}),
    ...h2hItems(played, config ?? {}),
    ...funItems(played, config ?? {}),
  ];

  return rankItems(items);
}

// 头条 / 更多看点的切分：头条取前 headCount 条。
export function splitNews(items, headCount = 3) {
  const list = Array.isArray(items) ? items : [];
  return {
    headlines: list.slice(0, headCount),
    more: list.slice(headCount),
  };
}
