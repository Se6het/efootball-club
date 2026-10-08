import { describe, expect, it } from 'vitest';
import { computeTeamForm, computeTeamFormMap, computeUpcomingFixtures, summarizeForm } from '../src/form.js';

function match(matchNumber, homeTeam, awayTeam, homeGoals, awayGoals, isPlayed = true) {
  return { matchNumber, round: matchNumber, homeTeam, awayTeam, homeGoals, awayGoals, isPlayed };
}

const matches = [
  match(1, 'A', 'B', 2, 0),
  match(2, 'B', 'A', 1, 1),
  match(3, 'A', 'C', 0, 3),
  match(4, 'D', 'A', 2, 2),
  match(5, 'A', 'D', 1, 0),
  match(6, 'C', 'A', 0, 0, false),
];

describe('computeTeamForm', () => {
  it('returns the last N results from the team perspective, oldest first', () => {
    const form = computeTeamForm(matches, 'A');
    expect(form.map((item) => item.result)).toEqual(['胜', '平', '负', '平', '胜']);
    expect(form.map((item) => item.opponent)).toEqual(['B', 'B', 'C', 'D', 'D']);
    expect(form.map((item) => item.isHome)).toEqual([true, false, true, false, true]);
  });

  it('limits to the requested count and takes the most recent matches', () => {
    const form = computeTeamForm(matches, 'A', 3);
    expect(form.map((item) => item.matchNumber)).toEqual([3, 4, 5]);
    expect(form.map((item) => item.result)).toEqual(['负', '平', '胜']);
  });

  it('returns every played match when count is zero or negative', () => {
    expect(computeTeamForm(matches, 'A', 0)).toHaveLength(5);
    expect(computeTeamForm(matches, 'A', -1)).toHaveLength(5);
  });

  it('ignores unplayed matches and unknown teams', () => {
    expect(computeTeamForm(matches, 'A')).not.toContainEqual(expect.objectContaining({ matchNumber: 6 }));
    expect(computeTeamForm(matches, '不存在')).toEqual([]);
  });
});

describe('computeUpcomingFixtures', () => {
  it('returns the next N fixtures in order', () => {
    expect(computeUpcomingFixtures(matches, 'A', 5)).toEqual([
      { matchNumber: 6, round: 6, opponent: 'C', isHome: false },
    ]);
  });

  it('returns an empty list when the team has no remaining fixtures', () => {
    expect(computeUpcomingFixtures(matches, 'B')).toEqual([]);
  });
});

describe('summarizeForm', () => {
  it('counts wins, draws, losses and recent points', () => {
    const summary = summarizeForm(computeTeamForm(matches, 'A'));
    expect(summary).toEqual({ wins: 2, draws: 2, losses: 1, points: 8 });
  });

  it('handles an empty form', () => {
    expect(summarizeForm([])).toEqual({ wins: 0, draws: 0, losses: 0, points: 0 });
  });
});

describe('computeTeamFormMap', () => {
  it('maps each team to its own form', () => {
    const map = computeTeamFormMap(matches, ['A', 'B'], 2);
    expect(map.get('A').map((item) => item.result)).toEqual(['平', '胜']);
    expect(map.get('B').map((item) => item.result)).toEqual(['负', '平']);
  });
});
