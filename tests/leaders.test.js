import { describe, expect, it } from 'vitest';
import { collectKnownPlayers, computeLeaders, computePlayerDetail, computePlayerStats, computeTeamLeaders, validateContributionTotals, validateMvpSelection } from '../src/leaders.js';

describe('validateContributionTotals', () => {
  it('accepts matching scorer totals', () => {
    expect(
      validateContributionTotals({
        homeGoals: 2,
        awayGoals: 1,
        homeScorers: [{ name: 'A', count: 2 }],
        awayScorers: [{ name: 'B', count: 1 }],
        homeAssists: [{ name: 'C', count: 1 }],
        awayAssists: [{ name: 'D', count: 1 }],
      })
    ).toBeNull();
  });

  it('rejects mismatched scorer totals', () => {
    expect(
      validateContributionTotals({
        homeGoals: 2,
        awayGoals: 1,
        homeScorers: [{ name: 'A', count: 1 }],
        awayScorers: [{ name: 'B', count: 1 }],
        homeAssists: [],
        awayAssists: [],
      })
    ).toContain('主队进球数');
  });

  it('rejects assist totals above goals', () => {
    expect(
      validateContributionTotals({
        homeGoals: 1,
        awayGoals: 1,
        homeScorers: [{ name: 'A', count: 1 }],
        awayScorers: [{ name: 'B', count: 1 }],
        homeAssists: [{ name: 'C', count: 2 }],
        awayAssists: [{ name: 'D', count: 1 }],
      })
    ).toContain('主队助攻总数');
  });
});

describe('validateMvpSelection', () => {
  it('accepts a complete MVP selection', () => {
    expect(validateMvpSelection({ mvp: { name: '张三', team: '皇家马德里', score: 8.4 } })).toBeNull();
  });

  it('rejects incomplete MVP data', () => {
    expect(validateMvpSelection({ mvp: { name: '', team: '皇家马德里', score: 8.4 } })).toContain('MVP');
  });

  it('rejects MVP scores above 10', () => {
    expect(validateMvpSelection({ mvp: { name: '张三', team: '皇家马德里', score: 10.1 } })).toContain('MVP');
  });
});

