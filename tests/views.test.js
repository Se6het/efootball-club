import { describe, expect, it } from 'vitest';
import { installDom, textOf } from './helpers/dom.js';

installDom();

const { renderNextMatchView, renderHeadToHead } = await import('../src/views/nextMatch.js');
const { renderStandingsView } = await import('../src/views/standings.js');
const { renderLeadersView } = await import('../src/views/leaders.js');
const { renderTeamDetailView } = await import('../src/views/teamDetail.js');
const { renderPlayerDetailView } = await import('../src/views/playerDetail.js');
const { renderScheduleView } = await import('../src/views/schedule.js');
const { renderNewsView } = await import('../src/views/news.js');
const { renderSetupView } = await import('../src/views/setup.js');
const { renderArchiveView } = await import('../src/views/archive.js');
const { renderAwardsView } = await import('../src/views/awards.js');
const { openMatchForm } = await import('../src/views/matchForm.js');
const { computeHeadToHead } = await import('../src/h2h.js');
const { computeTeamForm, computeUpcomingFixtures, computeTeamFormMap } = await import('../src/form.js');
const { computeLeaders, computePlayerDetail, computeTeamLeaders } = await import('../src/leaders.js');
const { buildAwardSummary } = await import('../src/awards.js');
const { computeRankProgression, computeTieGroups, rankTeams } = await import('../src/standings.js');
const { computeTeamDiscipline } = await import('../src/discipline.js');
const { computeNews } = await import('../src/news.js');
const { computeOdds } = await import('../src/odds.js');

