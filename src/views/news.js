import { el, teamCell, emptyState } from '../ui.js';
import { NEWS_CATEGORIES, TIER_META, newsDifficulty, splitNews } from '../news.js';

// 新闻视图：头条（大字卡）→ 更多看点（紧凑列表）→ 实时赔率。
// 主次分工明确：头条给最稀有的记录，其余按稀有度排下去，赔率固定在最后。

function tierBadge(tier) {
  const meta = TIER_META[tier] ?? TIER_META.common;
  return el('span', { className: `news-tier tier-${tier}`, text: `${meta.icon} ${meta.label}` });
}

function difficultyBar(entry) {
  const value = newsDifficulty(entry);
  return el('div', {
    className: 'news-difficulty',
    role: 'img',
    'aria-label': `达成难度 ${value}%`,
    title: `达成难度 ${value}%`,
  }, [
    el('div', { className: `news-difficulty-fill tier-${entry.tier}`, style: `width: ${value}%` }),
  ]);
}

function headlineCard(entry) {
  return el('article', { className: `news-card tier-${entry.tier}` }, [
    el('div', { className: 'news-card-top' }, [
      tierBadge(entry.tier),
      el('span', { className: 'news-cat', text: NEWS_CATEGORIES[entry.category] ?? '看点' }),
    ]),
    el('h3', { className: 'news-card-title' }, [
      el('span', { className: 'news-icon', text: entry.icon }),
      el('span', { text: entry.title }),
    ]),
    el('p', { className: 'news-card-detail muted', text: entry.detail }),
    difficultyBar(entry),
  ]);
}

function storyRow(entry) {
  return el('li', { className: `news-row tier-${entry.tier}` }, [
    el('span', { className: 'news-row-icon', text: entry.icon }),
    el('span', { className: 'news-row-main' }, [
      el('span', { className: 'news-row-title', text: entry.title }),
      el('span', { className: 'news-row-detail muted', text: entry.detail }),
    ]),
    el('span', { className: 'news-row-cat muted', text: NEWS_CATEGORIES[entry.category] ?? '看点' }),
    tierBadge(entry.tier),
  ]);
}

function headlineSection(items, playedCount) {
  const { headlines, more } = splitNews(items, 3);
  const body = [];

  body.push(
    el('div', { className: 'news-head' }, [
      el('h2', { text: '新闻' }),
      el('p', { className: 'muted', text: `赛季看点与实时赔率 · 已结算 ${playedCount} 场比赛` }),
    ])
  );

  if (items.length === 0) {
    body.push(emptyState('📰', '还没有新闻', '录入比分后，这里会自动生成看点与纪录'));
    return el('section', { className: 'news-hero' }, body);
  }

  body.push(el('div', { className: 'news-headlines' }, headlines.map(headlineCard)));

  if (more.length > 0) {
    body.push(
      el('div', { className: 'panel news-more' }, [
        el('div', { className: 'panel-head' }, [
          el('h3', { text: '更多看点' }),
          el('span', { className: 'muted news-count', text: `${more.length} 条` }),
        ]),
        el('ul', { className: 'news-list' }, more.map(storyRow)),
      ])
    );
  }

  return el('section', { className: 'news-hero' }, body);
}

function oddCell(value, percent) {
  if (value === null || value === undefined) {
    return el('td', { className: 'num-cell muted', text: '—' });
  }
  return el('td', { className: 'num-cell' }, [
    el('span', { className: 'odd-value', text: value.toFixed(2) }),
    el('span', { className: 'odd-percent', text: `${percent}%` }),
  ]);
}

function teamOddsTable(rows) {
  return el('div', { className: 'table-wrap' }, [
    el('table', { className: 'odds-table' }, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', { text: '球队' }),
          el('th', { className: 'num-cell', text: '夺冠赔率' }),
          el('th', { className: 'num-cell', text: '进前三赔率' }),
          el('th', { className: 'num-cell', text: '战绩' }),
        ]),
      ]),
      el('tbody', {}, rows.map((row) => el('tr', {}, [
        el('td', {}, [teamCell(row.team)]),
        oddCell(row.championOdd, row.championPercent),
        oddCell(row.top3Odd, row.top3Percent),
        el('td', { className: 'num-cell muted', text: `${row.points} 分 · 剩 ${row.remaining} 场` }),
      ]))),
    ]),
  ]);
}

function playerOddsTable(rows) {
  return el('div', { className: 'table-wrap' }, [
    el('table', { className: 'odds-table' }, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', { text: '球员' }),
          el('th', { className: 'num-cell', text: '金靴' }),
          el('th', { className: 'num-cell', text: '助攻王' }),
          el('th', { className: 'num-cell', text: 'FMVP' }),
        ]),
      ]),
      el('tbody', {}, rows.map((row) => el('tr', {}, [
        el('td', {}, [
          el('span', { className: 'player-name', text: row.name }),
          el('span', { className: 'player-team muted', text: ` · ${row.team}` }),
        ]),
        oddCell(row.bootOdd, row.bootPercent),
        oddCell(row.assistOdd, row.assistPercent),
        oddCell(row.fmvpOdd, row.fmvpPercent),
      ]))),
    ]),
  ]);
}

function oddsSection(odds) {
  if (!odds || !odds.available) {
    return el('div', { className: 'panel news-odds' }, [
      el('h3', { text: '实时赔率' }),
      emptyState('🎲', '暂时无法开盘', '先配置球队并录入比赛，赔率会随赛程推进实时计算'),
    ]);
  }

  const notes = [
    odds.finished
      ? '赛季已结束，赔率已封盘（按最终成绩结算）。'
      : `基于 ${odds.iterations} 次蒙特卡洛模拟：综合当前战绩、最近几场状态与剩余赛程。`,
    '赔率含 6% 水位；概率为模拟夺冠/获奖比例。',
  ];

  return el('div', { className: 'panel news-odds' }, [
    el('div', { className: 'panel-head' }, [
      el('h3', { text: '实时赔率' }),
      el('span', { className: `odds-status${odds.finished ? ' finished' : ''}`, text: odds.finished ? '已封盘' : '进行中' }),
    ]),
    el('div', { className: 'odds-notes' }, notes.map((text) => el('p', { className: 'muted', text }))),
    el('h4', { className: 'odds-subtitle', text: '冠军 / 前三' }),
    teamOddsTable(odds.teams),
    el('h4', { className: 'odds-subtitle', text: '球员奖项' }),
    odds.players.length > 0
      ? playerOddsTable(odds.players.slice(0, 12))
      : el('p', { className: 'muted', text: '还没有球员数据，录入进球/助攻/MVP 后才会开盘' }),
  ]);
}

export function renderNewsView({ news = [], odds = null, playedCount = 0 } = {}) {
  return el('div', { className: 'news-view' }, [
    headlineSection(news, playedCount),
    oddsSection(odds),
  ]);
}
