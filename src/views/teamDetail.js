import { el, teamCell } from '../ui.js';
import { renderList } from './leaders.js';
import { summarizeForm } from '../form.js';
import { renderDonutChart, renderRankChart } from '../chart.js';

const SCORER_COLUMNS = [
  { key: 'rank', label: '排名' },
  { key: 'name', label: '球员' },
  { key: 'goals', label: '进球', animate: true },
  { key: 'assists', label: '助攻', animate: true },
  { key: 'mvpCount', label: 'MVP 场次', animate: true },
  { key: 'averageScore', label: 'MVP 平均分', format: (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00') },
];

const ASSIST_COLUMNS = [
  { key: 'rank', label: '排名' },
  { key: 'name', label: '球员' },
  { key: 'assists', label: '助攻', animate: true },
  { key: 'goals', label: '进球', animate: true },
  { key: 'mvpCount', label: 'MVP 场次', animate: true },
  { key: 'averageScore', label: 'MVP 平均分', format: (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00') },
];

const MVP_COLUMNS = [
  { key: 'rank', label: '排名' },
  { key: 'name', label: '球员' },
  { key: 'count', label: 'MVP 场次', animate: true },
  { key: 'averageScore', label: 'MVP 平均分', format: (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00') },
  { key: 'goals', label: '进球', animate: true },
  { key: 'assists', label: '助攻', animate: true },
];

function formPill(result) {
  return el('span', { className: `form-pill ${result === '胜' ? 'win' : result === '负' ? 'loss' : 'draw'}`, text: result });
}

function formRows(form = []) {
  return form.map((item) =>
    el('li', { className: 'form-row' }, [
      el('span', { className: 'form-round', text: `第 ${item.round} 轮` }),
      formPill(item.result),
      el('span', { className: 'venue-tag', text: item.isHome ? '主' : '客' }),
      el('span', { className: 'form-opponent' }, [teamCell(item.opponent)]),
      el('span', { className: 'form-score', text: `${item.forGoals}:${item.againstGoals}` }),
    ])
  );
}

function formSummary(summ, pointsLabel) {
  return el('div', { className: 'form-summary' }, [
    el('span', { className: 'form-summary-pill win', text: `${summ.wins} 胜` }),
    el('span', { className: 'form-summary-pill draw', text: `${summ.draws} 平` }),
    el('span', { className: 'form-summary-pill loss', text: `${summ.losses} 负` }),
    el('span', { className: 'form-summary-points', text: `${pointsLabel} ${summ.points} 分` }),
  ]);
}

// 整个赛季的胜负占比条：一段一条，宽度按场次占比。
function outcomeBar(summ) {
  const total = summ.wins + summ.draws + summ.losses;
  if (total === 0) {
    return el('div', { className: 'chart-empty muted', text: '还没有已完成的比赛' });
  }

  const segment = (kind, label, count) => {
    if (count <= 0) {
      return null;
    }
    const percent = (count / total) * 100;
    return el('span', {
      className: `outcome-seg ${kind}`,
      style: `width:${percent.toFixed(2)}%`,
      title: `${label} ${count} 场 · ${Math.round(percent)}%`,
      text: percent >= 12 ? String(count) : '',
    });
  };

  return el('div', { className: 'outcome-wrap' }, [
    el('div', { className: 'outcome-bar', role: 'img', 'aria-label': `赛季胜平负分布：胜 ${summ.wins}、平 ${summ.draws}、负 ${summ.losses}` }, [
      segment('win', '胜', summ.wins),
      segment('draw', '平', summ.draws),
      segment('loss', '负', summ.losses),
    ]),
    el('div', { className: 'outcome-legend' }, [
      el('span', { className: 'outcome-key win', text: `胜 ${summ.wins}` }),
      el('span', { className: 'outcome-key draw', text: `平 ${summ.draws}` }),
      el('span', { className: 'outcome-key loss', text: `负 ${summ.losses}` }),
      el('span', { className: 'outcome-key points', text: `赛季累计 ${summ.points} 分` }),
    ]),
  ]);
}

// 逐场结果色块：一眼看完整个赛季的走势。
function outcomeStrip(season = []) {
  return el('div', { className: 'outcome-strip' }, season.map((item) =>
    el('span', {
      className: `outcome-cell ${item.result === '胜' ? 'win' : item.result === '负' ? 'loss' : 'draw'}`,
      title: `第 ${item.round} 轮 ${item.isHome ? '主' : '客'} 对 ${item.opponent} ${item.forGoals}:${item.againstGoals}`,
      text: item.result,
    })
  ));
}

// 赛季进阶数据：给主教练看的几组派生指标。
function seasonStats(season = []) {
  const played = season.length;
  const goalsFor = season.reduce((sum, item) => sum + item.forGoals, 0);
  const goalsAgainst = season.reduce((sum, item) => sum + item.againstGoals, 0);
  const cleanSheets = season.filter((item) => item.againstGoals === 0).length;
  const tally = (list) => `${list.filter((item) => item.result === '胜').length}-${list.filter((item) => item.result === '平').length}-${list.filter((item) => item.result === '负').length}`;
  const home = season.filter((item) => item.isHome);
  const away = season.filter((item) => !item.isHome);

  const average = (value) => (played > 0 ? (value / played).toFixed(2) : '0.00');
  const tiles = [
    [average(goalsFor), '场均进球', 'stat-tile-goals'],
    [average(goalsAgainst), '场均失球', 'stat-tile-red'],
    [String(cleanSheets), '零封场次', 'stat-tile-apps'],
    [`${goalsFor}:${goalsAgainst}`, '进球:丢球', 'stat-tile-assists'],
    [tally(home), '主场 胜-平-负', 'stat-tile-mvp'],
    [tally(away), '客场 胜-平-负', 'stat-tile-rating'],
  ];

  return el('div', { className: 'stat-grid' }, tiles.map(([value, label, extra]) =>
    el('div', { className: `stat-tile ${extra}` }, [
      el('div', { className: 'stat-value', text: value }),
      el('div', { className: 'stat-label', text: label }),
    ])
  ));
}

function renderRecentForm(form = []) {
  if (form.length === 0) {
    return el('div', { className: 'panel form-panel' }, [
      el('h3', {}, [el('span', { className: 'panel-icon', text: '📈' }), el('span', { text: '近期战绩' })]),
      el('p', { className: 'muted', text: '该队还没有已完成的比赛' }),
    ]);
  }

  return el('div', { className: 'panel form-panel' }, [
    el('h3', {}, [el('span', { className: 'panel-icon', text: '📈' }), el('span', { text: `近期战绩（最近 ${form.length} 场）` })]),
    formSummary(summarizeForm(form), '近期'),
    el('ul', { className: 'form-list' }, formRows(form)),
  ]);
}

// 球队详情里的「整个赛季」折叠区：排名走势 + 赛季胜负可视化 + 进阶数据 + 全部比赛。
function renderSeasonPanel(season = [], progression = [], totalTeams = 0) {
  const body = [
    el('h4', { text: '排名走势' }),
    renderRankChart(progression, { totalTeams }),
  ];

  if (season.length > 0) {
    const summary = summarizeForm(season);
    body.push(
      el('h4', { text: '赛季胜负分布' }),
      outcomeBar(summary),
      outcomeStrip(season),
      el('h4', { text: '进阶数据' }),
      seasonStats(season),
      el('h4', { text: '赛季全部比赛' }),
      el('ul', { className: 'form-list' }, formRows(season)),
    );
  } else {
    body.push(el('p', { className: 'muted', text: '该队还没有已完成的比赛' }));
  }

  return el('details', { className: 'season-panel' }, [
    el('summary', {}, [
      el('span', { className: 'panel-icon', text: '📊' }),
      el('span', { text: '整个赛季' }),
      el('span', { className: 'round-count', text: season.length > 0 ? `${season.length} 场已完成` : '暂无数据' }),
    ]),
    el('div', { className: 'season-body' }, body),
  ]);
}

// 球队详情里的「进攻分布」折叠区：队内进球、助攻占比环形图。
function renderSharePanel(leaders) {
  const goalSlices = (leaders.scorerList ?? []).map((player) => ({ label: player.name, value: player.goals }));
  const assistSlices = (leaders.assistList ?? []).map((player) => ({ label: player.name, value: player.assists }));

  return el('details', { className: 'season-panel share-panel' }, [
    el('summary', {}, [
      el('span', { className: 'panel-icon', text: '🥧' }),
      el('span', { text: '进攻分布（进球 / 助攻占比）' }),
      el('span', { className: 'round-count', text: goalSlices.length > 0 ? `${goalSlices.length} 人进球` : '暂无' }),
    ]),
    el('div', { className: 'share-body' }, [
      el('div', { className: 'share-block' }, [
        el('h4', { text: '进球占比' }),
        renderDonutChart(goalSlices, { unit: '球', label: '进球占比', emptyText: '该队还没有进球记录' }),
      ]),
      el('div', { className: 'share-block' }, [
        el('h4', { text: '助攻占比' }),
        renderDonutChart(assistSlices, { unit: '次', label: '助攻占比', emptyText: '该队还没有助攻记录' }),
      ]),
    ]),
  ]);
}

// 球队详情里的「纪律情况」折叠区：红黄牌统计 + 已停赛 / 待停赛 / 停赛风险提示。
function renderDisciplinePanel(discipline = []) {
  return el('details', { className: 'season-panel discipline-panel' }, [
    el('summary', {}, [
      el('span', { className: 'panel-icon', text: '🟨' }),
      el('span', { text: '纪律情况（红黄牌 / 停赛）' }),
      el('span', { className: 'round-count', text: discipline.length ? `${discipline.length} 人有牌` : '暂无' }),
    ]),
    discipline.length
      ? el('ul', { className: 'discipline-list' }, discipline.map((row) =>
          el('li', { className: 'discipline-row' }, [
            el('span', { className: 'discipline-name', text: row.name }),
            el('span', { className: 'discipline-cards' }, [
              el('span', { className: 'card-chip card-chip-yellow', text: `黄 ${row.yellowCards}` }),
              el('span', { className: 'card-chip card-chip-red', text: `红 ${row.redCards}` }),
            ]),
            row.servedSuspensions > 0
              ? el('span', { className: 'discipline-badge served', text: `已停赛过 ${row.servedSuspensions} 场` })
              : null,
            row.pendingSuspension > 0
              ? el('span', { className: 'discipline-badge pending', text: `待停赛 ${row.pendingSuspension} 场` })
              : null,
            row.oneYellowFromBan
              ? el('span', { className: 'discipline-badge risk', text: '再吃 1 黄即停赛' })
              : null,
          ])
        ))
      : el('p', { className: 'muted', text: '该队本赛季还没有红黄牌记录' }),
  ]);
}

function renderUpcoming(upcoming = []) {
  return el('div', { className: 'panel upcoming-panel' }, [
    el('h3', {}, [el('span', { className: 'panel-icon', text: '🗓️' }), el('span', { text: '未来赛程' })]),
    upcoming.length
      ? el('ul', { className: 'upcoming-list' }, upcoming.map((item) =>
          el('li', { className: 'upcoming-row' }, [
            el('span', { className: 'upcoming-round', text: `第 ${item.round} 轮` }),
            el('span', { className: 'venue-tag', text: item.isHome ? '主' : '客' }),
            el('span', { className: 'upcoming-opponent' }, [teamCell(item.opponent)]),
          ])
        ))
      : el('p', { className: 'muted', text: '该队本赛季剩余赛程已全部结束' }),
  ]);
}

export function renderTeamDetailView(team, leaders, onPlayerClick, options = {}) {
  return el('div', { className: 'team-detail' }, [
    el('div', { className: 'panel team-detail-head' }, [
      el('h2', {}, [teamCell(team)]),
      el('p', { className: 'muted', text: '队内球员表现 · 近期状态 · 未来赛程' }),
    ]),
    renderRecentForm(options.form ?? []),
    renderUpcoming(options.upcoming ?? []),
    renderList('队内射手榜', leaders.scorerList, '该队暂无进球', SCORER_COLUMNS, '录入比分后这里会出现队内射手榜', onPlayerClick, { icon: '👟', emptyIcon: '👟' }),
    renderList('队内助攻榜', leaders.assistList, '该队暂无助攻', ASSIST_COLUMNS, '录入助攻后这里会出现队内助攻榜', onPlayerClick, { icon: '🎯', emptyIcon: '🎯' }),
    renderList('队内 MVP 榜', leaders.mvpList ?? [], '该队暂无 MVP', MVP_COLUMNS, '录入比赛 MVP 后这里会出现队内 MVP 榜', onPlayerClick, { icon: '⭐', emptyIcon: '⭐' }),
    renderSharePanel(leaders),
    renderSeasonPanel(options.season ?? [], options.progression ?? [], options.totalTeams ?? 0),
    renderDisciplinePanel(options.discipline ?? []),
  ]);
}
