// 赔率引擎：用蒙特卡洛模拟把"还剩多少场"也算进去，算出任意时刻的夺冠/进前三/金靴/助攻王/FMVP 赔率。
//
// 模型（刻意保持简单、可解释）：
//   1. 每支球队的进攻力/防守力 = 既有场均数据 与「最近 3 场加权场均」的混合，
//      再按出场场次向联赛均值收缩（打得越少越保守，避免一场论）。
//   2. 单场进球用泊松分布采样，期望进球 = 联赛场均 × 双方攻防比 × 主场系数。
//   3. 模拟剩余赛程跑很多次，统计每队夺冠/进前三的次数 → 概率 → 赔率。
//   3.5 概率再朝「均势先验」收缩一把（强度看还剩多少赛程），免得赛季没结束就报出 1.01。
//   4. 球员奖项：把模拟出来的进球/助攻按球员的历史份额分配给队内球员，
//      FMVP 按参与度加权抽签；最后统计谁的赛季总数最高。
//
// 场上没有剩余比赛（赛季结束）时，模拟会退化成"当前排名即结果"，概率为 1/0，
// 此时赔率约等于 1.01，并且 finished=true，界面会提示已封盘。

import { computePlayerStats } from './leaders.js';
import { createRng } from './schedule.js';

const MARGIN = 0.06; // 水位：赔率里留 6% 的抽水
const MIN_ODDS = 1.01; // 赛季结束、已封盘时的极限赔率
const OPEN_MIN_ODDS = 1.05; // 赛季进行中不给低于这个的价，再稳也留点余地
const MAX_ODDS = 500;
const DEFAULT_ITERATIONS = 1200;
const DEFAULT_SEED = 20261018;
// 赛季还没踢完时模拟出来的概率会显得「言之凿凿」（动不动就 1.01），
// 按剩余赛程比例掺入一点均势先验，把极端赔率拉回合理区间。
const SOFTEN_STRENGTH = 1.4;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function nameOf(value) {
  return String(value ?? '').trim();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function teamsOf(config) {
  return [...(config?.teamsA ?? []), ...(config?.teamsB ?? [])];
}

function sideOf(match, team) {
  if (match?.homeTeam === team) return 'home';
  if (match?.awayTeam === team) return 'away';
  return null;
}

// Knuth 泊松采样：均值不大时够用且好读。
function poissonSample(lambda, rng) {
  const limit = Math.exp(-lambda);
  let total = 1;
  let count = -1;
  do {
    count += 1;
    total *= rng();
  } while (total > limit && count < 30);
  return count;
}

// 按权重抽一个下标（权重和必须 > 0）。
function pickWeighted(weights, rng) {
  let total = 0;
  for (const weight of weights) total += weight;
  if (total <= 0) return -1;
  let target = rng() * total;
  for (let index = 0; index < weights.length; index += 1) {
    target -= weights[index];
    if (target <= 0) return index;
  }
  return weights.length - 1;
}

// 每队的攻防原始数据 + 最近 3 场加权状态。
function buildTeamForm(played, teams) {
  const stats = new Map();
  for (const team of teams) {
    stats.set(team, { played: 0, goalsFor: 0, goalsAgainst: 0, recent: [] });
  }

  for (const match of played) {
    for (const side of ['home', 'away']) {
      const team = match[`${side}Team`];
      const entry = stats.get(team);
      if (!entry) continue;
      const gf = num(side === 'home' ? match.homeGoals : match.awayGoals);
      const ga = num(side === 'home' ? match.awayGoals : match.homeGoals);
      entry.played += 1;
      entry.goalsFor += gf;
      entry.goalsAgainst += ga;
      entry.recent.push({ gf, ga });
    }
  }
  return stats;
}

// 把原始数据揉成每队的进攻/防守系数（1.0 = 联赛平均）。
function buildStrength(stats, teams, leagueAvg) {
  const strength = new Map();

  for (const team of teams) {
    const entry = stats.get(team) ?? { played: 0, goalsFor: 0, goalsAgainst: 0, recent: [] };
    const recent = entry.recent.slice(-3);

    // 最近场次按 1:1.75:2.5 加权（越近越重，但别让最后一场压过一切）。
    let weightSum = 0;
    let recentFor = 0;
    let recentAgainst = 0;
    recent.forEach((game, index) => {
      const weight = 1 + index * 0.75;
      weightSum += weight;
      recentFor += game.gf * weight;
      recentAgainst += game.ga * weight;
    });

    const rawFor = entry.played > 0 ? entry.goalsFor / entry.played : leagueAvg;
    const rawAgainst = entry.played > 0 ? entry.goalsAgainst / entry.played : leagueAvg;
    const recentForPerGame = weightSum > 0 ? recentFor / weightSum : rawFor;
    const recentAgainstPerGame = weightSum > 0 ? recentAgainst / weightSum : rawAgainst;

    // 赛季总表现的权重略高于最近状态，避免一场爆发把赔率拉飞。
    let attack = 0.70 * rawFor + 0.30 * recentForPerGame;
    let defence = 0.70 * rawAgainst + 0.30 * recentAgainstPerGame;

    // 向联赛均值收缩：打得越少越保守。
    const shrink = entry.played / (entry.played + 3);
    attack = shrink * attack + (1 - shrink) * leagueAvg;
    defence = shrink * defence + (1 - shrink) * leagueAvg;

    strength.set(team, {
      attack: clamp(attack / leagueAvg, 0.3, 3.2),
      defence: clamp(defence / leagueAvg, 0.3, 3.2),
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    });
  }

  return strength;
}

// 从既有比赛里算主场系数（主队场均进球 / 客队场均进球）。
function homeAdvantage(played) {
  let homeGoals = 0;
  let awayGoals = 0;
  for (const match of played) {
    homeGoals += num(match.homeGoals);
    awayGoals += num(match.awayGoals);
  }
  if (homeGoals <= 0 || awayGoals <= 0) return 1.15;
  return clamp(homeGoals / awayGoals, 1.0, 1.6);
}

// 队内球员的进球/助攻/参与度份额，供模拟时分配。
function buildPlayerPools(played, teams) {
  const pools = new Map();
  for (const team of teams) pools.set(team, []);

  const stats = computePlayerStats(played);
  const teamTotals = new Map();
  for (const stat of stats) {
    const current = teamTotals.get(stat.team) ?? { goals: 0, assists: 0, mvp: 0 };
    current.goals += num(stat.goals);
    current.assists += num(stat.assists);
    current.mvp += num(stat.mvpCount);
    teamTotals.set(stat.team, current);
  }

  for (const stat of stats) {
    const pool = pools.get(stat.team);
    if (!pool) continue;
    const totals = teamTotals.get(stat.team) ?? { goals: 0, assists: 0, mvp: 0 };
    pool.push({
      name: stat.name,
      team: stat.team,
      baseGoals: num(stat.goals),
      baseAssists: num(stat.assists),
      baseMvp: num(stat.mvpCount),
      // 哪怕没进过球，也给一个很小的底权重，别让新援永远分不到球。
      goalWeight: num(stat.goals) + 0.25,
      assistWeight: num(stat.assists) + 0.25,
      mvpWeight: num(stat.goals) * 1.0 + num(stat.assists) * 0.8 + num(stat.mvpCount) * 2 + 0.5,
    });
  }

  // 一个人都没录的球队，pool 为空：本场进球只计入球队，不记到具体球员头上。
  return pools;
}

function finalOrder(strength) {
  return [...strength.entries()]
    .map(([team, data]) => ({
      team,
      points: data.points,
      goalDifference: data.goalsFor - data.goalsAgainst,
      goalsFor: data.goalsFor,
    }))
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.goalDifference - left.goalDifference ||
        right.goalsFor - left.goalsFor ||
        left.team.localeCompare(right.team, 'zh-Hans-CN')
    );
}