function fixture(id, matchNumber, round, homeTeam, awayTeam, homeGoals, awayGoals, isPlayed, extra = {}) {
  return {
    id,
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

const played1 = fixture('m-1', 1, 1, '皇家马德里', '巴塞罗那', 2, 1, true, {
  homeScorers: [{ name: '张三', count: 2 }],
  awayScorers: [{ name: '李四', count: 1 }],
  homeAssists: [{ name: '王五', count: 1 }],
  mvp: { name: '张三', team: '皇家马德里', score: 8.5 },
});
const played2 = fixture('m-2', 2, 2, '巴塞罗那', '皇家马德里', 0, 3, true, {
  awayScorers: [{ name: '张三', count: 2 }, { name: '孙八', count: 1 }],
  mvp: { name: '张三', team: '皇家马德里', score: 8.1 },
});
const nextMatch = fixture('m-3', 3, 3, '皇家马德里', '巴塞罗那', 0, 0, false);
const matches = [played1, played2, nextMatch];

const config = { playerA: 'A', playerB: 'B', teamsA: ['皇家马德里'], teamsB: ['巴塞罗那'], matchesPerPair: 2 };

describe('view smoke tests', () => {
  it('renders the next-match view with form strips and head-to-head', () => {
    const h2h = computeHeadToHead(matches, nextMatch);
    const view = renderNextMatchView(nextMatch, () => {}, [], {
      h2h,
      homeForm: computeTeamForm(matches, '皇家马德里'),
      awayForm: computeTeamForm(matches, '巴塞罗那'),
    });
    const text = textOf(view);
    expect(text).toContain('下一场比赛');
    expect(text).toContain('历史交锋');
    expect(text).toContain('本赛季第 3 次交手');
    expect(text).toContain('交锋看点');
    expect(text).toContain('连续 2 场');
  });

  it('renders recent-form strips as labeled pills instead of raw objects', () => {
    const view = renderNextMatchView(nextMatch, () => {}, [], {
      h2h: computeHeadToHead(matches, nextMatch),
      homeForm: computeTeamForm(matches, '皇家马德里'),
      awayForm: computeTeamForm(matches, '巴塞罗那'),
    });
    expect(textOf(view)).not.toContain('[object Object]');
    const pills = view.querySelectorAll('.form-pill');
    expect(pills.length).toBeGreaterThan(0);
    expect(pills.map((pill) => textOf(pill)).sort()).toEqual(['胜', '胜', '负', '负']);
  });

  it('renders the empty next-match state', () => {
    const view = renderNextMatchView(null, () => {});
    expect(textOf(view)).toContain('所有比赛都已完成');
  });

  it('renders a standalone head-to-head panel without history', () => {
    const view = renderHeadToHead(computeHeadToHead(matches, { homeTeam: '皇家马德里', awayTeam: '曼城', matchNumber: 9 }));
    expect(textOf(view)).toContain('本赛季首次交手');
  });

  it('renders the standings with a form column', () => {
    const ranked = rankTeams(config, matches);
    const formByTeam = computeTeamFormMap(matches, ['皇家马德里', '巴塞罗那'], 5);
    const view = renderStandingsView(ranked, () => {}, { formByTeam });
    const text = textOf(view);
    expect(text).toContain('球队榜');
    expect(text).toContain('近5场');
    expect(text).toContain('积分');
  });

  it('renders the standings empty state', () => {
    expect(textOf(renderStandingsView([], null))).toContain('还没有球队数据');
  });

  it('expands a head-to-head mini table for tied teams', () => {
    const tieConfig = { teamsA: ['甲', '乙'], teamsB: ['丙', '丁'] };
    const tieMatches = [
      fixture('t1', 1, 1, '甲', '乙', 2, 0, true),
      fixture('t2', 2, 1, '乙', '丙', 2, 0, true),
      fixture('t3', 3, 2, '丙', '甲', 1, 0, true),
      fixture('t4', 4, 2, '丁', '甲', 0, 1, true),
      fixture('t5', 5, 3, '丁', '乙', 0, 1, true),
      fixture('t6', 6, 3, '丁', '丙', 0, 1, true),
    ];
    const ranked = rankTeams(tieConfig, tieMatches);
    const view = renderStandingsView(ranked, () => {}, {
      tieGroups: computeTieGroups(tieConfig, tieMatches),
    });

    // 默认收起：没有迷你表，只有一个「同分」开关。
    expect(textOf(view)).not.toContain('同分球队相互战绩');
    const toggle = view.querySelector('.tie-toggle');
    expect(toggle).not.toBeNull();

    toggle.click();
    const text = textOf(view);
    expect(text).toContain('同分球队相互战绩 · 6 分 · 3 队');
    expect(view.querySelectorAll('.tie-mini-table').length).toBe(1);
    expect(view.querySelectorAll('.tie-detail-row').length).toBe(1);

    // 再点一次收起。
    view.querySelector('.tie-toggle').click();
    expect(textOf(view)).not.toContain('同分球队相互战绩');
  });

  it('renders the leaderboards', () => {
    const text = textOf(renderLeadersView(computeLeaders(matches), () => {}));
    expect(text).toContain('射手榜');
    expect(text).toContain('助攻榜');
    expect(text).toContain('MVP 榜');
  });

  it('keeps leaderboard rows plain except for the top-three highlight', () => {
    const view = renderLeadersView(computeLeaders(matches), () => {});
    const rows = view.querySelectorAll('tr');
    expect(rows.some((row) => String(row.className).includes('row-bg-'))).toBe(false);
  });

  it('wires leaderboard player links to the click callback', () => {
    const clicked = [];
    const view = renderLeadersView(computeLeaders(matches), (player) => clicked.push(player));
    const links = view.querySelectorAll('.player-link');
    expect(links.length).toBeGreaterThan(0);
    links[0].click();
    expect(clicked).toHaveLength(1);
    expect(clicked[0].name).toBeTruthy();
    expect(clicked[0].team).toBeTruthy();
  });

  it('shows the leaderboard empty hint when there are no records', () => {
    const text = textOf(renderLeadersView(computeLeaders([]), () => {}));
    expect(text).toContain('录入比赛比分后，射手榜会在这里出现');
  });

  it('wires standings team links to the detail callback', () => {
    const ranked = rankTeams(config, matches);
    const clicked = [];
    const view = renderStandingsView(ranked, (team) => clicked.push(team), {});
    const link = view.querySelector('.team-link');
    expect(link).not.toBeNull();
    link.click();
    expect(clicked).toEqual([ranked[0].team]);
  });

  it('renders the team detail with form and fixtures', () => {
    const view = renderTeamDetailView('皇家马德里', computeTeamLeaders(matches, '皇家马德里'), () => {}, {
      form: computeTeamForm(matches, '皇家马德里'),
      upcoming: computeUpcomingFixtures(matches, '皇家马德里'),
    });
    const text = textOf(view);
    expect(text).toContain('近期战绩');
    expect(text).toContain('未来赛程');
  });

  it('renders the player detail with every played match', () => {
    const detail = computePlayerDetail(matches, '张三', '皇家马德里');
    const text = textOf(renderPlayerDetailView(detail));
    expect(text).toContain('赛季出场明细');
    expect(text).toContain('出场');
  });

  it('marks suspended matches in the player detail with a suspension pill', () => {
    const withRed = [
      fixture('s-1', 1, 1, '皇家马德里', '巴塞罗那', 1, 0, true, {
        homeScorers: [{ name: '张三', count: 1 }],
        homePlayerCards: [{ name: '张三', yellow: 0, red: 1 }],
      }),
      fixture('s-2', 2, 2, '皇家马德里', '巴塞罗那', 0, 0, true),
    ];
    const detail = computePlayerDetail(withRed, '张三', '皇家马德里');
    expect(detail.appearances).toBe(1);
    expect(detail.suspensions).toBe(1);

    const view = renderPlayerDetailView(detail);
    // 出场 1、停赛 1
    const values = view.querySelectorAll('.stat-value').map((node) => textOf(node));
    expect(values).toContain('1');
    expect(view.querySelectorAll('.row-suspended').length).toBe(1);
    expect(textOf(view.querySelector('.suspension-pill'))).toContain('停赛');
  });

  it('renders the news view with headlines and both odds tables', () => {
    const leaders = computeLeaders(matches);
    const news = computeNews({ config, matches, leaders });
    const odds = computeOdds({ config, matches, iterations: 200 });
    const view = renderNewsView({ news, odds, playedCount: 2 });
    const text = textOf(view);

    expect(text).toContain('赛季看点与实时赔率 · 已结算 2 场比赛');
    expect(view.querySelectorAll('.news-headlines')).toHaveLength(1);
    expect(view.querySelectorAll('.news-card').length).toBeGreaterThan(0);
    expect(view.querySelectorAll('.odds-table')).toHaveLength(2);
    expect(text).toContain('冠军 / 前三');
    expect(view.querySelectorAll('.odd-value').length).toBeGreaterThan(0);
    // 每条看点都挂着相关球队的队徽（头条卡 + 更多看点行）。
    const stories = view.querySelectorAll('.news-card').length + view.querySelectorAll('.news-row').length;
    expect(stories).toBeGreaterThan(1);
    expect(view.querySelectorAll('.news-crests')).toHaveLength(stories);
    // 等级只用颜色表达，界面上不出现「传说/史诗/稀有/常规」这些字。
    for (const label of ['传说', '史诗', '稀有', '常规']) {
      expect(text).not.toContain(label);
    }
    // 赔率下面那些小注释也去掉了。
    expect(view.querySelectorAll('.odds-notes')).toHaveLength(0);
    expect(text).not.toContain('[object ');
    expect(text).not.toMatch(/undefined|NaN/);
  });

  it('only puts the players still in the award races on the odds table', () => {
    const players = Array.from({ length: 12 }, (unused, index) => ({
      key: `甲队::球员${index}`,
      name: `球员${index}`,
      team: '甲队',
      bootProb: index < 6 ? 0.12 : 0.001,
      assistProb: index < 6 ? 0.12 : 0.001,
      fmvpProb: index < 6 ? 0.12 : 0.001,
      bootPercent: 12,
      assistPercent: 12,
      fmvpPercent: 12,
      bootOdd: 7.8,
      assistOdd: 7.8,
      fmvpOdd: 7.8,
    }));
    const view = renderNewsView({ odds: { available: true, finished: false, iterations: 100, teams: [], players } });
    // 概率低到 2% 以下的那些人不该上桌。
    expect(view.querySelectorAll('.player-name')).toHaveLength(6);
  });

  it('still shows a shortlist when nobody clears the 2% floor', () => {
    const players = Array.from({ length: 12 }, (unused, index) => ({
      key: `甲队::球员${index}`,
      name: `球员${index}`,
      team: '甲队',
      bootProb: 0.001,
      assistProb: 0.001,
      fmvpProb: 0.001,
      bootPercent: 0.1,
      assistPercent: 0.1,
      fmvpPercent: 0.1,
      bootOdd: 500,
      assistOdd: 500,
      fmvpOdd: 500,
    }));
    const view = renderNewsView({ odds: { available: true, finished: false, iterations: 100, teams: [], players } });
    // 全都低于 2% 也不能给空表，退回概率最高的 8 个。
    expect(view.querySelectorAll('.player-name')).toHaveLength(8);
  });

  it('renders a story that has no team attached without a crest', () => {
    const view = renderNewsView({
      news: [
        { id: 'x', category: 'stat', icon: '💥', tier: 'rare', title: '无主看点', detail: '没有球队', metric: 1, teams: [], round: 1 },
        { id: 'y', category: 'stat', icon: '💥', tier: 'rare', title: '缺字段看点', detail: '连 teams 都没有', metric: 1 },
      ],
    });
    expect(textOf(view)).toContain('无主看点');
    expect(view.querySelectorAll('.news-crests')).toHaveLength(0);
    expect(view.querySelectorAll('.news-card')).toHaveLength(2);
  });

  it('keeps seven headlines on top and groups the rest by team', () => {
    const make = (id, teams, index) => ({
      id,
      category: 'team',
      icon: '⚽',
      tier: 'rare',
      title: `看点 ${index}`,
      detail: '细节',
      metric: 1,
      teams,
      round: 1,
    });
    const news = [
      ...Array.from({ length: 7 }, (unused, index) => make(`h${index}`, ['甲队'], index)),
      make('m1', ['甲队'], 7),
      make('m2', ['乙队'], 8),
      make('m3', ['甲队'], 9),
      make('m4', [], 10),
      make('m5', ['甲队', '乙队'], 11),
    ];
    const view = renderNewsView({ news });

    // 头条固定 7 张，第一张是跨行的大卡。
    expect(view.querySelector('.news-headlines').querySelectorAll('.news-card')).toHaveLength(7);
    expect(view.querySelectorAll('.is-lead')).toHaveLength(1);
    expect(view.querySelector('.is-lead').className).toContain('news-card');
    // 其余按球队归堆：甲队 / 乙队 / 联赛 / 交锋看点，共 4 组。
    const groups = view.querySelectorAll('.news-group');
    expect(groups).toHaveLength(4);
    expect(textOf(groups[0].querySelector('.news-group-head'))).toContain('甲队');
    expect(textOf(groups[3].querySelector('.news-group-head'))).toContain('交锋看点');
    expect(view.querySelectorAll('.news-row')).toHaveLength(5);
  });

  it('renders the news view safely with no data at all', () => {
    const view = renderNewsView({});
    const text = textOf(view);
    expect(text).not.toContain('[object ');
    expect(text).not.toMatch(/undefined|NaN/);
    expect(view.querySelectorAll('.odds-table')).toHaveLength(0);
    expect(text).toContain('暂时无法开盘');
  });

  it('renders the schedule grouped by round', () => {
    expect(textOf(renderScheduleView(matches, () => {}))).toContain('总赛程');
  });

  it('collapses finished rounds and keeps the upcoming round open', () => {
    const view = renderScheduleView(matches, () => {});
    const groups = view.querySelectorAll('.round-group');
    expect(groups).toHaveLength(3);
    // 第 1、2 轮都打完了：默认收起。
    expect(groups[0].getAttribute('open')).toBeUndefined();
    expect(groups[1].getAttribute('open')).toBeUndefined();
    // 第 3 轮是下一轮：展开并高亮。
    expect(String(groups[2].getAttribute('open'))).toBe('true');
    expect(groups[2].className).toContain('is-next');
    expect(groups[0].className).not.toContain('is-next');
  });

  it('puts team crests on every head-to-head highlight', () => {
    const h2h = computeHeadToHead(matches, nextMatch);
    expect(h2h.highlights.length).toBeGreaterThan(0);
    expect(h2h.highlights.every((item) => Array.isArray(item.teams) && item.teams.length > 0)).toBe(true);
    const view = renderNextMatchView(nextMatch, () => {}, [], { h2h });
    const crestStrips = view.querySelectorAll('.h2h-chip-crests');
    expect(crestStrips.length).toBe(h2h.highlights.length);
    expect(crestStrips[0].querySelectorAll('img').length).toBeGreaterThan(0);
  });

  it('renders the setup form', () => {
    const view = renderSetupView({ onStart: () => {}, sampleConfig: null, onImport: () => {} });
    expect(textOf(view)).toContain('赛前配置');
  });

  it('renders the awards view for an unfinished and a finished season', () => {
    const base = { summary: buildAwardSummary({}, { rankedTeams: [], playerStats: [] }), onSave: () => {}, onEdit: () => {}, currentSettings: null, isEditing: false };
    expect(textOf(renderAwardsView({ ...base, seasonFinished: false }))).toContain('赛季还未结束');
    const finished = renderAwardsView({ ...base, seasonFinished: true });
    expect(textOf(finished)).toContain('前三名奖金');
  });

  it('renders the match form, with head-to-head when available', () => {
    const withH2h = textOf(openMatchForm(nextMatch, {
      onSave: () => {},
      onCancel: () => {},
      knownPlayers: {},
      suspensions: [],
      h2h: computeHeadToHead(matches, nextMatch),
    }));
    expect(withH2h).toContain('保存比赛');
    expect(withH2h).toContain('历史交锋');

    const withoutH2h = textOf(openMatchForm(nextMatch, { onSave: () => {}, onCancel: () => {}, knownPlayers: {} }));
    expect(withoutH2h).toContain('保存比赛');
    expect(withoutH2h).not.toContain('历史交锋');
  });
});

function rankedTeam(team, rank, overrides = {}) {
  return {
    team,
    rank,
    played: 2,
    wins: 1,
    draws: 0,
    losses: 1,
    goalsFor: 1,
    goalsAgainst: 1,
    goalDifference: 0,
    points: 3,
    fairPlayPoints: 0,
    needsPlayoff: false,
    ...overrides,
  };
}

describe('standings multi-dimension sorting', () => {
  const ranked = [
    rankedTeam('甲队', 1, { wins: 2, losses: 0, points: 6, goalsFor: 1, goalDifference: 1 }),
    rankedTeam('乙队', 2, { wins: 0, losses: 1, draws: 1, points: 1, goalsFor: 5, goalDifference: 3 }),
    rankedTeam('丙队', 3, { wins: 0, losses: 1, draws: 1, points: 1, goalsFor: 3, goalDifference: 1 }),
  ];

  function firstRowTeam(view) {
    const tbody = view.querySelector('tbody');
    const row = tbody.querySelectorAll('tr')[0];
    return textOf(row);
  }

  it('sorts by a clicked column and toggles direction on the second click', () => {
    const view = renderStandingsView(ranked, () => {}, {});
    const goalsButton = view.querySelectorAll('.sort-button').find((button) => textOf(button).startsWith('进球'));
    expect(goalsButton).toBeTruthy();

    // 首次点击：按进球降序（乙队 5 球居首）。
    goalsButton.click();
    expect(firstRowTeam(view)).toContain('乙队');

    // 再次点击：切换为升序（甲队 1 球居首）。
    goalsButton.click();
    expect(firstRowTeam(view)).toContain('甲队');
  });

  it('keeps the official order as the default', () => {
    const view = renderStandingsView(ranked, () => {}, {});
    expect(firstRowTeam(view)).toContain('甲队');
  });
});

describe('team detail season & discipline panels', () => {
  it('renders the season chart and full-season list', () => {
    const progression = computeRankProgression(
      { teamsA: ['皇家马德里'], teamsB: ['巴塞罗那'] },
      matches,
      '皇家马德里'
    );
    const view = renderTeamDetailView('皇家马德里', computeTeamLeaders(matches, '皇家马德里'), () => {}, {
      form: computeTeamForm(matches, '皇家马德里'),
      upcoming: computeUpcomingFixtures(matches, '皇家马德里'),
      season: computeTeamForm(matches, '皇家马德里', 0),
      progression,
      totalTeams: 2,
      discipline: computeTeamDiscipline(matches, '皇家马德里'),
    });
    const text = textOf(view);
    expect(text).toContain('整个赛季');
    expect(text).toContain('排名走势');
    expect(text).toContain('纪律情况');
    expect(view.querySelector('.rank-chart')).not.toBeNull();
  });

  it('shows a placeholder when there is no season data', () => {
    const view = renderTeamDetailView('皇家马德里', computeTeamLeaders(matches, '皇家马德里'), () => {}, {});
    const text = textOf(view);
    expect(text).toContain('整个赛季');
    expect(text).toContain('暂无排名走势');
    expect(text).toContain('该队本赛季还没有红黄牌记录');
  });

  it('renders the whole-season win/draw/loss visualization without array-stringified garbage', () => {
    const view = renderTeamDetailView('皇家马德里', computeTeamLeaders(matches, '皇家马德里'), () => {}, {
      form: computeTeamForm(matches, '皇家马德里'),
      season: computeTeamForm(matches, '皇家马德里', 0),
      progression: [{ round: 1, rank: 1, points: 3, isLeader: true }, { round: 2, rank: 1, points: 6, isLeader: true }],
      totalTeams: 2,
      discipline: computeTeamDiscipline(matches, '皇家马德里'),
    });

    const text = textOf(view);
    expect(text).not.toContain('[object ');
    expect(text).toContain('赛季胜负分布');
    expect(text).toContain('进阶数据');
    expect(text).toContain('赛季全部比赛');

    // 100% 堆叠条 + 图例 + 逐场色块
    expect(view.querySelector('.outcome-bar')).not.toBeNull();
    expect(view.querySelectorAll('.outcome-seg').length).toBe(1); // 皇家马德里 2 战全胜，只有胜色块
    expect(view.querySelectorAll('.outcome-key').length).toBe(4);
    expect(view.querySelectorAll('.outcome-cell').length).toBe(2);

    // 进阶数据磁贴：场均进球、零封场次等
    const tiles = view.querySelectorAll('.stat-tile');
    expect(tiles.length).toBeGreaterThanOrEqual(6);
    expect(text).toContain('场均进球');
    expect(text).toContain('主场 胜-平-负');
  });

  it('renders goal and assist share donuts inside the share panel', () => {
    const view = renderTeamDetailView('皇家马德里', computeTeamLeaders(matches, '皇家马德里'), () => {}, {
      season: computeTeamForm(matches, '皇家马德里', 0),
    });

    const sharePanel = view.querySelector('.share-panel');
    expect(sharePanel).not.toBeNull();
    expect(view.querySelectorAll('.donut-chart').length).toBe(2);
    // 进球：张三 4 球 + 孙八 1 球；助攻：王五 1 次
    expect(view.querySelectorAll('.donut-legend-row').length).toBe(3);

    const text = textOf(view);
    expect(text).toContain('进球占比');
    expect(text).toContain('助攻占比');
    expect(text).not.toContain('[object ');
  });

  it('renders the goal share donut empty state when there is nothing to plot', () => {
    const view = renderTeamDetailView('皇家马德里', { scorerList: [], assistList: [], mvpList: [] }, () => {}, {});
    expect(textOf(view)).toContain('该队还没有进球记录');
  });
});

describe('standings header cleanup', () => {
  it('does not render the removed sort hint annotation', () => {
    const view = renderStandingsView([rankedTeam('甲队', 1)], () => {}, {});
    expect(view.querySelector('.sort-hint')).toBeNull();
    expect(textOf(view)).not.toContain('点击表头');
  });
});

function archiveSeasonFixture(overrides = {}) {
  return {
    id: 's-1',
    sourceId: 'src-1',
    label: '小明 vs 小红',
    archivedAt: '2026-01-01T00:00:00.000Z',
    complete: true,
    coaches: ['小明', '小红'],
    playedMatches: 6,
    totalMatches: 6,
    standings: [
      { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false, played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 9, goalsAgainst: 1, goalDifference: 8, points: 9 },
      { team: '巴塞罗那', coach: '小红', rank: 2, needsPlayoff: false, played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 9, goalDifference: -8, points: 0 },
    ],
    awards: {
      champion: { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
      podium: [
        { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
        { team: '巴塞罗那', coach: '小红', rank: 2, needsPlayoff: false },
      ],
      topScorers: [{ name: '张三', team: '皇家马德里', coach: '小明', goals: 5 }],
      topAssists: [{ name: '王五', team: '皇家马德里', coach: '小明', assists: 3 }],
      fmvp: null,
    },
    h2h: { played: 3, winsA: 3, draws: 0, winsB: 0, goalsA: 9, goalsB: 1, biggestMargin: { diff: 5, score: '5:0', coach: '小明', winner: '皇家马德里', loser: '巴塞罗那' } },
    ...overrides,
  };
}

describe('archive view', () => {
  it('renders empty states when the world has no seasons yet', () => {
    const view = renderArchiveView({
      world: { version: 1, seasons: [] },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const text = textOf(view);
    expect(text).toContain('足球世界 · 档案');
    expect(text).toContain('世界档案还是空的');
    expect(text).toContain('还没有教练');
    expect(view.querySelectorAll('.season-card').length).toBe(0);
    expect(text).not.toContain('[object ');
  });

  it('lists every season in the world with its champion and awards', () => {
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture()] },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const cards = view.querySelectorAll('.season-card');
    expect(cards).toHaveLength(1);
    const text = textOf(cards[0]);
    expect(text).toContain('第 1 赛季');
    expect(text).toContain('小明 vs 小红');
    expect(text).toContain('已结束');
    expect(text).toContain('皇家马德里（小明）');
    expect(text).toContain('张三');
    expect(text).toContain('2026-01-01');
    expect(text).not.toContain('undefined');
  });

  it('marks unfinished seasons and shows a waiting-champion placeholder', () => {
    const view = renderArchiveView({
      world: {
        version: 1,
        seasons: [archiveSeasonFixture({
          complete: false,
          playedMatches: 2,
          totalMatches: 6,
          awards: { champion: null, podium: [], topScorers: [], topAssists: [], fmvp: null },
        })],
      },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const text = textOf(view.querySelector('.season-card'));
    expect(text).toContain('赛季未完');
    expect(text).toContain('尚未决出冠军');
  });

  it('falls back to a placeholder when the archived date is missing', () => {
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture({ archivedAt: '' })] },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    expect(textOf(view.querySelector('.season-card'))).toContain('归档于 未知日期');
  });

  it('notes a coach who has not coached any settled match yet', () => {
    const view = renderArchiveView({
      world: {
        version: 1,
        seasons: [archiveSeasonFixture({
          complete: false,
          playedMatches: 0,
          standings: [
            { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
            { team: '巴塞罗那', coach: '小红', rank: 2, needsPlayoff: false, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
          ],
          awards: { champion: null, podium: [], topScorers: [], topAssists: [], fmvp: null },
          h2h: { played: 0, winsA: 0, draws: 0, winsB: 0, goalsA: 0, goalsB: 0, biggestMargin: null },
        })],
      },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    expect(textOf(view)).toContain('尚未执教过任何已结算比赛');
  });

  it('records coach honours, head-to-head and never-faced rivals', () => {
    const view = renderArchiveView({
      world: {
        version: 1,
        seasons: [
          archiveSeasonFixture(),
          archiveSeasonFixture({
            id: 's-2',
            sourceId: 'src-2',
            archivedAt: '2026-02-01T00:00:00.000Z',
            coaches: ['小红', '小刚'],
            standings: [
              { team: '曼城', coach: '小刚', rank: 1, needsPlayoff: false, played: 3, wins: 2, draws: 1, losses: 0, goalsFor: 6, goalsAgainst: 0, goalDifference: 6, points: 7 },
              { team: '巴塞罗那', coach: '小红', rank: 2, needsPlayoff: false, played: 3, wins: 0, draws: 1, losses: 2, goalsFor: 0, goalsAgainst: 6, goalDifference: -6, points: 1 },
            ],
            awards: { champion: null, podium: [], topScorers: [], topAssists: [], fmvp: null },
            h2h: { played: 3, winsA: 0, draws: 1, winsB: 2, goalsA: 0, goalsB: 6, biggestMargin: null },
          }),
        ],
      },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });

    const coachCards = view.querySelectorAll('.coach-card');
    expect(coachCards).toHaveLength(3);

    const ming = coachCards.find((card) => textOf(card.querySelector('.coach-name')) === '小明');
    const mingText = textOf(ming);
    expect(mingText).toContain('第 1 赛季');
    expect(mingText).toContain('皇家马德里');
    expect(mingText).toContain('对 小红');
    expect(mingText).toContain('从未交手：小刚');
    expect(mingText).not.toContain('[object ');

    // 荣誉栏只认冠亚季：球员奖项（金靴/助攻王/FMVP）不再挂在教练名下。
    const honors = ming.querySelector('.arc-honors');
    expect(honors).toBeTruthy();
    const titleRows = honors.querySelectorAll('.honor-title');
    expect(titleRows).toHaveLength(1);
    expect(titleRows[0].querySelectorAll('img').length).toBe(1);
    expect(textOf(honors)).toContain('夺冠率');
    expect(textOf(honors)).not.toContain('金靴');
    expect(mingText).not.toContain('FMVP');

    const gang = coachCards.find((card) => textOf(card.querySelector('.coach-name')) === '小刚');
    expect(textOf(gang)).toContain('暂无冠亚季军');
  });

  it('folds every coach card and keeps the glanceable part in the summary', () => {
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture()] },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const card = view.querySelector('.coach-card');
    expect(card.tagName).toBe('DETAILS');
    expect(card.getAttribute('open')).toBeUndefined();
    const summary = card.querySelector('.coach-head');
    expect(summary.tagName).toBe('SUMMARY');
    expect(textOf(summary)).toContain('小明');
    // 详情（荣誉、履历、交手）折叠在 summary 之外。
    expect(summary.querySelector('.arc-honors')).toBeNull();
    expect(card.querySelector('.coach-body').querySelector('.arc-honors')).toBeTruthy();
  });

  it('renders world records and the current-season panel', () => {
    const archived = [];
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture()] },
      current: { coachA: '小明', coachB: '小红', complete: false, played: 4, total: 6, archived: false, archivedPlayed: 0 },
      onArchive: () => archived.push(true),
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });

    const current = view.querySelector('.archive-current');
    expect(textOf(current)).toContain('本赛季（未归档）');
    expect(textOf(current)).toContain('4 / 6 场已结算');
    const archiveButton = view.querySelectorAll('button').find((button) => textOf(button) === '归档本赛季');
    expect(archiveButton).toBeTruthy();
    archiveButton.click();
    expect(archived).toHaveLength(1);

    expect(view.querySelectorAll('.fact-row').length).toBeGreaterThan(0);
    expect(textOf(view)).toContain('世界之最');
  });

  it('disables the archive button once the season is already captured', () => {
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture()] },
      current: { coachA: '小明', coachB: '小红', complete: true, played: 6, total: 6, archived: true, archivedPlayed: 6 },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const button = view.querySelectorAll('button').find((item) => textOf(item) === '本赛季已归档');
    expect(button).toBeTruthy();
    expect(String(button.getAttribute('disabled'))).toBe('true');
    expect(textOf(view.querySelector('.archive-current'))).toContain('本赛季（已归档）');
  });

  it('offers an update when the archived season has new results', () => {
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture()] },
      current: { coachA: '小明', coachB: '小红', complete: false, played: 5, total: 6, archived: true, archivedPlayed: 4 },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    expect(textOf(view.querySelectorAll('button').find((item) => textOf(item) === '更新归档'))).toBeTruthy();
  });

  it('exports and removes seasons through the toolbar handlers', () => {
    const exported = [];
    const removed = [];
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture()] },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: (id) => exported.push(id),
      onRemoveSeason: (id) => removed.push(id),
    });
    const buttons = view.querySelectorAll('button');
    buttons.find((button) => textOf(button) === '导出').click();
    buttons.find((button) => textOf(button) === '移除').click();
    expect(exported).toEqual(['s-1']);
    expect(removed).toEqual(['s-1']);
  });

  it('shows the podium, FMVP, full standings and season stats on a season card', () => {
    const view = renderArchiveView({
      world: {
        version: 1,
        seasons: [archiveSeasonFixture({
          standings: [
            { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false, played: 3, wins: 2, draws: 1, losses: 0, goalsFor: 7, goalsAgainst: 2, goalDifference: 5, points: 7 },
            { team: '曼城', coach: '小明', rank: 2, needsPlayoff: false, played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 4, goalDifference: 0, points: 4 },
            { team: '巴塞罗那', coach: '小红', rank: 3, needsPlayoff: false, played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 6, goalDifference: -5, points: 0 },
          ],
          awards: {
            champion: { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
            podium: [
              { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
              { team: '曼城', coach: '小明', rank: 2, needsPlayoff: false },
              { team: '巴塞罗那', coach: '小红', rank: 3, needsPlayoff: false },
            ],
            topScorers: [{ name: '张三', team: '皇家马德里', coach: '小明', goals: 5 }],
            topAssists: [{ name: '王五', team: '皇家马德里', coach: '小明', assists: 3 }],
            fmvp: { name: '张三', team: '皇家马德里', coach: '小明' },
          },
        })],
      },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const card = view.querySelector('.season-card');
    const text = textOf(card);
    expect(text).toContain('亚军 曼城（小明）');
    expect(text).toContain('季军 巴塞罗那（小红）');
    expect(text).toContain('FMVP 张三（皇家马德里，小明）');
    expect(text).toContain('总进球');
    expect(text).not.toContain('undefined');
    // 过往赛季不再只留前三：整张积分榜都摆出来。
    expect(text).toContain('全部名次');
    expect(card.querySelectorAll('.arc-roster-row')).toHaveLength(0);
    const body = card.querySelector('.season-table').querySelector('tbody');
    const rows = body.querySelectorAll('tr');
    expect(rows).toHaveLength(3);
    expect(textOf(rows[0])).toContain('皇家马德里');
    expect(textOf(rows[0])).toContain('小明');
    expect(rows[0].querySelectorAll('img').length).toBe(1);
    expect(textOf(rows[2])).toContain('巴塞罗那');
  });

  it('puts a crest next to every team it names in the season card', () => {
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture()] },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const card = view.querySelector('.season-card');
    // 摘要里的冠军一行自带一枚队徽，冠军不用展开就能看到。
    const champ = card.querySelector('.season-summary').querySelector('.season-champ');
    expect(champ).toBeTruthy();
    expect(champ.querySelectorAll('img').length).toBe(1);
  });

  it('folds season cards so long worlds do not scroll forever', () => {
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture()] },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const card = view.querySelector('.season-card');
    expect(card.tagName).toBe('DETAILS');
    expect(card.getAttribute('open')).toBeUndefined();
    const summary = card.querySelector('.season-summary');
    expect(summary.tagName).toBe('SUMMARY');
    expect(textOf(summary)).toContain('第 1 赛季');
    expect(textOf(summary)).toContain('皇家马德里（小明）');
    // 细节（奖项、积分榜）折叠在 summary 之外。
    expect(summary.querySelector('.season-table')).toBeNull();
    expect(card.querySelector('.season-detail').querySelector('.season-table')).toBeTruthy();
  });

  it('lays the archive out as parallel panels with no overview banner', () => {
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture()] },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const columns = view.querySelector('.archive-columns');
    expect(columns).toBeTruthy();
    expect(columns.querySelector('.archive-seasons')).toBeTruthy();
    expect(columns.querySelector('.archive-coaches')).toBeTruthy();
    // 顶部那排总进球 / 总场次的大数字整块删掉了。
    expect(view.querySelector('.arc-overview')).toBeNull();
    expect(view.querySelectorAll('.arc-overview').length).toBe(0);
  });

  it('enriches coach cards with highlight stats, a form bar and a season log', () => {
    const view = renderArchiveView({
      world: { version: 1, seasons: [archiveSeasonFixture()] },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const ming = view.querySelectorAll('.coach-card').find((card) => textOf(card.querySelector('.coach-name')) === '小明');
    expect(ming.querySelector('.arc-stat-grid').querySelectorAll('.arc-tile')).toHaveLength(4);
    expect(ming.querySelector('.arc-wdl')).toBeTruthy();
    const log = ming.querySelector('.arc-season-log').querySelectorAll('.arc-log-row');
    expect(log).toHaveLength(1);
    expect(textOf(log[0])).toContain('第 1 赛季');
    expect(textOf(log[0])).toContain('皇家马德里');
    expect(textOf(log[0])).toContain('🏆');
  });

  it('pins each season honour to the team that earned it', () => {
    const view = renderArchiveView({
      world: {
        version: 1,
        seasons: [archiveSeasonFixture({
          standings: [
            { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false, played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 9, goalsAgainst: 1, goalDifference: 8, points: 9 },
            { team: '拜仁慕尼黑', coach: '小明', rank: 2, needsPlayoff: false, played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 6, goalsAgainst: 3, goalDifference: 3, points: 6 },
            { team: '巴塞罗那', coach: '小红', rank: 3, needsPlayoff: false, played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 9, goalDifference: -8, points: 0 },
          ],
          awards: {
            champion: { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
            podium: [
              { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
              { team: '拜仁慕尼黑', coach: '小明', rank: 2, needsPlayoff: false },
              { team: '巴塞罗那', coach: '小红', rank: 3, needsPlayoff: false },
            ],
            topScorers: [{ name: '张三', team: '拜仁慕尼黑', coach: '小明', goals: 5 }],
            topAssists: [{ name: '王五', team: '皇家马德里', coach: '小明', assists: 3 }],
            fmvp: null,
          },
        })],
      },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const ming = view.querySelectorAll('.coach-card').find((card) => textOf(card.querySelector('.coach-name')) === '小明');
    const teams = ming.querySelector('.arc-season-log').querySelectorAll('.arc-log-team');
    expect(teams).toHaveLength(2);

    // 冠军只挂在皇马那一行，拜仁带着自己的亚军与金靴。
    const champions = teams.filter((node) => textOf(node).includes('🏆 冠军'));
    expect(champions).toHaveLength(1);
    expect(textOf(champions[0])).toContain('皇家马德里');

    const bayern = teams.find((node) => textOf(node).includes('拜仁慕尼黑'));
    expect(textOf(bayern)).toContain('🥈 亚军');
    expect(bayern.querySelector('.arc-log-mark')).toBeTruthy();
  });

  it('lists every club the coach managed in a tidy table', () => {
    const view = renderArchiveView({
      world: {
        version: 1,
        seasons: [
          archiveSeasonFixture({
            standings: [
              { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false, played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 9, goalsAgainst: 1, goalDifference: 8, points: 9 },
              { team: '拜仁慕尼黑', coach: '小明', rank: 2, needsPlayoff: false, played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 6, goalsAgainst: 3, goalDifference: 3, points: 6 },
              { team: '巴塞罗那', coach: '小红', rank: 3, needsPlayoff: false, played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 9, goalDifference: -8, points: 0 },
            ],
            awards: {
              champion: { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
              podium: [
                { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
                { team: '拜仁慕尼黑', coach: '小明', rank: 2, needsPlayoff: false },
                { team: '巴塞罗那', coach: '小红', rank: 3, needsPlayoff: false },
              ],
              topScorers: [{ name: '张三', team: '拜仁慕尼黑', coach: '小明', goals: 5 }],
              topAssists: [],
              fmvp: null,
            },
          }),
          archiveSeasonFixture({
            id: 's-2',
            sourceId: 'src-2',
            archivedAt: '2026-02-01T00:00:00.000Z',
            standings: [
              { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false, played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 9, goalsAgainst: 1, goalDifference: 8, points: 9 },
              { team: '巴塞罗那', coach: '小红', rank: 2, needsPlayoff: false, played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 9, goalDifference: -8, points: 0 },
            ],
            awards: {
              champion: { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
              podium: [
                { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
                { team: '巴塞罗那', coach: '小红', rank: 2, needsPlayoff: false },
              ],
              topScorers: [],
              topAssists: [],
              fmvp: null,
            },
          }),
        ],
      },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });

    const ming = view.querySelectorAll('.coach-card').find((card) => textOf(card.querySelector('.coach-name')) === '小明');
    // 旧的扁平胶囊已被表格取代。
    expect(ming.querySelector('.club-chip')).toBeNull();

    const rows = ming.querySelector('.club-table').querySelectorAll('tr');
    // 表头一行 + 每支球队一行。
    expect(rows).toHaveLength(3);

    const madrid = rows.find((node) => textOf(node).includes('皇家马德里'));
    // 连续两届压成一段区间文字，列宽不会再被季数撑爆。
    expect(textOf(madrid)).toContain('第 1–2 赛季');
    expect(textOf(madrid)).toContain('2 季');
    expect(textOf(madrid)).toContain('冠军 ×2');
    expect(madrid.className).toContain('is-champ');

    const bayern = rows.find((node) => textOf(node).includes('拜仁慕尼黑'));
    expect(textOf(bayern)).toContain('1 季');
    expect(textOf(bayern)).toContain('亚军');
    expect(textOf(bayern)).toContain('金靴');
    expect(bayern.className).not.toContain('is-champ');
    expect(textOf(bayern)).not.toContain('冠军');
    expect(textOf(ming)).not.toContain('[object ');
  });

  it('keeps many seasons on one compact line, consecutive or scattered', () => {
    const team = (name, coach, rank) => ({ team: name, coach, rank, needsPlayoff: false, played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 9, goalsAgainst: 1, goalDifference: 8, points: 9 });
    // 7 个赛季：小明只在奇数届带皇马（1、3、5、7），在 2–4 届带拜仁。
    const seasonAt = (ordinal) => {
      const rows = [ordinal % 2 === 1 ? team('皇家马德里', '小明', 1) : team('皇家马德里', '小红', 1)];
      rows.push(ordinal >= 2 && ordinal <= 4 ? team('拜仁慕尼黑', '小明', 2) : team('巴塞罗那', '小红', 2));
      return archiveSeasonFixture({
        id: `s-${ordinal}`,
        sourceId: `src-${ordinal}`,
        archivedAt: `2026-${String(ordinal).padStart(2, '0')}-01T00:00:00.000Z`,
        coaches: [...new Set(rows.map((row) => row.coach))],
        standings: rows,
        awards: {
          champion: { team: rows[0].team, coach: rows[0].coach, rank: 1, needsPlayoff: false },
          podium: rows.map((row) => ({ team: row.team, coach: row.coach, rank: row.rank, needsPlayoff: false })),
          topScorers: [],
          topAssists: [],
          fmvp: null,
        },
      });
    };

    const view = renderArchiveView({
      world: { version: 1, seasons: [1, 2, 3, 4, 5, 6, 7].map(seasonAt) },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });

    const ming = view.querySelectorAll('.coach-card').find((card) => textOf(card.querySelector('.coach-name')) === '小明');
    const rows = ming.querySelector('.club-table').querySelectorAll('tr');

    // 断续届号连成一串，不是一季一枚胶囊。
    const madrid = rows.find((node) => textOf(node).includes('皇家马德里'));
    expect(textOf(madrid)).toContain('第 1、3、5、7 赛季');
    expect(textOf(madrid)).toContain('4 季');
    expect(textOf(madrid)).toContain('冠军 ×4');

    // 连续届号收成区间。
    const bayern = rows.find((node) => textOf(node).includes('拜仁慕尼黑'));
    expect(textOf(bayern)).toContain('第 2–4 赛季');
    expect(textOf(bayern)).toContain('3 季');
  });

  it('shows a dash for a club with no honours yet', () => {
    const view = renderArchiveView({
      world: {
        version: 1,
        seasons: [archiveSeasonFixture({
          complete: false,
          awards: { champion: null, podium: [], topScorers: [], topAssists: [], fmvp: null },
        })],
      },
      onArchive: () => {},
      onBack: () => {},
      onExportWorld: () => {},
      onImportWorld: () => {},
      onExportSeason: () => {},
      onRemoveSeason: () => {},
    });
    const ming = view.querySelectorAll('.coach-card').find((card) => textOf(card.querySelector('.coach-name')) === '小明');
    const row = ming.querySelector('.club-table').querySelectorAll('tr').find((node) => textOf(node).includes('皇家马德里'));
    expect(textOf(row)).toContain('1 季');
    expect(textOf(row)).toContain('—');
    expect(row.querySelectorAll('.club-honor')).toHaveLength(0);
  });
});

describe('setup coach history', () => {
  it('offers previous coaches as clickable pills', () => {
    const view = renderSetupView({ onStart: () => {}, coaches: ['小明', '小红'] });
    const picks = view.querySelectorAll('.coach-pick');
    // 双方各有一排同样的胶囊。
    expect(picks.map(textOf)).toEqual(['小明', '小红', '小明', '小红']);
    picks[0].click();
    expect(view.querySelectorAll('input')[0].getAttribute('value')).toBe('小明');
  });

  it('links to the world archive with its season count', () => {
    const opened = [];
    const view = renderSetupView({ onStart: () => {}, coaches: [], archiveCount: 3, onOpenArchive: () => opened.push(true) });
    const button = view.querySelectorAll('button').find((item) => textOf(item).includes('档案'));
    expect(textOf(button)).toContain('3');
    button.click();
    expect(opened).toHaveLength(1);
  });

  it('hides the coach pills before any season has been archived', () => {
    const view = renderSetupView({ onStart: () => {}, coaches: [] });
    expect(view.querySelectorAll('.coach-pick').length).toBe(0);
  });

  it('gives the world archive a standalone entry above the setup form', () => {
    const opened = [];
    const view = renderSetupView({ onStart: () => {}, coaches: [], archiveCount: 2, onOpenArchive: () => opened.push(true) });
    const hero = view.querySelector('.world-hero');
    expect(hero).toBeTruthy();
    expect(textOf(hero)).toContain('足球世界 · 档案');
    const enter = hero.querySelector('.world-hero-enter');
    expect(textOf(enter)).toContain('档案');
    enter.click();
    expect(opened).toHaveLength(1);
  });
});
