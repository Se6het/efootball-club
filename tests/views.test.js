import { describe, expect, it } from 'vitest';
import { installDom, textOf } from './helpers/dom.js';

installDom();

const { renderNextMatchView, renderHeadToHead } = await import('../src/views/nextMatch.js');
const { renderStandingsView } = await import('../src/views/standings.js');
const { renderLeadersView } = await import('../src/views/leaders.js');
const { renderTeamDetailView } = await import('../src/views/teamDetail.js');
const { renderPlayerDetailView } = await import('../src/views/playerDetail.js');
const { renderScheduleView } = await import('../src/views/schedule.js');
const { renderSetupView } = await import('../src/views/setup.js');
const { renderAwardsView } = await import('../src/views/awards.js');
const { openMatchForm } = await import('../src/views/matchForm.js');
const { computeHeadToHead } = await import('../src/h2h.js');
const { computeTeamForm, computeUpcomingFixtures, computeTeamFormMap } = await import('../src/form.js');
const { computeLeaders, computePlayerDetail, computeTeamLeaders } = await import('../src/leaders.js');
const { buildAwardSummary } = await import('../src/awards.js');
const { rankTeams } = await import('../src/standings.js');

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
