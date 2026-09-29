import { describe, expect, it } from 'vitest';
import { cardTotals, computeDisciplineStats, getSuspensionsBeforeMatch } from '../src/discipline.js';

function match(matchNumber, homeTeam, awayTeam, homePlayerCards = [], awayPlayerCards = [], isPlayed = true) {
  return { matchNumber, homeTeam, awayTeam, homePlayerCards, awayPlayerCards, isPlayed };
}

describe('discipline', () => {
  it('totals player cards', () => {
    expect(cardTotals([{ name: 'A', yellow: 2, red: 0 }, { name: 'B', yellow: 1, red: 1 }])).toEqual({ yellow: 3, red: 1 });
  });

  it('suspends a player for the team next match after three yellows', () => {
    const matches = [
      match(1, 'A', 'B', [{ name: '张三', yellow: 1, red: 0 }]),
      match(2, 'A', 'C', [{ name: '张三', yellow: 2, red: 0 }]),
      match(3, 'B', 'C'),
      match(4, 'A', 'D', [], [], false),
    ];
    expect(getSuspensionsBeforeMatch(matches, matches[3])).toMatchObject([
      { name: '张三', team: 'A', yellowCards: 3, pendingSuspension: 1 },
    ]);
  });

  it('uses a red-card suspension on the team next played match', () => {
    const matches = [
      match(1, 'A', 'B', [{ name: '张三', yellow: 0, red: 1 }]),
      match(2, 'C', 'D'),
      match(3, 'A', 'C', [], [], true),
      match(4, 'A', 'D', [], [], false),
    ];
    expect(getSuspensionsBeforeMatch(matches, matches[3])).toEqual([]);
    expect(computeDisciplineStats(matches).find((item) => item.name === '张三')).toMatchObject({ redCards: 1, servedSuspensions: 1, pendingSuspension: 0 });
  });
});