describe('computeLeaders', () => {
  it('aggregates scorer and assist counts', () => {
    const leaders = computeLeaders([
      {
        isPlayed: true,
        homeTeam: '皇家马德里',
        awayTeam: '巴塞罗那',
        homeScorers: [{ name: '张三', count: 2 }],
        awayScorers: [{ name: '李四', count: 1 }],
        homeAssists: [{ name: '王五', count: 1 }],
        awayAssists: [{ name: '赵六', count: 1 }],
      },
      {
        isPlayed: true,
        homeTeam: '拜仁慕尼黑',
        awayTeam: '巴塞罗那',
        homeScorers: [{ name: '孙八', count: 1 }],
        awayScorers: [{ name: '李四', count: 2 }],
        homeAssists: [{ name: '钱七', count: 1 }],
        awayAssists: [{ name: '赵六', count: 1 }],
      },
      {
        isPlayed: false,
        homeTeam: '马德里竞技',
        awayTeam: '阿贾克斯',
        homeScorers: [{ name: '无效', count: 99 }],
        awayScorers: [],
        homeAssists: [],
        awayAssists: [],
      },
    ]);

    expect(leaders.scorerList[0]).toEqual({
      name: '李四',
      team: '巴塞罗那',
      goals: 3,
      assists: 0,
      mvpCount: 0,
      averageScore: 0,
      count: 3,
    });
    expect(leaders.assistList[0]).toEqual({
      name: '赵六',
      team: '巴塞罗那',
      goals: 0,
      assists: 2,
      mvpCount: 0,
      averageScore: 0,
      count: 2,
    });
  });

  it('returns empty lists when nothing is played', () => {
    expect(computeLeaders([{ isPlayed: false, homeScorers: [], awayScorers: [], homeAssists: [], awayAssists: [] }])).toEqual({ scorerList: [], assistList: [], mvpList: [] });
  });

  it('uses assists as the tie-breaker for scorers', () => {
    expect(
      computeLeaders([
        {
          isPlayed: true,
          homeTeam: '皇家马德里',
          awayTeam: '巴塞罗那',
          homeScorers: [{ name: '张三', count: 3 }],
          awayScorers: [{ name: '李四', count: 3 }],
          homeAssists: [{ name: '张三', count: 1 }],
          awayAssists: [{ name: '李四', count: 2 }],
        },
      ]).scorerList
    ).toEqual([
      {
        name: '李四',
        team: '巴塞罗那',
        goals: 3,
        assists: 2,
        mvpCount: 0,
        averageScore: 0,
        count: 3,
      },
      {
        name: '张三',
        team: '皇家马德里',
        goals: 3,
        assists: 1,
        mvpCount: 0,
        averageScore: 0,
        count: 3,
      },
    ]);
  });

  it('uses goals as the tie-breaker for assisters', () => {
    expect(
      computeLeaders([
        {
          isPlayed: true,
          homeTeam: '皇家马德里',
          awayTeam: '巴塞罗那',
          homeScorers: [{ name: '张三', count: 2 }],
          awayScorers: [{ name: '李四', count: 3 }],
          homeAssists: [{ name: '张三', count: 2 }],
          awayAssists: [{ name: '李四', count: 2 }],
        },
      ]).assistList
    ).toEqual([
      {
        name: '李四',
        team: '巴塞罗那',
        goals: 3,
        assists: 2,
        mvpCount: 0,
        averageScore: 0,
        count: 2,
      },
      {
        name: '张三',
        team: '皇家马德里',
        goals: 2,
        assists: 2,
        mvpCount: 0,
        averageScore: 0,
        count: 2,
      },
    ]);
  });

  it('ranks MVPs by count and then average rating', () => {
    expect(
      computeLeaders([
        {
          isPlayed: true,
          homeTeam: '皇家马德里',
          awayTeam: '巴塞罗那',
          homeScorers: [],
          awayScorers: [],
          homeAssists: [],
          awayAssists: [],
          mvp: { name: '张三', team: '皇家马德里', score: 8.4 },
        },
        {
          isPlayed: true,
          homeTeam: '拜仁慕尼黑',
          awayTeam: '巴塞罗那',
          homeScorers: [],
          awayScorers: [],
          homeAssists: [],
          awayAssists: [],
          mvp: { name: '李四', team: '拜仁慕尼黑', score: 7.9 },
        },
        {
          isPlayed: true,
          homeTeam: '皇家马德里',
          awayTeam: '巴塞罗那',
          homeScorers: [],
          awayScorers: [],
          homeAssists: [],
          awayAssists: [],
          mvp: { name: '张三', team: '皇家马德里', score: 8.1 },
        },
        {
          isPlayed: true,
          homeTeam: '拜仁慕尼黑',
          awayTeam: '巴塞罗那',
          homeScorers: [],
          awayScorers: [],
          homeAssists: [],
          awayAssists: [],
          mvp: { name: '李四', team: '拜仁慕尼黑', score: 8.6 },
        },
      ]).mvpList
    ).toEqual([
      { name: '李四', team: '拜仁慕尼黑', count: 2, averageScore: 8.25 },
      { name: '张三', team: '皇家马德里', count: 2, averageScore: 8.25 },
    ]);
  });
});

