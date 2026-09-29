import { el, teamCell } from '../ui.js';

function resultClass(result) {
  if (result === '胜') {
    return 'success';
  }
  if (result === '负') {
    return 'error';
  }
  return 'muted';
}

export function renderPlayerDetailView(detail) {
  const statTiles = [
    ['进球', detail.goals],
    ['助攻', detail.assists],
    ['MVP 场次', detail.mvpCount],
    ['MVP 平均分', detail.mvpCount > 0 ? detail.averageScore.toFixed(2) : '—'],
    ['黄牌', detail.yellowCards ?? 0],
    ['红牌', detail.redCards ?? 0],
    ['待停赛', detail.pendingSuspension ?? 0],
  ];

  return el('div', { className: 'player-detail' }, [
    el('div', { className: 'panel player-detail-head' }, [
      el('h2', { text: detail.name }),
      el('div', { className: 'player-detail-team' }, [teamCell(detail.team)]),
    ]),
    el('div', { className: 'stat-grid' }, statTiles.map(([label, value]) =>
      el('div', { className: 'stat-tile' }, [
        el('div', { className: 'stat-value', text: String(value) }),
        el('div', { className: 'stat-label', text: label }),
      ])
    )),
    el('div', { className: 'panel' }, [
      el('h3', { text: '赛季明细' }),
      el('p', { className: 'muted', text: '仅列出该球员有进球、助攻、牌务或当选 MVP 的比赛' }),
      detail.matches.length
        ? el('div', { className: 'table-wrap' }, [
            el('table', {}, [
              el('thead', {}, [
                el('tr', {}, [
                  el('th', { text: '场次' }),
                  el('th', { text: '轮次' }),
                  el('th', { text: '对手' }),
                  el('th', { text: '赛果' }),
                  el('th', { text: '进球' }),
                  el('th', { text: '助攻' }),
                  el('th', { text: '黄牌' }),
                  el('th', { text: '红牌' }),
                  el('th', { text: 'MVP 评分' }),
                ]),
              ]),
              el('tbody', {}, detail.matches.map((line) => el('tr', {}, [
                el('td', { text: String(line.matchNumber) }),
                el('td', { text: String(line.round) }),
                el('td', {}, [teamCell(line.opponent)]),
                el('td', {}, [el('span', { className: resultClass(line.result), text: `${line.result} ${line.forGoals}:${line.againstGoals}` })]),
                el('td', { text: String(line.goals) }),
                el('td', { text: String(line.assists) }),
                el('td', { text: String(line.yellowCards ?? 0) }),
                el('td', { text: String(line.redCards ?? 0) }),
                el('td', { text: line.mvpScore == null ? '—' : String(line.mvpScore) }),
              ]))),
            ]),
          ])
        : el('p', { className: 'muted', text: '该球员本赛季还没有进球、助攻或 MVP 记录' }),
    ]),
  ]);
}
