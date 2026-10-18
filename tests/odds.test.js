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

  it('gives the strongest team shorter odds than the weakest', () => {
    const odds = computeOdds({ config, matches: season(), iterations });
    expect(oddFor(odds, '甲队', 'championOdd')).toBeLessThan(2);
    expect(oddFor(odds, '甲队', 'championPercent')).toBeGreaterThan(oddFor(odds, '丁队', 'championPercent'));

    // 甲队已经领先到追不上，陪跑的球队就没有必要再挂价了。
    expect(oddFor(odds, '丁队', 'championOdd')).toBeNull();

    // 换成还有悬念的赛季，落后的球队就该挂出更长的赔率。
    const contested = [
      fixture(1, 1, '甲队', '乙队', 4, 0),
      fixture(2, 1, '丙队', '丁队', 0, 1),
      fixture(3, 2, '甲队', '丁队', 0, 0, false),
      fixture(4, 2, '乙队', '丙队', 0, 0, false),
      fixture(5, 3, '甲队', '丙队', 0, 0, false),
      fixture(6, 3, '乙队', '丁队', 0, 0, false),
    ];
    const live = computeOdds({ config, matches: contested, iterations });
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
