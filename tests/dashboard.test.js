import { describe, expect, it } from 'vitest';
import { installDom, textOf } from './helpers/dom.js';

installDom();

const { renderDashboard } = await import('../src/views/dashboard.js');

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

const played = fixture('m-1', 1, 1, '皇家马德里', '巴塞罗那', 2, 1, true);
const nextMatch = fixture('m-2', 2, 2, '拜仁慕尼黑', '曼城', 0, 0, false);
const matches = [played, nextMatch];

const rankedTeams = [
  { rank: 1, team: '皇家马德里', points: 3, played: 1 },
  { rank: 2, team: '巴塞罗那', points: 0, played: 1 },
];
const leaders = { scorerList: [{ name: '张三', team: '皇家马德里', goals: 2 }] };
const news = [
  { id: 'n-1', tier: 'legend', icon: '🟣', title: '张三 连续 3 场进球', detail: '状态火热', metric: 3, teams: ['皇家马德里'], round: 3 },
  { id: 'n-2', tier: 'common', icon: '⚪', title: '最新战报：皇家马德里 2:1 巴塞罗那', detail: '刚结束', metric: 1, teams: ['皇家马德里', '巴塞罗那'], round: 3 },
];

function render(overrides = {}) {
  return renderDashboard({
    nextMatch,
    matches,
    rankedTeams,
    leaders,
    news,
    seasonFinished: false,
    onOpen: () => {},
    ...overrides,
  });
}

function tileTitles(view) {
  return view.querySelectorAll('.tile').map((tile) => textOf(tile.querySelector('.tile-title')));
}

describe('dashboard view', () => {
  it('renders five tiles with news first and spanning the full width', () => {
    const view = render();
    expect(view.querySelectorAll('.tile')).toHaveLength(5);
    expect(tileTitles(view)).toEqual(['新闻', '下一场', '赛程', '球队榜', '球员榜']);
    expect(view.querySelectorAll('.tile-wide')).toHaveLength(1);
    expect(view.querySelectorAll('.mini-news')).toHaveLength(2);
    // 层级只上色（tier-*），再挂上相关球队的队徽。
    expect(view.querySelector('.mini-news').className).toContain('tier-legend');
    expect(view.querySelector('.mini-news').className).toContain('lead');
    expect(view.querySelectorAll('.mini-news-crests')).toHaveLength(2);
  });

  it('summarizes the next fixture, upcoming schedule, standings, scorers and news', () => {
    const text = textOf(render());
    expect(text).toContain('拜仁慕尼黑');
    expect(text).toContain('曼城');
    expect(text).toContain('第 2 轮');
    expect(text).toContain('张三');
    expect(text).toContain('连续 3 场进球');
    // 不再把「传说/史诗」这类字样写进界面。
    expect(text).not.toContain('传说');
    expect(text).not.toContain('史诗');
    expect(text).toContain('查看全部');
  });

  it('opens the matching detail view from each tile', () => {
    const opened = [];
    const view = render({ onOpen: (key) => opened.push(key) });
    view.querySelectorAll('.tile').forEach((tile) => tile.click());
    expect(opened).toEqual(['news', 'next', 'schedule', 'standings', 'leaders']);
  });

  it('swaps in the awards tile once the season is over', () => {
    const opened = [];
    const view = render({ nextMatch: null, seasonFinished: true, onOpen: (key) => opened.push(key) });
    expect(tileTitles(view)).toEqual(['新闻', '赛季颁奖', '赛程', '球队榜', '球员榜']);
    const awardsTile = view.querySelectorAll('.tile').find((tile) => textOf(tile.querySelector('.tile-title')) === '赛季颁奖');
    awardsTile.click();
    expect(opened).toEqual(['awards']);
    expect(textOf(view)).toContain('冠军');
  });

  it('falls back to muted hints when there is nothing to summarize', () => {
    const text = textOf(render({ matches: [], rankedTeams: [], leaders: { scorerList: [] }, nextMatch: null, news: [] }));
    expect(text).toContain('所有比赛都已完成');
    expect(text).toContain('还没有赛程');
    expect(text).toContain('还没有球队数据');
    expect(text).toContain('暂无进球记录');
    expect(text).toContain('录入比分后这里会出现看点与赔率');
  });
});