describe('computePlayerStats', () => {
  it('aggregates goals and assists for award calculation', () => {
    expect(
      computePlayerStats([
        {
          isPlayed: true,
          homeTeam: '皇家马德里',
          awayTeam: '巴塞罗那',
          homeScorers: [{ name: '张三', count: 2 }],
          awayScorers: [{ name: '李四', count: 2 }],
          homeAssists: [{ name: '张三', count: 1 }],
          awayAssists: [{ name: '李四', count: 2 }],
          mvp: { name: '张三', team: '皇家马德里', score: 8.2 },
        },
        {
          isPlayed: true,
          homeTeam: '拜仁慕尼黑',
          awayTeam: '巴塞罗那',
          homeScorers: [{ name: '王五', count: 2 }],
          awayScorers: [{ name: '李四', count: 1 }],
          homeAssists: [{ name: '王五', count: 2 }],
          awayAssists: [{ name: '李四', count: 1 }],
          mvp: { name: '李四', team: '巴塞罗那', score: 7.8 },
        },
      ])
    ).toEqual([
      { name: '张三', team: '皇家马德里', goals: 2, assists: 1, mvpCount: 1, mvpScoreTotal: 8.2 },
      { name: '李四', team: '巴塞罗那', goals: 3, assists: 3, mvpCount: 1, mvpScoreTotal: 7.8 },
      { name: '王五', team: '拜仁慕尼黑', goals: 2, assists: 2, mvpCount: 0, mvpScoreTotal: 0 },
    ]);
  });

  it('keeps same-name players from different teams separate', () => {
    expect(
      computePlayerStats([
        {
          isPlayed: true,
          homeTeam: '皇家马德里',
          awayTeam: '巴塞罗那',
          homeScorers: [{ name: '张三', count: 2 }],
          awayScorers: [],
          homeAssists: [],
          awayAssists: [],
          mvp: { name: '张三', team: '皇家马德里', score: 8.5 },
        },
        {
          isPlayed: true,
          homeTeam: '拜仁慕尼黑',
          awayTeam: '曼城',
          homeScorers: [{ name: '张三', count: 1 }],
          awayScorers: [],
          homeAssists: [],
          awayAssists: [],
          mvp: { name: '张三', team: '拜仁慕尼黑', score: 7.5 },
        },
      ])
    ).toEqual([
      { name: '张三', team: '皇家马德里', goals: 2, assists: 0, mvpCount: 1, mvpScoreTotal: 8.5 },
      { name: '张三', team: '拜仁慕尼黑', goals: 1, assists: 0, mvpCount: 1, mvpScoreTotal: 7.5 },
    ]);
  });
});

describe('computeTeamLeaders', () => {
  const matches = [
    {
      isPlayed: true,
      homeTeam: '皇家马德里',
      awayTeam: '巴塞罗那',
      homeScorers: [{ name: '张三', count: 2 }],
      awayScorers: [{ name: '李四', count: 1 }],
      homeAssists: [{ name: '王五', count: 1 }],
      awayAssists: [{ name: '赵六', count: 1 }],
      mvp: { name: '张三', team: '皇家马德里', score: 8.4 },
    },
    {
      isPlayed: true,
      homeTeam: '拜仁慕尼黑',
      awayTeam: '皇家马德里',
      homeScorers: [{ name: '孙八', count: 1 }],
      awayScorers: [{ name: '张三', count: 1 }],
      homeAssists: [{ name: '钱七', count: 1 }],
      awayAssists: [{ name: '王五', count: 1 }],
      mvp: { name: '张三', team: '皇家马德里', score: 8.0 },
    },
  ];

  it('returns only the requested team players', () => {
    const leaders = computeTeamLeaders(matches, '皇家马德里');

    expect(leaders.scorerList).toEqual([
      { name: '张三', team: '皇家马德里', goals: 3, assists: 0, mvpCount: 2, averageScore: 8.2, count: 3 },
    ]);
    expect(leaders.assistList).toEqual([
      { name: '王五', team: '皇家马德里', goals: 0, assists: 2, mvpCount: 0, averageScore: 0, count: 2 },
    ]);
    expect(leaders.mvpList).toEqual([
      { name: '张三', team: '皇家马德里', count: 2, averageScore: 8.2 },
    ]);
  });

  it('excludes players from other teams', () => {
    const leaders = computeTeamLeaders(matches, '皇家马德里');
    const names = [...leaders.scorerList, ...leaders.assistList, ...leaders.mvpList].map((item) => item.name);
    expect(names).not.toContain('李四');
    expect(names).not.toContain('赵六');
    expect(names).not.toContain('孙八');
    expect(names).not.toContain('钱七');
  });

  it('returns empty lists for a team with no data', () => {
    expect(computeTeamLeaders(matches, '曼城')).toEqual({ scorerList: [], assistList: [], mvpList: [] });
  });
});