function toOdds(probability, floor = MIN_ODDS) {
  if (!(probability > 0)) return null;
  const raw = (1 - MARGIN) / probability;
  return Math.round(clamp(raw, floor, MAX_ODDS) * 100) / 100;
}

function toPercent(probability) {
  return Math.round(probability * 1000) / 10;
}

// 把模拟概率朝「均势先验」收缩：同一市场里还活着的项先取个平均当 prior，
// 再按该项的「剩余赛程比例」把概率往 prior 拉。剩余为 0（赛季结束）就原样返回，
// 概率为 0 的项保持 0（不挂价），因此不会凭空造出可能性。
function softenProbabilities(rows, fractionOf) {
  const alive = rows.filter((row) => row.p > 0);
  const total = alive.reduce((sum, row) => sum + row.p, 0);
  const prior = alive.length > 0 ? total / alive.length : 0;
  const out = new Map();
  for (const row of alive) {
    const pseudo = SOFTEN_STRENGTH * clamp(fractionOf(row), 0, 1);
    out.set(row.key, (row.p + prior * pseudo) / (1 + pseudo));
  }
  // 各队剩余场次不等时（轮空），上式的加权平均不保和——等比缩回去，
  // 保证每个市场的总量不变（夺冠合计仍 100%、前三合计仍 300%）。等权时比例恰为 1。
  const softened = alive.reduce((sum, row) => sum + (out.get(row.key) ?? 0), 0);
  if (softened > 0 && Math.abs(softened - total) > 1e-12) {
    const scale = total / softened;
    for (const key of out.keys()) out.set(key, out.get(key) * scale);
  }
  return out;
}

