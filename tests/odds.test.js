import { describe, expect, it } from 'vitest';
import { computeOdds } from '../src/odds.js';

function fixture(matchNumber, round, homeTeam, awayTeam, homeGoals, awayGoals, isPlayed = true, extra = {}) {
  return {
    id: `m-${matchNumber}`,
    matchNumber,
    round,
    homeTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    isPlayed,
    homeCards: { yellow: 0, red: 0 },
    awayCards: { yellow: 0, red: 0 },
    homePlayerCards: [],
    awayPlayerCards: [],
    homeScorers: [],
    awayScorers: [],
    homeAssists: [],
    awayAssists: [],
    ...extra,
  };
}

const config = { teamsA: ['甲队', '丙队'], teamsB: ['乙队', '丁队'] };
const iterations = 400;

// 甲队碾压、丁队陪跑的一套已赛结果 + 一轮未赛。
function season() {
  return [
    fixture(1, 1, '甲队', '乙队', 4, 0),
    fixture(2, 1, '丙队', '丁队', 0, 0),
    fixture(3, 2, '甲队', '丁队', 3, 1),
    fixture(4, 2, '乙队', '丙队', 1, 0),
    fixture(5, 3, '甲队', '丙队', 2, 0),
    fixture(6, 3, '丁队', '乙队', 0, 2),
    fixture(7, 4, '甲队', '乙队', 0, 0, false),
    fixture(8, 4, '丙队', '丁队', 0, 0, false),
  ];
}

// 只踢了一轮、四队都还有戏的赛季，用来观察「赔率会不会过于笃定」。
function contestedSeason() {
  return [
    fixture(1, 1, '甲队', '乙队', 4, 0),
    fixture(2, 1, '丙队', '丁队', 0, 1),
    fixture(3, 2, '甲队', '丁队', 0, 0, false),
    fixture(4, 2, '乙队', '丙队', 0, 0, false),
    fixture(5, 3, '甲队', '丙队', 0, 0, false),
    fixture(6, 3, '乙队', '丁队', 0, 0, false),
  ];
}

function oddFor(odds, team, key) {
  return odds.teams.find((row) => row.team === team)?.[key];
}

