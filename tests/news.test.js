import { describe, expect, it } from 'vitest';
import { NEWS_CATEGORIES, TIER_META, TIER_ORDER, computeNews, newsDifficulty, splitNews, teamsOf, tierLabel } from '../src/news.js';

function fixture(matchNumber, round, homeTeam, awayTeam, homeGoals, awayGoals, extra = {}) {
  return {
    id: `m-${matchNumber}`,
    matchNumber,
    round,
    homeTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    isPlayed: true,
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

const config = { teamsA: ['甲队'], teamsB: ['乙队'] };
const leaders = { scorerList: [], assistList: [], mvpList: [] };

function titles(items) {
  return items.map((entry) => entry.title);
}

describe('teamsOf', () => {
  it('merges both sides', () => {
    expect(teamsOf({ teamsA: ['A'], teamsB: ['B'] })).toEqual(['A', 'B']);
    expect(teamsOf({})).toEqual([]);
  });
});

describe('computeNews guard rails', () => {
  it('returns nothing before any match is played', () => {
    expect(computeNews({ config, matches: [], leaders })).toEqual([]);
    expect(computeNews({ config, matches: [fixture(1, 1, '甲队', '乙队', 0, 0, { isPlayed: false })], leaders })).toEqual([]);
  });

  it('every generated item is well formed and free of undefined/NaN', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 3, 0, { homeScorers: [{ name: '张三', count: 3 }] }),
      fixture(2, 2, '甲队', '乙队', 2, 1, { homeScorers: [{ name: '张三', count: 2 }] }),
      fixture(3, 3, '乙队', '甲队', 1, 2, { awayScorers: [{ name: '张三', count: 2 }] }),
    ];
    const items = computeNews({ config, matches, leaders });
    expect(items.length).toBeGreaterThan(0);

    const validTiers = Object.keys(TIER_META);
    for (const entry of items) {
      expect(validTiers).toContain(entry.tier);
      expect(Object.keys(NEWS_CATEGORIES)).toContain(entry.category);
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.icon).toBe('string');
      expect(entry.title).not.toMatch(/undefined|NaN/);
      expect(entry.detail).not.toMatch(/undefined|NaN/);
      expect(Number.isFinite(entry.metric)).toBe(true);
    }
  });

  it('never emits duplicate ids', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 4, 0, { homeScorers: [{ name: '张三', count: 4 }] }),
      fixture(2, 2, '乙队', '甲队', 0, 4, { awayScorers: [{ name: '张三', count: 4 }] }),
      fixture(3, 3, '甲队', '乙队', 0, 0),
      fixture(4, 4, '乙队', '甲队', 1, 5, { awayScorers: [{ name: '张三', count: 5 }] }),
    ];
    const items = computeNews({ config, matches, leaders });
    const ids = items.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ranking and tiers', () => {
  it('orders items by tier weight first', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 5, 0, { homeScorers: [{ name: '张三', count: 5 }] }),
    ];
    const items = computeNews({ config, matches, leaders });
    const weights = items.map((entry) => TIER_META[entry.tier].weight);
    const sorted = [...weights].sort((left, right) => right - left);
    expect(weights).toEqual(sorted);
  });

  it('labels every tier', () => {
    expect(TIER_ORDER).toEqual(['legend', 'epic', 'rare', 'common']);
    expect(tierLabel('legend')).toBe('传说');
    expect(tierLabel('nonsense')).toBe('常规');
  });

  it('splits headlines from the rest', () => {
    const items = [1, 2, 3, 4, 5].map((n) => ({ id: `i${n}` }));
    expect(splitNews(items, 3).headlines).toHaveLength(3);
    expect(splitNews(items, 3).more).toHaveLength(2);
    expect(splitNews([], 3)).toEqual({ headlines: [], more: [] });
    expect(splitNews(null).headlines).toEqual([]);
  });

  it('turns tier + metric into a difficulty percentage', () => {
    expect(newsDifficulty({ tier: 'legend', metric: 5 })).toBeGreaterThan(newsDifficulty({ tier: 'rare', metric: 5 }));
    expect(newsDifficulty({ tier: 'common', metric: 0 })).toBeLessThan(newsDifficulty({ tier: 'common', metric: 4 }));
    expect(newsDifficulty({ tier: 'legend', metric: 99 })).toBeLessThanOrEqual(99);
    expect(newsDifficulty({})).toBe(newsDifficulty({ tier: 'common', metric: 0 }));
  });

  it('keeps difficulty inside 0-100 and rising with metric for every tier', () => {
    for (const tier of TIER_ORDER) {
      let previous = -1;
      for (let metric = 0; metric <= 12; metric += 1) {
        const value = newsDifficulty({ tier, metric });
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
        expect(value).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
    }
    // 垃圾输入也不能算崩。
    for (const junk of [{ tier: 'nonsense', metric: -10 }, { tier: null, metric: NaN }, { metric: Infinity }]) {
      const value = newsDifficulty(junk);
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

describe('record generators', () => {
  it('detects a player scoring in consecutive matches', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 0, { homeScorers: [{ name: '张三', count: 1 }] }),
      fixture(2, 2, '乙队', '甲队', 0, 2, { awayScorers: [{ name: '张三', count: 2 }] }),
      fixture(3, 3, '甲队', '乙队', 3, 0, { homeScorers: [{ name: '张三', count: 3 }] }),
    ];
    expect(titles(computeNews({ config, matches, leaders }))).toContain('张三 连续 3 场进球');
  });

  it('breaks a player streak after a blank match', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 0, { homeScorers: [{ name: '张三', count: 1 }] }),
      fixture(2, 2, '甲队', '乙队', 0, 0),
      fixture(3, 3, '甲队', '乙队', 1, 0, { homeScorers: [{ name: '张三', count: 1 }] }),
    ];
    expect(titles(computeNews({ config, matches, leaders }))).not.toContain('张三 连续 2 场进球');
  });

  it('detects team win, unbeaten, winless and losing streaks', () => {
    const winning = [
      fixture(1, 1, '甲队', '乙队', 1, 0),
      fixture(2, 2, '甲队', '乙队', 2, 0),
      fixture(3, 3, '甲队', '乙队', 3, 0),
    ];
    const winTitles = titles(computeNews({ config, matches: winning, leaders }));
    expect(winTitles).toContain('甲队 3 连胜');
    expect(winTitles).toContain('甲队 已 3 场不败');

    const winless = [
      fixture(1, 1, '甲队', '乙队', 0, 1),
      fixture(2, 2, '甲队', '乙队', 1, 1),
      fixture(3, 3, '甲队', '乙队', 0, 2),
      fixture(4, 4, '甲队', '乙队', 1, 3),
    ];
    const lossTitles = titles(computeNews({ config, matches: winless, leaders }));
    expect(lossTitles).toContain('甲队 已经 4 场不胜');
    expect(winTitles.length).toBeGreaterThan(0);
  });

  it('counts consecutive clean sheets per team', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 2),
      fixture(2, 2, '甲队', '乙队', 2, 0),
      fixture(3, 3, '甲队', '乙队', 3, 0),
    ];
    expect(titles(computeNews({ config, matches, leaders }))).toContain('甲队 连续 2 场零封');
  });

  it('detects head-to-head dominance and an unbeaten hoodoo', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 2, 0),
      fixture(2, 2, '乙队', '甲队', 1, 2),
      fixture(3, 3, '甲队', '乙队', 3, 0),
    ];
    const list = titles(computeNews({ config, matches, leaders }));
    expect(list).toContain('甲队 已连续 3 场击败 乙队');
    expect(list).toContain('乙队 至今未能战胜 甲队');
  });

  it('adds colour pieces: biggest margin, wildest match and a scoring haul', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 6, 0, { homeScorers: [{ name: '张三', count: 4 }] }),
      fixture(2, 2, '甲队', '乙队', 1, 1),
    ];
    const items = computeNews({ config, matches, leaders });
    const funTitles = titles(items.filter((entry) => entry.category === 'fun'));
    expect(funTitles).toContain('本赛季最大分差：甲队 6:0 乙队');
    expect(funTitles).toContain('进球大战：甲队 6:0 乙队');
    expect(funTitles).toContain('张三 单场打进 4 球');
    expect(items.find((entry) => entry.id.startsWith('fun-haul')).tier).toBe('legend');
  });

  it('flags the only team without a win', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 0),
      fixture(2, 2, '甲队', '乙队', 0, 0),
      fixture(3, 3, '甲队', '乙队', 2, 0),
      fixture(4, 4, '甲队', '乙队', 0, 0),
    ];
    const list = titles(computeNews({ config, matches, leaders }));
    expect(list).toContain('乙队 是唯一还没赢过球的球队');
    expect(list).not.toContain('甲队 是唯一还没赢过球的球队');
  });

  it('flags a draw specialist once one team clearly leads the drawn games', () => {
    // 四支球队：乙队一路打平（4 场），其他队平局更少。
    const cfg = { teamsA: ['甲队', '丙队'], teamsB: ['乙队', '丁队'] };
    const matches = [
      fixture(1, 1, '甲队', '乙队', 0, 0),
      fixture(2, 1, '丙队', '乙队', 0, 0),
      fixture(3, 2, '丁队', '乙队', 0, 0),
      fixture(4, 3, '甲队', '乙队', 0, 0),
      fixture(5, 4, '丙队', '丁队', 2, 0),
      fixture(6, 5, '丁队', '丙队', 1, 0),
    ];
    const items = computeNews({ config: cfg, matches, leaders });
    const drawItem = items.find((entry) => entry.id === 'fun-draw-king');
    expect(drawItem).toBeTruthy();
    expect(drawItem.title).toContain('乙队');
    expect(drawItem.detail).toContain('4 场平局');
  });

  it('crowns the current top scorer using the leaders payload', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 0, { homeScorers: [{ name: '张三', count: 1 }] }),
    ];
    const items = computeNews({
      config,
      matches,
      leaders: { scorerList: [{ name: '张三', team: '甲队', goals: 7 }, { name: '李四', team: '乙队', goals: 3 }], assistList: [] },
    });
    expect(titles(items)).toContain('张三 以 7 球领跑射手榜');
  });

  it('still produces a story for a plain match with no recorded players', () => {
    const matches = [fixture(1, 1, '甲队', '乙队', 2, 1)];
    expect(() => computeNews({ config, matches, leaders })).not.toThrow();
    const items = computeNews({ config, matches, leaders });
    expect(items.length).toBeGreaterThan(0);
    expect(titles(items)).toContain('最新战报：甲队 2:1 乙队');
  });
});