export function computeOdds({ config, matches, iterations = DEFAULT_ITERATIONS, seed = DEFAULT_SEED } = {}) {
  const teams = teamsOf(config);
  const all = Array.isArray(matches) ? matches : [];
  const played = all.filter((match) => match?.isPlayed);
  const remaining = all.filter((match) => match && !match.isPlayed);

  if (teams.length === 0) {
    return { available: false, finished: false, iterations: 0, teams: [], players: [] };
  }

  const finished = remaining.length === 0;
  const totalMatches = all.length;
  const totalGoals = played.reduce((sum, match) => sum + num(match.homeGoals) + num(match.awayGoals), 0);
  const leagueAvg = totalMatches > 0 && played.length > 0 ? totalGoals / played.length / 2 : 1.35;

  const baseStats = buildTeamForm(played, teams);
  const baseStrength = buildStrength(baseStats, teams, leagueAvg);
  const adv = homeAdvantage(played);
  const pools = buildPlayerPools(played, teams);
  const rng = createRng(seed);

  // 基础积分榜（已赛场次算一次，模拟里复用）。
  const basePoints = new Map();
  const baseFor = new Map();
  const baseAgainst = new Map();
  for (const team of teams) {
    basePoints.set(team, 0);
    baseFor.set(team, 0);
    baseAgainst.set(team, 0);
  }
  for (const match of played) {
    const home = match.homeTeam;
    const away = match.awayTeam;
    if (!basePoints.has(home) || !basePoints.has(away)) continue;
    const hg = num(match.homeGoals);
    const ag = num(match.awayGoals);
    baseFor.set(home, baseFor.get(home) + hg);
    baseFor.set(away, baseFor.get(away) + ag);
    baseAgainst.set(home, baseAgainst.get(home) + ag);
    baseAgainst.set(away, baseAgainst.get(away) + hg);
    if (hg > ag) basePoints.set(home, basePoints.get(home) + 3);
    else if (hg < ag) basePoints.set(away, basePoints.get(away) + 3);
    else {
      basePoints.set(home, basePoints.get(home) + 1);
      basePoints.set(away, basePoints.get(away) + 1);
    }
  }

  // 球员基线总数
  const playerBase = new Map();
  for (const pool of pools.values()) {
    for (const entry of pool) {
      playerBase.set(`${entry.team}::${entry.name}`, { goals: entry.baseGoals, assists: entry.baseAssists, mvp: entry.baseMvp });
    }
  }

  const championCount = new Map();
  const top3Count = new Map();
  const bootCount = new Map();
  const assistCount = new Map();
  const fmvpCount = new Map();
  for (const team of teams) {
    championCount.set(team, 0);
    top3Count.set(team, 0);
  }

  const runs = Number.isFinite(iterations) ? Math.max(1, Math.floor(iterations)) : DEFAULT_ITERATIONS;

  for (let run = 0; run < runs; run += 1) {
    const strength = new Map();
    for (const team of teams) {
      const base = baseStrength.get(team);
      strength.set(team, {
        attack: base.attack,
        defence: base.defence,
        points: basePoints.get(team) ?? 0,
        goalsFor: baseFor.get(team) ?? 0,
        goalsAgainst: baseAgainst.get(team) ?? 0,
      });
    }

    // 复制一份基线累计，模拟里往上加；key = `队::名`。
    const simGoals = new Map();
    for (const [key, entry] of playerBase) {
      simGoals.set(key, { ...entry });
    }

    for (const match of remaining) {
      const home = match.homeTeam;
      const away = match.awayTeam;
      const homeData = strength.get(home);
      const awayData = strength.get(away);
      if (!homeData || !awayData) continue;

      const lambdaHome = clamp(leagueAvg * homeData.attack * awayData.defence * adv, 0.15, 5.5);
      const lambdaAway = clamp((leagueAvg * awayData.attack * homeData.defence) / adv, 0.15, 5.5);
      const hg = poissonSample(lambdaHome, rng);
      const ag = poissonSample(lambdaAway, rng);

      homeData.goalsFor += hg;
      homeData.goalsAgainst += ag;
      awayData.goalsFor += ag;
      awayData.goalsAgainst += hg;
      if (hg > ag) homeData.points += 3;
      else if (hg < ag) awayData.points += 3;
      else {
        homeData.points += 1;
        awayData.points += 1;
      }

      // 把本场进球分配给队内球员（按历史进球份额）。
      for (const [team, goals] of [[home, hg], [away, ag]]) {
        const pool = pools.get(team) ?? [];
        if (pool.length === 0) continue;
        const weights = pool.map((entry) => entry.goalWeight);
        const assistWeights = pool.map((entry) => entry.assistWeight);
        for (let goal = 0; goal < goals; goal += 1) {
          const scorer = pickWeighted(weights, rng);
          if (scorer >= 0) simGoals.get(`${team}::${pool[scorer].name}`).goals += 1;
          const assister = pickWeighted(assistWeights, rng);
          if (assister >= 0) simGoals.get(`${team}::${pool[assister].name}`).assists += 1;
        }
      }

      // 全场最佳：倾向赢球一方，再按参与度抽人。
      const mvpTeam = hg > ag ? home : hg < ag ? away : rng() < 0.5 ? home : away;
      const mvpPool = pools.get(mvpTeam) ?? [];
      if (mvpPool.length > 0) {
        const picked = pickWeighted(mvpPool.map((entry) => entry.mvpWeight), rng);
        if (picked >= 0) simGoals.get(`${mvpTeam}::${mvpPool[picked].name}`).mvp += 1;
      }
    }

    const order = finalOrder(strength);
    championCount.set(order[0].team, (championCount.get(order[0].team) ?? 0) + 1);
    for (const row of order.slice(0, 3)) {
      top3Count.set(row.team, (top3Count.get(row.team) ?? 0) + 1);
    }

    // 球员奖项：一季结束看谁的总数最高。
    let bestBoot = null;
    let bestAssist = null;
    let bestFmvp = null;
    for (const [key, data] of simGoals) {
      if (!bestBoot || data.goals > bestBoot.data.goals || (data.goals === bestBoot.data.goals && data.assists > bestBoot.data.assists)) {
        bestBoot = { key, data };
      }
      if (!bestAssist || data.assists > bestAssist.data.assists || (data.assists === bestAssist.data.assists && data.goals > bestAssist.data.goals)) {
        bestAssist = { key, data };
      }
      if (!bestFmvp || data.mvp > bestFmvp.data.mvp || (data.mvp === bestFmvp.data.mvp && data.goals > bestFmvp.data.goals)) {
        bestFmvp = { key, data };
      }
    }
    if (bestBoot && bestBoot.data.goals > 0) bootCount.set(bestBoot.key, (bootCount.get(bestBoot.key) ?? 0) + 1);
    if (bestAssist && bestAssist.data.assists > 0) assistCount.set(bestAssist.key, (assistCount.get(bestAssist.key) ?? 0) + 1);
    if (bestFmvp && bestFmvp.data.mvp > 0) fmvpCount.set(bestFmvp.key, (fmvpCount.get(bestFmvp.key) ?? 0) + 1);
  }

  // 每队「已踢 / 还剩」，换算成「还剩多少比例」——收缩的强度就看它。
  const playedByTeam = new Map();
  const remainingByTeam = new Map();
  for (const team of teams) {
    playedByTeam.set(team, baseStats.get(team)?.played ?? 0);
    remainingByTeam.set(team, 0);
  }
  for (const match of remaining) {
    for (const side of ['home', 'away']) {
      const team = match[`${side}Team`];
      if (remainingByTeam.has(team)) remainingByTeam.set(team, remainingByTeam.get(team) + 1);
    }
  }
  const fractionOf = (team) => {
    const left = remainingByTeam.get(team) ?? 0;
    const total = (playedByTeam.get(team) ?? 0) + left;
    return total > 0 ? left / total : 0;
  };
  const oddFloor = finished ? MIN_ODDS : OPEN_MIN_ODDS;

  const championProbByTeam = softenProbabilities(
    teams.map((team) => ({ key: team, p: (championCount.get(team) ?? 0) / runs })),
    (row) => fractionOf(row.key)
  );
  const top3ProbByTeam = softenProbabilities(
    teams.map((team) => ({ key: team, p: (top3Count.get(team) ?? 0) / runs })),
    (row) => fractionOf(row.key)
  );

  const playerKeys = [...playerBase.keys()];
  const bootProbByPlayer = softenProbabilities(
    playerKeys.map((key) => ({ key, p: (bootCount.get(key) ?? 0) / runs })),
    (row) => fractionOf(row.key.split('::')[0])
  );
  const assistProbByPlayer = softenProbabilities(
    playerKeys.map((key) => ({ key, p: (assistCount.get(key) ?? 0) / runs })),
    (row) => fractionOf(row.key.split('::')[0])
  );
  const fmvpProbByPlayer = softenProbabilities(
    playerKeys.map((key) => ({ key, p: (fmvpCount.get(key) ?? 0) / runs })),
    (row) => fractionOf(row.key.split('::')[0])
  );

  const teamRows = teams
    .map((team) => {
      const championProb = championProbByTeam.get(team) ?? 0;
      const top3Prob = Math.min(1, top3ProbByTeam.get(team) ?? 0);
      return {
        team,
        championProb,
        top3Prob,
        championPercent: toPercent(championProb),
        top3Percent: toPercent(top3Prob),
        championOdd: toOdds(championProb, oddFloor),
        top3Odd: toOdds(top3Prob, oddFloor),
        points: basePoints.get(team) ?? 0,
        played: playedByTeam.get(team) ?? 0,
        remaining: remainingByTeam.get(team) ?? 0,
      };
    })
    .sort((left, right) => right.championProb - left.championProb || left.team.localeCompare(right.team, 'zh-Hans-CN'));

  const playerRows = playerKeys
    .map((key) => {
      const [team, name] = key.split('::');
      const bootProb = bootProbByPlayer.get(key) ?? 0;
      const assistProb = assistProbByPlayer.get(key) ?? 0;
      const fmvpProb = fmvpProbByPlayer.get(key) ?? 0;
      return {
        key,
        name,
        team,
        bootProb,
        assistProb,
        fmvpProb,
        bootPercent: toPercent(bootProb),
        assistPercent: toPercent(assistProb),
        fmvpPercent: toPercent(fmvpProb),
        bootOdd: toOdds(bootProb, oddFloor),
        assistOdd: toOdds(assistProb, oddFloor),
        fmvpOdd: toOdds(fmvpProb, oddFloor),
      };
    })
    .filter((row) => row.bootProb > 0 || row.assistProb > 0 || row.fmvpProb > 0)
    .sort((left, right) => right.bootProb - left.bootProb || right.assistProb - left.assistProb || right.fmvpProb - left.fmvpProb);

  return { available: true, finished, iterations: runs, teams: teamRows, players: playerRows };
}