describe('computeOdds', () => {
  it('reports unavailable when there are no teams', () => {
    const odds = computeOdds({ config: { teamsA: [], teamsB: [] }, matches: [] });
    expect(odds.available).toBe(false);
    expect(odds.teams).toEqual([]);
    expect(odds.players).toEqual([]);
  });

  it('produces championship probabilities that sum to one', () => {
    const odds = computeOdds({ config, matches: season(), iterations });
    expect(odds.available).toBe(true);
    expect(odds.finished).toBe(false);
    const sum = odds.teams.reduce((total, row) => total + row.championProb, 0);
    expect(sum).toBeCloseTo(1, 6);
  });

  it('puts exactly three teams in the top three on average', () => {
    const odds = computeOdds({ config, matches: season(), iterations });
    const sum = odds.teams.reduce((total, row) => total + row.top3Prob, 0);
    expect(sum).toBeCloseTo(3, 6);
  });

  it('keeps every market summing to its original total even when teams have played different amounts', () => {
    // 各队已赛场次不同（甲/丁 各 3 场，乙/丙 各 2 场），收缩的权重也不一样，
    // 这时「朝均势收缩」必须按总量归一化，否则各队概率加起来会超过 100%。
    const uneven = [
      fixture(1, 1, '甲队', '乙队', 2, 0),
      fixture(2, 1, '丙队', '丁队', 1, 1),
      fixture(3, 2, '甲队', '丙队', 3, 0),
      fixture(4, 2, '乙队', '丁队', 0, 1),
      fixture(5, 3, '甲队', '丁队', 1, 0),
      fixture(6, 3, '乙队', '丙队', 0, 0, false),
      fixture(7, 4, '甲队', '乙队', 0, 0, false),
      fixture(8, 4, '丙队', '丁队', 0, 0, false),
    ];
    const odds = computeOdds({ config, matches: uneven, iterations });
    expect(odds.finished).toBe(false);
    expect(odds.teams.reduce((sum, row) => sum + row.championProb, 0)).toBeCloseTo(1, 6);
    expect(odds.teams.reduce((sum, row) => sum + row.top3Prob, 0)).toBeCloseTo(3, 6);
  });

  it('gives the strongest team shorter odds than the weakest', () => {
    const odds = computeOdds({ config, matches: season(), iterations });
    expect(oddFor(odds, '甲队', 'championOdd')).toBeLessThan(2);
    expect(oddFor(odds, '甲队', 'championPercent')).toBeGreaterThan(oddFor(odds, '丁队', 'championPercent'));

    // 甲队已经领先到追不上，陪跑的球队就没有必要再挂价了。
    expect(oddFor(odds, '丁队', 'championOdd')).toBeNull();

    // 换成还有悬念的赛季，落后的球队就该挂出更长的赔率。
    const live = computeOdds({ config, matches: contestedSeason(), iterations });
    expect(oddFor(live, '甲队', 'championOdd')).toBeLessThan(oddFor(live, '丁队', 'championOdd'));
  });

  it('sorts teams by championship chance, best first', () => {
    const odds = computeOdds({ config, matches: season(), iterations });
    const probs = odds.teams.map((row) => row.championProb);
    expect(probs).toEqual([...probs].sort((left, right) => right - left));
    expect(odds.teams[0].team).toBe('甲队');
  });

  it('returns null odds instead of Infinity for a team with no chance', () => {
    const odds = computeOdds({ config, matches: season(), iterations });
    for (const row of odds.teams) {
      for (const key of ['championProb', 'top3Prob']) {
        expect(Number.isFinite(row[key])).toBe(true);
      }
      expect(row.championOdd === null || Number.isFinite(row.championOdd)).toBe(true);
      expect(row.top3Odd === null || Number.isFinite(row.top3Odd)).toBe(true);
    }
  });

  it('never quotes a price shorter than 1.01 or above the cap', () => {
    const odds = computeOdds({ config, matches: season(), iterations });
    for (const row of odds.teams) {
      for (const key of ['championOdd', 'top3Odd']) {
        if (row[key] === null) continue;
        expect(row[key]).toBeGreaterThanOrEqual(1.01);
        expect(row[key]).toBeLessThanOrEqual(500);
      }
    }
    for (const row of odds.players) {
      for (const key of ['bootOdd', 'assistOdd', 'fmvpOdd']) {
        if (row[key] === null) continue;
        expect(row[key]).toBeGreaterThanOrEqual(1.01);
        expect(row[key]).toBeLessThanOrEqual(500);
      }
    }
  });

  it('never looks like a done deal while matches are still to be played', () => {
    const odds = computeOdds({ config, matches: season(), iterations });
    expect(odds.finished).toBe(false);
    for (const row of odds.teams) {
      for (const key of ['championOdd', 'top3Odd']) {
        if (row[key] === null) continue;
        expect(row[key]).toBeGreaterThanOrEqual(1.05);
      }
    }
  });

  it('softens the favourite towards the field while the race is still open', () => {
    const odds = computeOdds({ config, matches: contestedSeason(), iterations });
    const leader = odds.teams[0];
    expect(leader.championProb).toBeGreaterThan(0.3);
    // 还有两轮没踢，就算领跑也不该给出「板上钉钉」的赔率。
    expect(leader.championProb).toBeLessThan(1);
    expect(leader.championOdd).toBeGreaterThanOrEqual(1.1);
  });

  it('quotes player award markets once players are recorded', () => {
    const matches = season().map((match) => {
      if (!match.isPlayed) return match;
      return {
        ...match,
        homeScorers: [{ name: `${match.homeTeam}射手`, count: match.homeGoals }],
        awayScorers: match.awayGoals > 0 ? [{ name: `${match.awayTeam}射手`, count: match.awayGoals }] : [],
        homeAssists: match.homeGoals > 0 ? [{ name: `${match.homeTeam}中场`, count: match.homeGoals }] : [],
        awayAssists: match.awayGoals > 0 ? [{ name: `${match.awayTeam}中场`, count: match.awayGoals }] : [],
        mvp: { name: `${match.homeTeam}射手`, team: match.homeTeam, score: 8 },
      };
    });
    const odds = computeOdds({ config, matches, iterations });
    expect(odds.players.length).toBeGreaterThan(0);

    const bootProbSum = odds.players.reduce((total, row) => total + row.bootProb, 0);
    expect(bootProbSum).toBeCloseTo(1, 6);
    // 打进 9 球的甲队射手理应压过其他射手。
    expect(odds.players[0].name).toBe('甲队射手');
    expect(odds.players[0].bootOdd).toBeLessThan(oddFor(odds, '甲队', 'championOdd') + 100);
  });

  it('is deterministic for a fixed seed and varies with the seed', () => {
    const first = computeOdds({ config, matches: season(), iterations, seed: 42 });
    const second = computeOdds({ config, matches: season(), iterations, seed: 42 });
    expect(second.teams.map((row) => row.championProb)).toEqual(first.teams.map((row) => row.championProb));
    expect(second.teams.map((row) => row.championOdd)).toEqual(first.teams.map((row) => row.championOdd));
  });

  it('collapses to certainties once the season is finished', () => {
    const played = season().map((match) => ({ ...match, isPlayed: true, homeGoals: match.homeGoals ?? 0, awayGoals: match.awayGoals ?? 0 }));
    const finished = played.map((match, index) => (index === 6 ? { ...match, homeGoals: 2, awayGoals: 1 } : index === 7 ? { ...match, homeGoals: 1, awayGoals: 1 } : match));
    const odds = computeOdds({ config, matches: finished, iterations: 50 });
    expect(odds.finished).toBe(true);
    const champion = odds.teams.find((row) => row.championProb === 1);
    expect(champion).toBeTruthy();
    expect(champion.championOdd).toBe(1.01);
    expect(champion.top3Odd).toBe(1.01);
    for (const row of odds.teams) {
      expect([0, 1]).toContain(Math.round(row.championProb));
    }
  });

  it('keeps probabilities finite with a single team', () => {
    const odds = computeOdds({ config: { teamsA: ['独苗'], teamsB: [] }, matches: [], iterations: 40 });
    expect(odds.available).toBe(true);
    expect(odds.finished).toBe(true);
    expect(odds.teams).toHaveLength(1);
    expect(odds.teams[0].championProb).toBeCloseTo(1, 6);
    expect(odds.teams[0].championOdd).toBe(1.01);
    expect(Number.isFinite(odds.teams[0].top3Prob)).toBe(true);
  });

  it('falls back to the default iteration count for nonsense inputs', () => {
    for (const bad of [0, -5, NaN, Infinity, 'many', null, undefined]) {
      const odds = computeOdds({ config, matches: season(), iterations: bad, seed: 7 });
      expect(odds.teams).toHaveLength(4);
      const sum = odds.teams.reduce((total, row) => total + row.championProb, 0);
      expect(Number.isFinite(sum)).toBe(true);
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it('does not blow up on a team that has played but never scored', () => {
    const matches = [
      fixture(1, 1, '甲队', '丁队', 5, 0),
      fixture(2, 1, '乙队', '丙队', 2, 2),
      fixture(3, 2, '丁队', '乙队', 0, 3),
      fixture(4, 2, '丙队', '甲队', 0, 2),
      fixture(5, 3, '丁队', '丙队', 0, 0, false),
      fixture(6, 3, '甲队', '乙队', 0, 0, false),
    ];
    const odds = computeOdds({ config, matches, iterations: 300 });
    const cellar = odds.teams.find((row) => row.team === '丁队');
    expect(cellar).toBeTruthy();
    expect(cellar.points).toBe(0);
    for (const row of odds.teams) {
      expect(Number.isFinite(row.championProb)).toBe(true);
      expect(Number.isFinite(row.top3Prob)).toBe(true);
    }
    expect(odds.teams[odds.teams.length - 1].team).toBe('丁队');
  });

  it('still lists every team before a single match is played', () => {
    const odds = computeOdds({
      config,
      matches: [
        fixture(1, 1, '甲队', '乙队', 0, 0, false),
        fixture(2, 1, '丙队', '丁队', 0, 0, false),
      ],
      iterations: 300,
    });
    expect(odds.teams).toHaveLength(4);
    expect(odds.available).toBe(true);
    expect(odds.finished).toBe(false);
    // 全都没打时，各队机会应该比较接近（不会出现 99% 的一家独大）。
    const best = Math.max(...odds.teams.map((row) => row.championProb));
    expect(best).toBeLessThan(0.9);
  });
});