describe('computePlayerDetail', () => {
  const matches = [
    {
      isPlayed: true,
      matchNumber: 1,
      round: 1,
      homeTeam: '皇家马德里',
      awayTeam: '巴塞罗那',
      homeGoals: 2,
      awayGoals: 1,
      homeScorers: [{ name: '张三', count: 2 }],
      awayScorers: [{ name: '李四', count: 1 }],
      homeAssists: [{ name: '王五', count: 1 }],
      awayAssists: [],
      mvp: { name: '张三', team: '皇家马德里', score: 8.5 },
    },
    {
      isPlayed: true,
      matchNumber: 2,
      round: 2,
      homeTeam: '皇家马德里',
      awayTeam: '曼城',
      homeGoals: 0,
      awayGoals: 3,
      homeScorers: [],
      awayScorers: [{ name: '赵六', count: 3 }],
      homeAssists: [],
      awayAssists: [],
      mvp: { name: '赵六', team: '曼城', score: 9 },
    },
    {
      isPlayed: false,
      matchNumber: 3,
      round: 3,
      homeTeam: '皇家马德里',
      awayTeam: '利物浦',
      homeScorers: [{ name: '无效', count: 9 }],
      awayScorers: [],
      homeAssists: [],
      awayAssists: [],
    },
  ];

  it('aggregates stats and lists per-match contributions', () => {
    const detail = computePlayerDetail(matches, '张三', '皇家马德里');
    expect(detail).toMatchObject({ name: '张三', team: '皇家马德里', goals: 2, assists: 0, mvpCount: 1 });
    expect(detail.averageScore).toBe(8.5);
    expect(detail.matches).toEqual([
      { matchNumber: 1, round: 1, opponent: '巴塞罗那', forGoals: 2, againstGoals: 1, result: '胜', goals: 2, assists: 0, mvpScore: 8.5 },
    ]);
  });

  it('computes the result from the player team perspective', () => {
    const detail = computePlayerDetail(matches, '李四', '巴塞罗那');
    expect(detail.matches[0]).toMatchObject({ opponent: '皇家马德里', forGoals: 1, againstGoals: 2, result: '负', goals: 1, assists: 0 });
    expect(detail.matches[0].mvpScore).toBeNull();
  });

  it('returns null for a player with no recorded contributions', () => {
    expect(computePlayerDetail(matches, '不存在', '皇家马德里')).toBeNull();
  });
});

describe('collectKnownPlayers', () => {
  it('collects distinct player names per team from played matches', () => {
    const result = collectKnownPlayers([
      {
        isPlayed: true,
        homeTeam: '皇家马德里',
        awayTeam: '巴塞罗那',
        homeScorers: [{ name: '张三', count: 1 }],
        awayScorers: [{ name: '李四', count: 1 }],
        homeAssists: [{ name: '张三', count: 1 }],
        awayAssists: [],
        mvp: { name: '张三', team: '皇家马德里', score: 8 },
      },
      {
        isPlayed: false,
        homeTeam: '皇家马德里',
        awayTeam: '曼城',
        homeScorers: [{ name: '无效', count: 1 }],
        awayScorers: [],
        homeAssists: [],
        awayAssists: [],
      },
    ]);

    expect(result['皇家马德里']).toEqual(['张三']);
    expect(result['巴塞罗那']).toEqual(['李四']);
    expect(result['曼城']).toBeUndefined();
  });

  it('trims and deduplicates names', () => {
    const result = collectKnownPlayers([
      {
        isPlayed: true,
        homeTeam: 'A',
        awayTeam: 'B',
        homeScorers: [{ name: ' 张三 ', count: 1 }, { name: '张三', count: 1 }],
        awayScorers: [],
        homeAssists: [],
        awayAssists: [],
      },
    ]);
    expect(result['A']).toEqual(['张三']);
  });
});
