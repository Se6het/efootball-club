import { el, emptyState, formatScore, teamCell } from '../ui.js';

function groupByRound(matches) {
  const groups = [];
  const byRound = new Map();
  for (const match of matches) {
    let list = byRound.get(match.round);
    if (!list) {
      list = [];
      byRound.set(match.round, list);
      groups.push({ round: match.round, matches: list });
    }
    list.push(match);
  }
  return groups;
}

function renderRoundTable(matches, onEdit) {
  return el('table', {}, [
    el('thead', {}, [
      el('tr', {}, [
        el('th', { text: '场次' }),
        el('th', { text: '主队' }),
        el('th', { text: '客队' }),
        el('th', { text: '比分' }),
        el('th', { text: '状态' }),
        el('th', { text: '操作' }),
      ]),
    ]),
    el('tbody', {}, matches.map((match) => el('tr', {}, [
      el('td', { text: String(match.matchNumber) }),
      el('td', {}, [teamCell(match.homeTeam)]),
      el('td', {}, [teamCell(match.awayTeam)]),
      el('td', { text: formatScore(match) }),
      el('td', { text: match.isPlayed ? '已完成' : '未进行' }),
      el('td', {}, [
        el('button', {
          className: 'button',
          type: 'button',
          text: match.isPlayed ? '修改' : '录入',
          onClick: () => onEdit(match),
        }),
      ]),
    ]))),
  ]);
}

export function renderScheduleView(matches, onEdit) {
  return el('div', { className: 'panel' }, [
    el('h2', { text: '总赛程' }),
    matches.length
      ? el('div', { className: 'schedule-rounds' }, groupByRound(matches).map(({ round, matches: roundMatches }) =>
          el('details', { className: 'round-group', open: true }, [
            el('summary', {}, [
              el('span', { className: 'round-title', text: `第 ${round} 轮` }),
              el('span', { className: 'round-count', text: `${roundMatches.length} 场` }),
            ]),
            el('div', { className: 'table-wrap' }, [renderRoundTable(roundMatches, onEdit)]),
          ])
        ))
      : emptyState('📅', '还没有赛程', '在赛前配置里生成赛程后会显示在这里'),
  ]);
}
