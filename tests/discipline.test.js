import { describe, expect, it } from 'vitest';
import { buildSuspensionIndex, cardTotals, computeDisciplineStats, computeTeamDiscipline, getSuspensionsBeforeMatch } from '../src/discipline.js';

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

  it('summarizes a team discipline record, flagging served bans and one-yellow risk', () => {
    const matches = [
      // 张三：两张黄牌（再吃一张就停赛）；李四：三黄已停赛一场
      match(1, 'A', 'B', [{ name: '张三', yellow: 2, red: 0 }, { name: '李四', yellow: 3, red: 0 }]),
      match(2, 'A', 'C'),
      match(3, 'A', 'D'),
    ];

    const team = computeTeamDiscipline(matches, 'A');
    expect(team.map((row) => row.name)).toEqual(['李四', '张三']);

    const lisi = team.find((row) => row.name === '李四');
    expect(lisi).toMatchObject({ yellowCards: 3, servedSuspensions: 1, pendingSuspension: 0, oneYellowFromBan: false });

    const zhangsan = team.find((row) => row.name === '张三');
    expect(zhangsan).toMatchObject({ yellowCards: 2, pendingSuspension: 0, oneYellowFromBan: true });

    expect(computeTeamDiscipline(matches, 'B')).toEqual([]);
  });
});

describe('buildSuspensionIndex', () => {
  it('maps each played match to the players suspended entering it', () => {
    const matches = [
      match(1, 'A', 'B', [{ name: '张三', yellow: 0, red: 1 }]),
      match(2, 'C', 'D'),
      match(3, 'A', 'C'),
      match(4, 'A', 'D'),
    ];

    const index = buildSuspensionIndex(matches);
    // 红牌在第 1 场产生，只作用于球队 A 的下一场（第 3 场）；
    // 第 2 场 A 队没有比赛，不占用停赛。
    expect(index.get(1).size).toBe(0);
    expect([...index.get(3)]).toEqual(['A::张三']);
    expect(index.get(4).size).toBe(0);
  });

  it('is empty for matches without any cards', () => {
    const index = buildSuspensionIndex([match(1, 'A', 'B'), match(2, 'A', 'C')]);
    expect(index.get(1).size).toBe(0);
    expect(index.get(2).size).toBe(0);
  });

  it('carries a suspension forward when the team sits out several rounds', () => {
    const matches = [
      match(1, 'A', 'B', [{ name: '张三', yellow: 0, red: 1 }]),
      match(2, 'C', 'D'),
      match(3, 'C', 'D'),
      match(4, 'A', 'C'),
    ];
    const index = buildSuspensionIndex(matches);
    expect([...index.get(4)]).toEqual(['A::张三']);
  });

  it('triggers a second ban exactly on the sixth yellow card', () => {
    const yellow = [{ name: '张三', yellow: 1, red: 0 }];
    const matches = [
      match(1, 'A', 'B', yellow),
      match(2, 'A', 'C', yellow),
      match(3, 'A', 'D', yellow),
      match(4, 'A', 'E'), // 第 3 黄对应的停赛在这场上执行
      match(5, 'A', 'F', yellow),
      match(6, 'A', 'G', yellow),
      match(7, 'A', 'H', yellow),
      match(8, 'A', 'I'), // 第 6 黄对应的停赛在这场上执行
    ];

    const index = buildSuspensionIndex(matches);
    expect([...index.get(4)]).toEqual(['A::张三']);
    expect(index.get(5).size).toBe(0);
    expect(index.get(6).size).toBe(0);
    expect(index.get(7).size).toBe(0);
    expect([...index.get(8)]).toEqual(['A::张三']);

    expect(computeDisciplineStats(matches).find((row) => row.name === '张三')).toMatchObject({
      yellowCards: 6,
      servedSuspensions: 2,
      pendingSuspension: 0,
    });
  });
});
