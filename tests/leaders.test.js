import { describe, expect, it } from 'vitest';
import { computeLeaders, computePlayerStats, validateContributionTotals, validateMvpSelection } from '../src/leaders.js';

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
