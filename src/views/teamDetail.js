import { el, teamCell } from '../ui.js';
import { renderList } from './leaders.js';
import { summarizeForm } from '../form.js';

const RESULT_CLASS = { 胜: 'success', 负: 'error', 平: 'warning' };

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

function renderRecentForm(form = []) {
  if (form.length === 0) {
    return el('div', { className: 'panel form-panel' }, [
      el('h3', {}, [el('span', { className: 'panel-icon', text: '📈' }), el('span', { text: '近期战绩' })]),
      el('p', { className: 'muted', text: '该队还没有已完成的比赛' }),
    ]);
  }

  const summary = summarizeForm(form);
  return el('div', { className: 'panel form-panel' }, [
    el('h3', {}, [el('span', { className: 'panel-icon', text: '📈' }), el('span', { text: `近期战绩（最近 ${form.length} 场）` })]),
    el('div', { className: 'form-summary' }, [
      el('span', { className: 'form-summary-pill win', text: `${summary.wins} 胜` }),
      el('span', { className: 'form-summary-pill draw', text: `${summary.draws} 平` }),
      el('span', { className: 'form-summary-pill loss', text: `${summary.losses} 负` }),
      el('span', { className: 'form-summary-points', text: `近期 ${summary.points} 分` }),
    ]),
    el('ul', { className: 'form-list' }, form.map((item) =>
      el('li', { className: 'form-row' }, [
        el('span', { className: 'form-round', text: `第 ${item.round} 轮` }),
        formPill(item.result),
        el('span', { className: 'venue-tag', text: item.isHome ? '主' : '客' }),
        el('span', { className: 'form-opponent' }, [teamCell(item.opponent)]),
        el('span', { className: 'form-score', text: `${item.forGoals}:${item.againstGoals}` }),
      ])
    )),
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
  ]);
}
