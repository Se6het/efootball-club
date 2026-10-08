import { el, emptyState, teamCell } from '../ui.js';
import { teamRowClass } from '../teams.js';
import { animateNumber } from '../animate.js';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const RESULT_CLASS = { 胜: 'win', 平: 'draw', 负: 'loss' };

function rankCell(team) {
  const medal = MEDALS[team.rank];
  return el('td', { className: 'rank-cell' }, [
    el('span', {
      className: medal ? 'rank-num rank-num-medal' : 'rank-num',
      text: medal ?? String(team.rank),
    }),
  ]);
}

function numberCell(value, extraClass = '') {
  return el('td', {
    className: `num-cell ${extraClass}`.trim(),
    text: String(value),
    onAfterRender: (node) => animateNumber(node, 0, value, { duration: 500 }),
  });
}

function signedCell(value) {
  const sign = value > 0 ? '+' : '';
  return el('td', {
    className: `num-cell gd-cell ${value > 0 ? 'gd-positive' : value < 0 ? 'gd-negative' : 'gd-zero'}`,
    text: `${sign}${value}`,
    onAfterRender: (node) => animateNumber(node, 0, value, {
      duration: 500,
      formatter: (current) => {
        const rounded = Math.round(current);
        return `${rounded > 0 ? '+' : ''}${rounded}`;
      },
    }),
  });
}

function pointsCell(points, isLeader) {
  return el('td', { className: 'points-cell' }, [
    el('span', {
      className: `points-chip${isLeader ? ' points-chip-leader' : ''}`,
      text: String(points),
      onAfterRender: (node) => animateNumber(node, 0, points, { duration: 500 }),
    }),
  ]);
}

function formStrip(form) {
  if (!form || form.length === 0) {
    return el('td', { className: 'form-cell' }, [el('span', { className: 'muted', text: '—' })]);
  }
  return el('td', { className: 'form-cell' }, [
    el('span', { className: 'form-strip' }, form.map((item) =>
      el('span', {
        className: `form-pill ${RESULT_CLASS[item.result] ?? ''}`,
        title: `第 ${item.matchNumber} 场 ${item.isHome ? '主' : '客'} 对 ${item.opponent} ${item.forGoals}:${item.againstGoals}`,
        text: item.result,
      })
    )),
  ]);
}

export function renderStandingsView(rankedTeams, onTeamClick, options = {}) {
  const formByTeam = options.formByTeam ?? new Map();
  const hasGames = rankedTeams.some((team) => team.played > 0);

  return el('div', { className: 'panel' }, [
    el('div', { className: 'panel-head' }, [
      el('h2', { text: '球队榜' }),
    ]),
    rankedTeams.length
      ? el('div', { className: 'table-wrap' }, [
          el('table', { className: 'standings-table' }, [
            el('thead', {}, [
              el('tr', {}, [
                el('th', { className: 'col-rank', text: '排名' }),
                el('th', { className: 'team-th', text: '球队' }),
                el('th', { text: '近5场' }),
                el('th', { text: '场' }),
                el('th', { text: '胜' }),
                el('th', { text: '平' }),
                el('th', { text: '负' }),
                el('th', { text: '进球' }),
                el('th', { text: '丢球' }),
                el('th', { text: '净胜' }),
                el('th', { className: 'col-points', text: '积分' }),
                el('th', { text: '公平竞赛' }),
                el('th', { text: '备注' }),
              ]),
            ]),
            el('tbody', {}, rankedTeams.map((team) => {
              const isLeader = team.rank === 1 && hasGames;
              const zoneClass = team.rank <= 3 && hasGames ? `rank-top rank-top-${team.rank}` : '';
              return el('tr', {
                className: `${teamRowClass(team.team)} ${zoneClass}`.trim(),
              }, [
                rankCell(team),
                el('td', { className: 'team-col' }, [
                  onTeamClick
                    ? el('button', {
                        className: 'team-link',
                        type: 'button',
                        title: '点击查看队内数据、近期状态与未来赛程',
                        onClick: () => onTeamClick(team.team),
                      }, [teamCell(team.team)])
                    : teamCell(team.team),
                ]),
                formStrip(formByTeam.get(team.team)),
                numberCell(team.played, 'muted-cell'),
                numberCell(team.wins),
                numberCell(team.draws),
                numberCell(team.losses),
                numberCell(team.goalsFor, 'goals-for'),
                numberCell(team.goalsAgainst, 'goals-against'),
                signedCell(team.goalDifference),
                pointsCell(team.points, isLeader),
                el('td', { className: 'num-cell fairplay-cell muted', text: String(team.fairPlayPoints) }),
                el('td', {}, [
                  team.needsPlayoff
                    ? el('span', { className: 'badge badge-warn', text: '需附加赛' })
                    : el('span', { className: 'muted', text: '—' }),
                ]),
              ]);
            })),
          ]),
        ])
      : emptyState('📊', '还没有球队数据', '开赛并录入比分后，这里会展示积分榜'),
  ]);
}
