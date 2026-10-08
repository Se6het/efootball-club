import { el, teamCell } from '../ui.js';
import { teamRowClass } from '../teams.js';

const RESULT_CLASS = { 胜: 'success', 负: 'error', 平: 'warning' };

function statTiles(detail) {
  const average = detail.mvpCount > 0 ? detail.averageScore.toFixed(2) : '—';
  return [
    ['出场', detail.appearances ?? detail.matches.length, 'stat-tile-apps'],
    ['进球', detail.goals, 'stat-tile-goals'],
    ['助攻', detail.assists, 'stat-tile-assists'],
    ['参与进球', detail.goalInvolvements ?? detail.goals + detail.assists, 'stat-tile-involvements'],
    ['MVP 场次', detail.mvpCount, 'stat-tile-mvp'],
    ['MVP 平均分', average, 'stat-tile-rating'],
    ['黄牌', detail.yellowCards ?? 0, 'stat-tile-yellow'],
    ['红牌', detail.redCards ?? 0, 'stat-tile-red'],
    ['待停赛', detail.pendingSuspension ?? 0, 'stat-tile-suspension'],
  ];
}

function matchRow(line) {
  const className = [teamRowClass(line.opponent), line.contributed ? '' : 'row-idle'].filter(Boolean).join(' ');
  return el('tr', { className }, [
    el('td', { className: 'num-cell', text: String(line.matchNumber) }),
    el('td', { className: 'muted', text: `第 ${line.round} 轮` }),
    el('td', { className: 'opp-cell' }, [
      el('span', { className: 'venue-tag', text: line.isHome ? '主' : '客' }),
      teamCell(line.opponent),
    ]),
    el('td', {}, [
      el('span', { className: `result-pill ${RESULT_CLASS[line.result] ?? ''}`, text: `${line.result} ${line.forGoals}:${line.againstGoals}` }),
    ]),
    el('td', { className: `num-cell ${line.goals > 0 ? 'stat-hot' : 'muted'}`, text: String(line.goals) }),
    el('td', { className: `num-cell ${line.assists > 0 ? 'stat-hot' : 'muted'}`, text: String(line.assists) }),
    el('td', { className: `num-cell ${line.yellowCards > 0 ? 'card-yellow' : 'muted'}`, text: line.yellowCards ? String(line.yellowCards) : '—' }),
    el('td', { className: `num-cell ${line.redCards > 0 ? 'card-red' : 'muted'}`, text: line.redCards ? String(line.redCards) : '—' }),
    el('td', { className: line.mvpScore == null ? 'muted' : 'mvp-score', text: line.mvpScore == null ? '—' : String(line.mvpScore) }),
  ]);
}

export function renderPlayerDetailView(detail) {
  return el('div', { className: 'player-detail' }, [
    el('div', { className: 'panel player-detail-head' }, [
      el('h2', { text: detail.name }),
      el('div', { className: 'player-detail-team' }, [teamCell(detail.team)]),
    ]),
    el('div', { className: 'stat-grid' }, statTiles(detail).map(([label, value, extra]) =>
      el('div', { className: `stat-tile ${extra}` }, [
        el('div', { className: 'stat-value', text: String(value) }),
        el('div', { className: 'stat-label', text: label }),
      ])
    )),
    el('div', { className: 'panel' }, [
      el('h3', { text: '赛季出场明细' }),
      el('p', { className: 'muted', text: '列出该球员所在球队本赛季已完成的全部比赛，灰色行表示该场没有进球、助攻、牌务或 MVP 记录。' }),
      detail.matches.length
        ? el('div', { className: 'table-wrap' }, [
            el('table', { className: 'match-log' }, [
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
              el('tbody', {}, detail.matches.map(matchRow)),
            ]),
          ])
        : el('p', { className: 'muted', text: '该球员所在球队还没有已完成的比赛' }),
    ]),
  ]);
}
