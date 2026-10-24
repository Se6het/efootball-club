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
      // 界面上要靠这两个字段挂队徽、排新旧。
      expect(Array.isArray(entry.teams)).toBe(true);
      expect(Number.isFinite(entry.round)).toBe(true);
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

  it('detects a team win streak', () => {
    const winning = [
      fixture(1, 1, '甲队', '乙队', 1, 0),
      fixture(2, 2, '甲队', '乙队', 2, 0),
      fixture(3, 3, '甲队', '乙队', 3, 0),
    ];
    const winTitles = titles(computeNews({ config, matches: winning, leaders }));
    expect(winTitles).toContain('甲队 3 连胜');
    expect(winTitles.length).toBeGreaterThan(0);
  });

  it('detects an unbeaten run that is not a win streak', () => {
    // 最后一场打平：没有连胜，但照样是不败。
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 0),
      fixture(2, 2, '甲队', '乙队', 2, 0),
      fixture(3, 3, '甲队', '乙队', 1, 1),
    ];
    const items = computeNews({ config, matches, leaders });
    expect(titles(items)).toContain('甲队 已 3 场不败');
    expect(titles(items)).not.toContain('甲队 3 连胜');
  });

  it('detects a winless run and a losing streak', () => {
    const winless = [
      fixture(1, 1, '甲队', '乙队', 0, 1),
      fixture(2, 2, '甲队', '乙队', 1, 1),
      fixture(3, 3, '甲队', '乙队', 0, 2),
      fixture(4, 4, '甲队', '乙队', 1, 3),
    ];
    const titles1 = titles(computeNews({ config, matches: winless, leaders }));
    expect(titles1).toContain('甲队 已经 4 场不胜');

    const losing = [
      fixture(1, 1, '甲队', '乙队', 0, 1),
      fixture(2, 2, '甲队', '乙队', 0, 2),
      fixture(3, 3, '甲队', '乙队', 0, 3),
    ];
    expect(titles(computeNews({ config, matches: losing, leaders }))).toContain('甲队 遭遇 3 连败');
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

  it('reports hard stats: biggest margin, wildest match and a scoring haul', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 6, 0, { homeScorers: [{ name: '张三', count: 4 }] }),
      fixture(2, 2, '甲队', '乙队', 1, 1),
    ];
    const items = computeNews({ config, matches, leaders });
    const statTitles = titles(items.filter((entry) => entry.category === 'stat'));
    expect(statTitles).toContain('本赛季最大分差：甲队 6:0 乙队');
    expect(statTitles).toContain('进球大战：甲队 6:0 乙队');
    expect(statTitles).toContain('张三 单场打进 4 球');
    expect(items.find((entry) => entry.id.startsWith('stat-haul')).tier).toBe('legend');
  });

  it('keeps the quirky stuff in its own bucket', () => {
    // 乙队场场丢球、一球未进，正好凑出不那么正经的条条。
    const matches = [
      fixture(1, 1, '甲队', '乙队', 2, 1),
      fixture(2, 2, '乙队', '甲队', 0, 3),
      fixture(3, 3, '甲队', '乙队', 1, 2),
    ];
    const items = computeNews({ config, matches, leaders });
    const quirks = titles(items.filter((entry) => entry.category === 'quirk'));
    expect(quirks).toContain('防线漏勺：乙队 场场丢球');
    // 正经纪录不会混进趣闻：连胜、最大分差各有各的归类。
    expect(quirks.some((title) => title.includes('连胜') || title.includes('最大分差'))).toBe(false);
  });

  it('calls out a team that only ever loses by a single goal', () => {
    const cfg = { teamsA: ['甲队', '丙队'], teamsB: ['乙队', '丁队'] };
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 0),
      fixture(2, 2, '丙队', '乙队', 2, 1),
      fixture(3, 3, '丁队', '乙队', 1, 0),
      fixture(4, 4, '甲队', '丙队', 1, 1),
    ];
    const items = computeNews({ config: cfg, matches, leaders });
    const quirk = items.find((entry) => entry.id === 'quirk-close-losses:乙队');
    expect(quirk).toBeTruthy();
    expect(quirk.title).toContain('全都只输一球');
    // 只踢了两场的球队不该被编排。
    expect(items.some((entry) => entry.category === 'quirk' && entry.teams[0] === '甲队')).toBe(false);
  });

  it('adds silly pieces: a card collector and a one-man show', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 3, 0, { homeScorers: [{ name: '张三', count: 3 }], awayCards: { yellow: 2, red: 0 } }),
      fixture(2, 2, '乙队', '甲队', 0, 2, { awayScorers: [{ name: '张三', count: 2 }], homeCards: { yellow: 2, red: 0 } }),
      fixture(3, 3, '甲队', '乙队', 3, 1, { homeScorers: [{ name: '张三', count: 3 }], awayCards: { yellow: 2, red: 0 } }),
    ];
    const items = computeNews({ config, matches, leaders });
    const ids = items.map((entry) => entry.id);
    expect(ids).toContain('quirk-card-collector:乙队');
    expect(ids).toContain('quirk-one-man-show:甲队');
    expect(items.find((entry) => entry.id === 'quirk-card-collector:乙队').title).toContain('6 张黄牌');
    expect(items.find((entry) => entry.id === 'quirk-one-man-show:甲队').title).toContain('张三');
    // 甲队只吃了 4 张黄牌，不该被算成收藏家。
    expect(ids).not.toContain('quirk-card-collector:甲队');
  });

  it('reports at most one one-man show per league', () => {
    const solo = (homeScorers, awayScorers) => ({ homeScorers, awayScorers });
    const matches = [
      fixture(1, 1, '甲队', '乙队', 2, 0, solo([{ name: '甲前锋', count: 2 }], [])),
      fixture(2, 2, '乙队', '甲队', 0, 3, solo([], [{ name: '甲前锋', count: 3 }])),
      fixture(3, 3, '甲队', '乙队', 1, 1, solo([], [{ name: '乙前锋', count: 1 }])),
    ];
    const items = computeNews({ config, matches, leaders });
    expect(items.filter((entry) => entry.id.startsWith('quirk-one-man-show'))).toHaveLength(1);
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

  it('adds fresh quirky angles: no draws, away form, draw streaks and droughts', () => {
    const idsOf = (matches) => computeNews({ config, matches, leaders }).map((entry) => entry.id);

    expect(idsOf([
      fixture(1, 1, '甲队', '乙队', 2, 1),
      fixture(2, 2, '甲队', '乙队', 1, 0),
      fixture(3, 3, '乙队', '甲队', 0, 2),
    ])).toContain('quirk-no-draw:甲队');

    expect(idsOf([
      fixture(1, 1, '甲队', '乙队', 0, 1),
      fixture(2, 2, '甲队', '乙队', 0, 2),
      fixture(3, 3, '乙队', '甲队', 0, 3),
      fixture(4, 4, '乙队', '甲队', 1, 4),
    ])).toContain('quirk-road-warrior:甲队');

    expect(idsOf([
      fixture(1, 1, '甲队', '乙队', 1, 1),
      fixture(2, 2, '乙队', '甲队', 2, 2),
      fixture(3, 3, '甲队', '乙队', 0, 0),
    ])).toContain('quirk-draw-streak:甲队');

    expect(idsOf([
      fixture(1, 1, '甲队', '乙队', 1, 1),
      fixture(2, 2, '乙队', '甲队', 0, 1),
      fixture(3, 3, '乙队', '甲队', 0, 2),
      fixture(4, 4, '甲队', '乙队', 1, 0),
    ])).toContain('quirk-goal-drought:乙队');
  });

  it('spots the team spreading its goals around (all hands on deck)', () => {
    const ids = computeNews({
      config,
      matches: [
        fixture(1, 1, '甲队', '乙队', 4, 0, { homeScorers: [{ name: '甲A', count: 2 }, { name: '甲B', count: 2 }] }),
        fixture(2, 2, '乙队', '甲队', 0, 4, { awayScorers: [{ name: '甲C', count: 2 }, { name: '甲D', count: 2 }] }),
      ],
      leaders,
    }).map((entry) => entry.id);
    expect(ids).toContain('quirk-all-hands:甲队');
  });

  it('fills more than twenty stories (up to 28) in a deep season', () => {
    const teams = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'];
    const matches = [];
    let n = 1;
    for (let i = 0; i < teams.length; i += 1) {
      for (let j = 1; j <= 3; j += 1) {
        matches.push(fixture(n, 1, teams[i], teams[(i + j) % teams.length], 2, 1, {
          homeCards: { yellow: 3, red: 1 },
          awayCards: { yellow: 3, red: 1 },
        }));
        n += 1;
      }
    }
    const items = computeNews({ config: { teamsA: teams.slice(0, 4), teamsB: teams.slice(4) }, matches, leaders });
    expect(items.length).toBeGreaterThan(20);
    expect(items.length).toBeLessThanOrEqual(28);
  });

  it('keeps the feed bounded and drops stale news', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 9, 0, { homeScorers: [{ name: '张三', count: 5 }] }),
      fixture(2, 2, '甲队', '乙队', 1, 0, { homeScorers: [{ name: '张三', count: 1 }] }),
      fixture(3, 3, '乙队', '甲队', 0, 2, { awayScorers: [{ name: '张三', count: 2 }] }),
      fixture(4, 4, '甲队', '乙队', 2, 1, { homeScorers: [{ name: '张三', count: 2 }] }),
      fixture(5, 5, '甲队', '乙队', 3, 0, { homeScorers: [{ name: '张三', count: 3 }] }),
      fixture(6, 6, '甲队', '乙队', 1, 1),
    ];
    const items = computeNews({ config, matches, leaders });
    expect(items.length).toBeLessThanOrEqual(20);
    // 最新一轮是第 6 轮，第 1 轮那场 9:0 已经是旧闻，不该再挂在「新闻」里。
    expect(items.every((entry) => entry.round >= 4)).toBe(true);
    expect(titles(items)).not.toContain('本赛季最大分差：甲队 9:0 乙队');
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
    const drawItem = items.find((entry) => entry.id === 'quirk-draw-king');
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

  it('flags a playmaker hat-trick and a single-match goal-and-assist double', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 4, 0, {
        homeScorers: [{ name: '张三', count: 2 }, { name: '王五', count: 2 }],
        homeAssists: [{ name: '李四', count: 3 }, { name: '张三', count: 1 }],
      }),
    ];
    const list = titles(computeNews({ config, matches, leaders }));
    expect(list).toContain('李四 单场送出 3 次助攻');
    expect(list).toContain('张三 单场独造 3 球');
  });

  it('notices a player who keeps taking the MVP award', () => {
    const mvp = { name: '张三', team: '甲队', score: 8 };
    const matches = [
      fixture(1, 1, '甲队', '乙队', 2, 0, { mvp }),
      fixture(2, 2, '乙队', '甲队', 0, 1, { mvp }),
      fixture(3, 3, '甲队', '乙队', 1, 0, { mvp }),
    ];
    expect(titles(computeNews({ config, matches, leaders }))).toContain('张三 已 3 次当选 MVP');
  });

  it('crowns the best attack and the meanest defence in the league', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 5, 0),
      fixture(2, 2, '甲队', '乙队', 4, 0),
      fixture(3, 3, '甲队', '乙队', 3, 1),
    ];
    const list = titles(computeNews({ config, matches, leaders }));
    expect(list).toContain('甲队 是联赛火力最猛的球队');
    expect(list).toContain('甲队 的防线是联赛最稳的');
  });

  it('names the most combustible match of the season', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 1, { homeCards: { yellow: 3, red: 0 }, awayCards: { yellow: 3, red: 0 } }),
      fixture(2, 2, '甲队', '乙队', 0, 0, { homeCards: { yellow: 1, red: 0 } }),
    ];
    const items = computeNews({ config, matches, leaders });
    const cardfest = items.find((entry) => entry.id === 'stat-cardfest');
    expect(cardfest).toBeTruthy();
    expect(cardfest.detail).toContain('6 张黄牌');
  });

  it('reports a match that boiled over into a red-card show', () => {
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 1, { homeCards: { yellow: 1, red: 2 }, awayCards: { yellow: 1, red: 0 } }),
      fixture(2, 2, '甲队', '乙队', 0, 0),
    ];
    const items = computeNews({ config, matches, leaders });
    const brawl = items.find((entry) => entry.id === 'stat-bloodbath');
    expect(brawl).toBeTruthy();
    expect(brawl.title).toContain('2 张红牌');
  });

  it('spies on repeated scorelines and 0:0 specialists', () => {
    const cfg = { teamsA: ['甲队', '丙队'], teamsB: ['乙队', '丁队'] };
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 1),
      fixture(2, 1, '丙队', '丁队', 1, 1),
      fixture(3, 2, '甲队', '丙队', 0, 0),
      fixture(4, 2, '乙队', '丁队', 0, 0),
      fixture(5, 3, '甲队', '丁队', 0, 0),
    ];
    const items = computeNews({ config: cfg, matches, leaders });
    const ids = items.map((entry) => entry.id);
    expect(ids).toContain('quirk-score-repeat:0:0');
    expect(ids).toContain('quirk-goalless:甲队');
  });

  it('spots a card collector and an MVP monopoly inside one squad', () => {
    const mvp = { name: '张三', team: '甲队', score: 8 };
    const matches = [
      fixture(1, 1, '甲队', '乙队', 1, 1, { homeCards: { yellow: 0, red: 1 }, mvp }),
      fixture(2, 2, '甲队', '乙队', 1, 1, { homeCards: { yellow: 0, red: 1 }, mvp }),
      fixture(3, 3, '甲队', '乙队', 1, 1, { homeCards: { yellow: 0, red: 1 }, mvp }),
    ];
    const items = computeNews({ config, matches, leaders });
    const ids = items.map((entry) => entry.id);
    expect(ids).toContain('quirk-red-collector:甲队');
    expect(ids).toContain('quirk-mvp-monopoly:甲队');
  });
});
