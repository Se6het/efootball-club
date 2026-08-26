import { el, emptyState, teamCell } from '../ui.js';
import { teamRowClass } from '../teams.js';
import { animateNumber } from '../animate.js';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function rankCell(team) {
  const medal = MEDALS[team.rank];
  if (medal) {
    return el('td', { className: 'rank-medal', text: medal });
  }
  return el('td', { text: String(team.rank) });
}

function numberCell(value) {
  return el('td', {
    className: 'num-cell',
    text: String(value),
    onAfterRender: (node) => animateNumber(node, 0, value, { duration: 500 }),
  });
}

export function renderStandingsView(rankedTeams) {
  return el('div', { className: 'panel' }, [
    el('h2', { text: '球队榜' }),
    rankedTeams.length
      ? el('div', { className: 'table-wrap' }, [
          el('table', {}, [
            el('thead', {}, [
              el('tr', {}, [
                el('th', { text: '排名' }),
                el('th', { text: '球队' }),
                el('th', { text: '场次' }),
                el('th', { text: '胜' }),
                el('th', { text: '平' }),
                el('th', { text: '负' }),
                el('th', { text: '进' }),
                el('th', { text: '失' }),
                el('th', { text: '净胜' }),
                el('th', { text: '积分' }),
                el('th', { text: '公平竞赛' }),
                el('th', { text: '备注' }),
              ]),
            ]),
            el('tbody', {}, rankedTeams.map((team) => el('tr', {
              className: `${teamRowClass(team.team)} ${team.rank <= 3 ? 'rank-top' : ''}`.trim(),
            }, [
              rankCell(team),
              el('td', {}, [teamCell(team.team)]),
              numberCell(team.played),
              numberCell(team.wins),
              numberCell(team.draws),
              numberCell(team.losses),
              numberCell(team.goalsFor),
              numberCell(team.goalsAgainst),
              numberCell(team.goalDifference),
              numberCell(team.points),
              numberCell(team.fairPlayPoints),
              el('td', {}, [
                team.needsPlayoff ? el('span', { className: 'badge', text: '需中立场附加赛' }) : el('span', { className: 'muted', text: ' ' }),
              ]),
            ]))),
          ]),
        ])
      : emptyState('📊', '还没有球队数据', '开赛并录入比分后，这里会展示积分榜'),
  ]);
}
