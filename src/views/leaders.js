import { el, emptyState, teamCell } from '../ui.js';
import { teamRowClass } from '../teams.js';
import { animateNumber } from '../animate.js';

function numCell(value, item) {
  return el('td', {
    className: 'num-cell',
    text: String(value ?? 0),
    onAfterRender: (node) => animateNumber(node, 0, Number(value ?? 0), { duration: 500 }),
  });
}

export function renderList(title, items, emptyText, columns, emptyHint = '', onPlayerClick) {
  return el('div', { className: 'panel' }, [
    el('h2', { text: title }),
    items.length
      ? el('div', { className: 'table-wrap' }, [
          el('table', {}, [
            el('thead', {}, [
              el('tr', {}, [
                ...columns.map((column) => el('th', { text: column.label })),
              ]),
            ]),
            el('tbody', {}, items.map((item, index) => el('tr', { className: teamRowClass(item.team) }, columns.map((column) => {
              if (column.key === 'rank') {
                return el('td', { text: String(index + 1) });
              }
              if (column.key === 'team') {
                return el('td', {}, [teamCell(item.team)]);
              }
              if (column.key === 'name') {
                return el('td', {}, [
                  onPlayerClick
                    ? el('button', {
                        className: 'player-link',
                        type: 'button',
                        title: '查看球员数据',
                        onClick: () => onPlayerClick(item),
                      }, [el('span', { text: item.name })])
                    : el('span', { text: item.name }),
                ]);
              }
              const value = item[column.key];
              if (column.animate) {
                return numCell(value, item);
              }
              return el('td', { text: column.format ? column.format(value, item) : String(value ?? 0) });
            })))),
          ]),
        ])
      : emptyState('🏅', emptyText, emptyHint),
  ]);
}

export function renderLeadersView(leaders, onPlayerClick) {
  return el('div', { className: 'grid-three' }, [
    renderList('射手榜', leaders.scorerList, '暂无进球记录', [
      { key: 'rank', label: '排名' },
      { key: 'name', label: '球员' },
      { key: 'team', label: '球队' },
      { key: 'goals', label: '进球', animate: true },
      { key: 'assists', label: '助攻', animate: true },
      { key: 'mvpCount', label: 'MVP 场次', animate: true },
      { key: 'averageScore', label: 'MVP 平均分', format: (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00') },
    ], '还没人进球', '录入比赛比分后，射手榜会在这里出现', onPlayerClick),
    renderList('助攻榜', leaders.assistList, '暂无助攻记录', [
      { key: 'rank', label: '排名' },
      { key: 'name', label: '球员' },
      { key: 'team', label: '球队' },
      { key: 'assists', label: '助攻', animate: true },
      { key: 'goals', label: '进球', animate: true },
      { key: 'mvpCount', label: 'MVP 场次', animate: true },
      { key: 'averageScore', label: 'MVP 平均分', format: (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00') },
    ], '还没人助攻', '录入比赛助攻后，助攻榜会在这里出现', onPlayerClick),
    renderList('MVP 榜', leaders.mvpList ?? [], '暂无 MVP 记录', [
      { key: 'rank', label: '排名' },
      { key: 'name', label: '球员' },
      { key: 'team', label: '球队' },
      { key: 'count', label: 'MVP 场次', animate: true },
      { key: 'averageScore', label: 'MVP 平均分', format: (value) => (Number.isFinite(value) ? value.toFixed(2) : '0.00') },
      { key: 'goals', label: '进球', animate: true },
      { key: 'assists', label: '助攻', animate: true },
    ], '还没有 MVP', '录入比赛时填写全场 MVP 后会在这里出现', onPlayerClick),
  ]);
}
