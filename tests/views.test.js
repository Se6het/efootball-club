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
const { renderAwardsView } = await import('../src/views/awards.js');
const { openMatchForm } = await import('../src/views/matchForm.js');
const { computeHeadToHead } = await import('../src/h2h.js');
const { computeTeamForm, computeUpcomingFixtures, computeTeamFormMap } = await import('../src/form.js');
const { computeLeaders, computePlayerDetail, computeTeamLeaders } = await import('../src/leaders.js');
const { buildAwardSummary } = await import('../src/awards.js');
const { computeRankProgression, rankTeams } = await import('../src/standings.js');
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
