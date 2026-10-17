import { describe, expect, it } from 'vitest';
import { computeRankProgression, computeStandings, rankTeams } from '../src/standings.js';

function createMatch(homeTeam, awayTeam, homeGoals, awayGoals, homeCards = { yellow: 0, red: 0 }, awayCards = { yellow: 0, red: 0 }, round = 1) {
  return {
    isPlayed: true,
    homeTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    homeCards,
    awayCards,
    round,
    homeScorers: [],
    awayScorers: [],
    homeAssists: [],
    awayAssists: [],
  };
}

describe('computeStandings', () => {
  it('computes core totals', () => {
    const standings = computeStandings(
      { teamsA: ['巴西'], teamsB: ['巴塞罗那'] },
      [createMatch('巴西', '巴塞罗那', 2, 1, { yellow: 1, red: 0 }, { yellow: 0, red: 1 })]
    );

    expect(standings.find((team) => team.team === '巴西')).toMatchObject({ points: 3, wins: 1, goalsFor: 2, goalsAgainst: 1, fairPlayPoints: 1 });
    expect(standings.find((team) => team.team === '巴塞罗那')).toMatchObject({ points: 0, losses: 1, goalsFor: 1, goalsAgainst: 2, fairPlayPoints: 3 });
  });

  it('counts yellow cards as 1 and red cards as 3', () => {
    const standings = computeStandings(
      { teamsA: ['巴西'], teamsB: ['巴塞罗那'] },
      [createMatch('巴西', '巴塞罗那', 0, 0, { yellow: 2, red: 1 }, { yellow: 0, red: 0 })]
    );

    expect(standings.find((team) => team.team === '巴西').fairPlayPoints).toBe(5);
  });

  it('returns zeroed stats for unplayed teams', () => {
    const standings = computeStandings(
      { teamsA: ['巴西'], teamsB: ['巴塞罗那'] },
      []
    );
    expect(standings).toHaveLength(2);
    expect(standings[0]).toMatchObject({ played: 0, points: 0, goalDifference: 0 });
  });
});

describe('rankTeams', () => {
  it('orders by points and goal difference', () => {
    const ranked = rankTeams(
      { teamsA: ['A', 'B'], teamsB: ['C', 'D'] },
      [
        createMatch('A', 'C', 2, 0),
        createMatch('B', 'D', 0, 1),
      ]
    );

    expect(ranked[0].team).toBe('A');
    expect(ranked[0].rank).toBe(1);
  });

  it('uses head-to-head for tied teams', () => {
    const ranked = rankTeams(
      { teamsA: ['A'], teamsB: ['B'] },
      [
        createMatch('A', 'B', 2, 1),
        createMatch('B', 'A', 3, 1),
      ]
    );

    expect(ranked[0].team).toBe('B');
    expect(ranked[1].team).toBe('A');
  });

  it('marks a fully tied two-team group for playoff after the season is complete', () => {
    const ranked = rankTeams(
      { teamsA: ['A'], teamsB: ['B'] },
      [
        createMatch('A', 'B', 1, 1),
        createMatch('B', 'A', 1, 1),
      ]
    );

    expect(ranked[0].needsPlayoff).toBe(true);
    expect(ranked[1].needsPlayoff).toBe(true);
  });

  it('does not mark playoff before all matches are complete', () => {
    const unplayed = {
      ...createMatch('B', 'A', 0, 0),
      isPlayed: false,
    };
    const ranked = rankTeams(
      { teamsA: ['A'], teamsB: ['B'] },
      [createMatch('A', 'B', 1, 1), unplayed]
    );

    expect(ranked[0].needsPlayoff).toBe(false);
    expect(ranked[1].needsPlayoff).toBe(false);
  });

  it('uses mini-table for three-team ties', () => {
    const ranked = rankTeams(
      { teamsA: ['A', 'B'], teamsB: ['C', 'D'] },
      [
        createMatch('A', 'B', 2, 0),
        createMatch('B', 'C', 2, 0),
        createMatch('C', 'A', 1, 0),
        createMatch('D', 'A', 0, 1),
        createMatch('D', 'B', 0, 1),
        createMatch('D', 'C', 0, 1),
      ]
    );

    expect(ranked[0].team).toBe('A');
    expect(ranked[1].team).toBe('B');
    expect(ranked[2].team).toBe('C');
  });

  it('marks a fully tied multi-team group for playoff after the season is complete', () => {
    const ranked = rankTeams(
      { teamsA: ['A', 'B'], teamsB: ['C'] },
      [
        createMatch('A', 'B', 1, 1),
        createMatch('B', 'C', 1, 1),
        createMatch('C', 'A', 1, 1),
      ]
    );

    expect(ranked.every((team) => team.needsPlayoff)).toBe(true);
  });
});

describe('computeRankProgression', () => {
  it('tracks a team rank snapshot after each completed round', () => {
    const config = { teamsA: ['A', 'B'], teamsB: ['C', 'D'] };
    const matches = [
      createMatch('A', 'C', 3, 0, undefined, undefined, 1),
      createMatch('B', 'D', 0, 0, undefined, undefined, 1),
      createMatch('A', 'D', 0, 2, undefined, undefined, 2),
      createMatch('C', 'B', 1, 1, undefined, undefined, 2),
    ];

    const progression = computeRankProgression(config, matches, 'A');
    expect(progression.map((point) => point.round)).toEqual([1, 2]);
    expect(progression[0]).toMatchObject({ round: 1, rank: 1, points: 3, isLeader: true });
    // 第 2 轮 A 输球：排名下滑，但积分仍是 3。
    expect(progression[1].rank).toBeGreaterThanOrEqual(2);
    expect(progression[1].points).toBe(3);
    expect(progression[1].isLeader).toBe(false);
  });

  it('returns an empty progression before any match is played', () => {
    const config = { teamsA: ['A'], teamsB: ['B'] };
    const unplayed = { ...createMatch('A', 'B', 0, 0), isPlayed: false, round: 1 };
    expect(computeRankProgression(config, [unplayed], 'A')).toEqual([]);
  });
});
