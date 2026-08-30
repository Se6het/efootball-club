import { el, teamCell } from '../ui.js';
import { renderList } from './leaders.js';

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

export function renderTeamDetailView(team, leaders, onPlayerClick) {
  return el('div', { className: 'team-detail' }, [
    el('div', { className: 'panel team-detail-head' }, [
      el('h2', {}, [teamCell(team)]),
      el('p', { className: 'muted', text: '仅统计该队球员的进球、助攻与全场 MVP 表现' }),
    ]),
    renderList('队内射手榜', leaders.scorerList, '该队暂无进球', SCORER_COLUMNS, '录入比分后这里会出现队内射手榜', onPlayerClick),
    renderList('队内助攻榜', leaders.assistList, '该队暂无助攻', ASSIST_COLUMNS, '录入助攻后这里会出现队内助攻榜', onPlayerClick),
    renderList('队内 MVP 榜', leaders.mvpList ?? [], '该队暂无 MVP', MVP_COLUMNS, '录入比赛 MVP 后这里会出现队内 MVP 榜', onPlayerClick),
  ]);
}
