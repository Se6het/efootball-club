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

function numberCell(value, extraClass = '', animate = true) {
  return el('td', {
    className: `num-cell ${extraClass}`.trim(),
    text: String(value),
    onAfterRender: animate ? (node) => animateNumber(node, 0, value, { duration: 500 }) : null,
  });
}

function signedCell(value, animate = true) {
  const sign = value > 0 ? '+' : '';
  return el('td', {
    className: `num-cell gd-cell ${value > 0 ? 'gd-positive' : value < 0 ? 'gd-negative' : 'gd-zero'}`,
    text: `${sign}${value}`,
    onAfterRender: animate ? (node) => animateNumber(node, 0, value, {
      duration: 500,
      formatter: (current) => {
        const rounded = Math.round(current);
        return `${rounded > 0 ? '+' : ''}${rounded}`;
      },
    }) : null,
  });
}

function pointsCell(points, isLeader, animate = true) {
  return el('td', { className: 'points-cell' }, [
    el('span', {
      className: `points-chip${isLeader ? ' points-chip-leader' : ''}`,
      text: String(points),
      onAfterRender: animate ? (node) => animateNumber(node, 0, points, { duration: 500 }) : null,
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

// 可点击排序的表头：key 为排序字段，defaultDir 为首次点击的方向。
const SORT_COLUMNS = [
  { key: 'points', label: '积分', className: 'col-points', defaultDir: 'desc' },
  { key: 'wins', label: '胜', defaultDir: 'desc' },
  { key: 'draws', label: '平', defaultDir: 'desc' },
  { key: 'losses', label: '负', defaultDir: 'asc' },
  { key: 'goalsFor', label: '进球', defaultDir: 'desc' },
  { key: 'goalsAgainst', label: '丢球', defaultDir: 'asc' },
  { key: 'goalDifference', label: '净胜', defaultDir: 'desc' },
  { key: 'fairPlayPoints', label: '公平竞赛', defaultDir: 'asc' },
];

const SORT_BY_KEY = new Map(SORT_COLUMNS.map((column) => [column.key, column]));
const CARET = { desc: '▼', asc: '▲', none: '⇅' };

export function renderStandingsView(rankedTeams, onTeamClick, options = {}) {
  const formByTeam = options.formByTeam ?? new Map();
  const ownerByTeam = options.ownerByTeam ?? {};
  const hasGames = rankedTeams.some((team) => team.played > 0);
  const sort = { key: 'points', dir: 'desc' };
  const headerRefs = new Map();

  const tbody = el('tbody', {}, []);

  // 默认按积分：直接沿用官方排名（含相互战绩等细则）；其余维度按数值排序，同值退回官方排名。
  function sortedTeams() {
    if (sort.key === 'points' && sort.dir === 'desc') {
      return rankedTeams;
    }
    const factor = sort.dir === 'asc' ? 1 : -1;
    return rankedTeams.slice().sort((left, right) => {
      const diff = (Number(left[sort.key]) - Number(right[sort.key])) * factor;
      return diff || left.rank - right.rank;
    });
  }

  function buildRow(team, animate) {
    const isLeader = team.rank === 1 && hasGames;
    const zoneClass = team.rank <= 3 && hasGames ? `rank-top rank-top-${team.rank}` : '';
    return el('tr', { className: `${teamRowClass(team.team)} ${zoneClass}`.trim() }, [
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
        ownerByTeam[team.team]
          ? el('span', { className: 'owner-tag', text: ownerByTeam[team.team], title: `归属：${ownerByTeam[team.team]}` })
          : null,
      ]),
      formStrip(formByTeam.get(team.team)),
      numberCell(team.played, 'muted-cell', animate),
      numberCell(team.wins, '', animate),
      numberCell(team.draws, '', animate),
      numberCell(team.losses, '', animate),
      numberCell(team.goalsFor, 'goals-for', animate),
      numberCell(team.goalsAgainst, 'goals-against', animate),
      signedCell(team.goalDifference, animate),
      pointsCell(team.points, isLeader, animate),
      el('td', { className: 'num-cell fairplay-cell muted', text: String(team.fairPlayPoints) }),
      el('td', {}, [
        team.needsPlayoff
          ? el('span', { className: 'badge badge-warn', text: '需附加赛' })
          : el('span', { className: 'muted', text: '—' }),
      ]),
    ]);
  }

  function paint(animate) {
    tbody.replaceChildren(...sortedTeams().map((team) => buildRow(team, animate)));
    for (const [key, entry] of headerRefs) {
      const active = key === sort.key;
      entry.th.className = `${entry.className} sortable-th${active ? ' sortable-active' : ''}`.trim();
      entry.caret.textContent = active ? CARET[sort.dir] : CARET.none;
    }
  }

  function onSort(key) {
    const column = SORT_BY_KEY.get(key);
    if (sort.key === key) {
      sort.dir = sort.dir === 'desc' ? 'asc' : 'desc';
    } else {
      sort.key = key;
      sort.dir = column.defaultDir;
    }
    paint(false);
  }

  function sortableHeader(column) {
    const caret = el('span', { className: 'sort-caret', text: CARET.none });
    const th = el('th', { className: `${column.className ?? ''} sortable-th`.trim() }, [
      el('button', {
        className: 'sort-button',
        type: 'button',
        title: `按${column.label}排序（再次点击切换升/降序）`,
        onClick: () => onSort(column.key),
      }, [el('span', { text: column.label }), caret]),
    ]);
    headerRefs.set(column.key, { th, caret, className: column.className ?? '' });
    return th;
  }

  const head = el('thead', {}, [
    el('tr', {}, [
      el('th', { className: 'col-rank', text: '排名' }),
      el('th', { className: 'team-th', text: '球队' }),
      el('th', { text: '近5场' }),
      el('th', { text: '场' }),
      sortableHeader(SORT_COLUMNS[1]),
      sortableHeader(SORT_COLUMNS[2]),
      sortableHeader(SORT_COLUMNS[3]),
      sortableHeader(SORT_COLUMNS[4]),
      sortableHeader(SORT_COLUMNS[5]),
      sortableHeader(SORT_COLUMNS[6]),
      sortableHeader(SORT_COLUMNS[0]),
      sortableHeader(SORT_COLUMNS[7]),
      el('th', { text: '备注' }),
    ]),
  ]);

  const panel = el('div', { className: 'panel' }, [
    el('div', { className: 'panel-head' }, [
      el('h2', { text: '球队榜' }),
      rankedTeams.length
        ? el('span', { className: 'sort-hint muted', text: '点击表头可按该项排序，再点一次切换升/降序' })
        : null,
    ]),
    rankedTeams.length
      ? el('div', { className: 'table-wrap' }, [
          el('table', { className: 'standings-table' }, [head, tbody]),
        ])
      : emptyState('📊', '还没有球队数据', '开赛并录入比分后，这里会展示积分榜'),
  ]);

  if (rankedTeams.length) {
    paint(true);
  }

  return panel;
}
