import { describe, expect, it } from 'vitest';
import { computeHeadToHead, getPriorMeetings } from '../src/h2h.js';

function fixture(matchNumber, homeTeam, awayTeam, homeGoals, awayGoals, extra = {}) {
  return {
    matchNumber,
    round: matchNumber,
    homeTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    isPlayed: true,
    homeScorers: [],
    awayScorers: [],
    homeAssists: [],
    awayAssists: [],
    ...extra,
  };
}

const history = [
  fixture(1, '皇马', '巴萨', 2, 1, {
    homeScorers: [{ name: '张三', count: 2 }],
    awayScorers: [{ name: '李四', count: 1 }],
    homeAssists: [{ name: '王五', count: 1 }],
  }),
  fixture(2, '巴萨', '皇马', 0, 3, {
    awayScorers: [{ name: '张三', count: 2 }, { name: '孙八', count: 1 }],
    awayAssists: [{ name: '王五', count: 1 }],
    mvp: { name: '张三', team: '皇马', score: 8.4 },
  }),
  fixture(3, '皇马', '巴萨', 1, 1, {
    homeScorers: [{ name: '张三', count: 1 }],
    awayScorers: [{ name: '李四', count: 1 }],
    awayAssists: [{ name: '王五', count: 1 }],
    mvp: { name: '李四', team: '巴萨', score: 8.0 },
  }),
  fixture(4, '皇马', '巴萨', 0, 0, {}),
];

describe('getPriorMeetings', () => {
  it('only returns played fixtures between the two teams before this match', () => {
    const target = { ...history[3], isPlayed: false };
    const prior = getPriorMeetings([...history], target);
    expect(prior.map((item) => item.matchNumber)).toEqual([1, 2, 3]);
  });

  it('returns nothing when the fixture has no teams', () => {
    expect(getPriorMeetings(history, {})).toEqual([]);
  });
});

describe('computeHeadToHead', () => {
  it('returns null without two teams', () => {
    expect(computeHeadToHead(history, { matchNumber: 4 })).toBeNull();
    expect(computeHeadToHead(history, null)).toBeNull();
  });

  it('reports a first meeting when there is no history', () => {
    const h2h = computeHeadToHead(history, { homeTeam: '皇马', awayTeam: '利物浦', matchNumber: 9 });
    expect(h2h.playedCount).toBe(0);
    expect(h2h.meetingNumber).toBe(1);
    expect(h2h.highlights).toEqual([]);
  });

  it('normalizes the scoreline to the home team perspective regardless of venue', () => {
    const target = { homeTeam: '皇马', awayTeam: '巴萨', matchNumber: 4 };
    const h2h = computeHeadToHead(history, target);
    const second = h2h.meetings.find((meeting) => meeting.matchNumber === 2);
    expect(second).toMatchObject({ homeTeam: '巴萨', awayTeam: '皇马', forHome: 3, forAway: 0, winner: 'home' });
  });

  it('summarises wins, draws and goals as the match ordinal', () => {
    const target = { homeTeam: '皇马', awayTeam: '巴萨', matchNumber: 4 };
    const h2h = computeHeadToHead(history, target);
    expect(h2h.meetingNumber).toBe(4);
    expect(h2h.playedCount).toBe(3);
    expect(h2h.summary).toEqual({ homeWins: 2, draws: 1, awayWins: 0, homeGoals: 6, awayGoals: 2 });
  });

  it('produces player and team highlights', () => {
    const target = { homeTeam: '皇马', awayTeam: '巴萨', matchNumber: 4 };
    const texts = computeHeadToHead(history, target).highlights.map((item) => item.text);
    expect(texts.some((text) => text.includes('张三') && text.includes('连续 3 场'))).toBe(true);
    expect(texts.some((text) => text.includes('王五') && text.includes('助攻'))).toBe(true);
    expect(texts.some((text) => text.includes('皇马') && text.includes('不败'))).toBe(true);
    expect(texts.some((text) => text.includes('巴萨') && text.includes('还未战胜'))).toBe(true);
  });

  it('uses the most recent matches for streaks', () => {
    const matches = [
      fixture(1, 'X', 'Y', 1, 0, { homeScorers: [{ name: '前锋', count: 1 }] }),
      fixture(2, 'X', 'Y', 0, 1, { awayScorers: [{ name: '前锋', count: 0 }, { name: '后卫', count: 1 }] }),
      fixture(3, 'X', 'Y', 2, 1, { homeScorers: [{ name: '前锋', count: 2 }] }),
    ];
    const h2h = computeHeadToHead(matches, { homeTeam: 'X', awayTeam: 'Y', matchNumber: 4 });
    const texts = h2h.highlights.map((item) => item.text);
    // 前锋只在第 1、3 场进球，最近一场（3）进球但第 2 场没有，因此没有 2 连击。
    expect(texts.some((text) => text.includes('连续'))).toBe(false);
  });
});
