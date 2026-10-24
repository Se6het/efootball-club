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
  const tieGroups = options.tieGroups ?? [];
  const hasGames = rankedTeams.some((team) => team.played > 0);
  const sort = { key: 'points', dir: 'desc' };
  const headerRefs = new Map();
  const expandedTies = new Set();

  // 每支同分队指向它所属的集团，方便在行里挂「同分」开关、并挑一处渲染展开内容。
  const groupByTeam = new Map();
  for (const group of tieGroups) {
    const key = `${group.points}#${group.teams.join('|')}`;
    for (const team of group.teams) {
      groupByTeam.set(team, { ...group, key });
    }
  }

  const tbody = el('tbody', {}, []);

  // 同分集团内部的迷你积分榜：只看这几支球队彼此交手的成绩，名次沿用官方排名。
  function miniTable(group) {
    const head = el('tr', {}, [
      el('th', { className: 'col-rank', text: '名次' }),
      el('th', { className: 'team-th', text: '球队' }),
      el('th', { text: '场' }),
      el('th', { text: '胜' }),
      el('th', { text: '平' }),
      el('th', { text: '负' }),
      el('th', { text: '进' }),
      el('th', { text: '失' }),
      el('th', { text: '净' }),
      el('th', { text: '分' }),
    ]);
    const body = group.rows.map((row) => el('tr', { className: teamRowClass(row.team) }, [
      el('td', { className: 'rank-cell' }, [el('span', { className: 'rank-num', text: String(row.rank) })]),
      el('td', { className: 'team-col' }, [teamCell(row.team)]),
      el('td', { className: 'num-cell muted-cell', text: String(row.played) }),
      el('td', { className: 'num-cell', text: String(row.wins) }),
      el('td', { className: 'num-cell', text: String(row.draws) }),
      el('td', { className: 'num-cell', text: String(row.losses) }),
      el('td', { className: 'num-cell goals-for', text: String(row.goalsFor) }),
      el('td', { className: 'num-cell goals-against', text: String(row.goalsAgainst) }),
      el('td', {
        className: `num-cell gd-cell ${row.goalDifference > 0 ? 'gd-positive' : row.goalDifference < 0 ? 'gd-negative' : 'gd-zero'}`,
        text: `${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}`,
      }),
      el('td', { className: 'points-cell' }, [el('span', { className: 'points-chip', text: String(row.points) })]),
    ]));
    return el('div', { className: 'tie-mini' }, [
      el('div', { className: 'tie-mini-title' }, [
        el('span', { text: `同分球队相互战绩 · ${group.points} 分 · ${group.teams.length} 队` }),
        el('span', { className: 'tie-mini-hint muted', text: '仅统计本组内部交手' }),
      ]),
      el('div', { className: 'table-wrap' }, [
        el('table', { className: 'standings-table tie-mini-table' }, [
          el('thead', {}, [head]),
          el('tbody', {}, body),
        ]),
      ]),
    ]);
  }

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

  function tieToggle(team) {
    const group = groupByTeam.get(team.team);
    if (!group) {
      return null;
    }
    const open = expandedTies.has(group.key);
    return el('button', {
      className: `tie-toggle${open ? ' is-open' : ''}`,
      type: 'button',
      title: `展开这 ${group.teams.length} 支同分球队的相互战绩`,
      onClick: () => {
        if (open) expandedTies.delete(group.key);
        else expandedTies.add(group.key);
        paint(false);
      },
    }, [
      el('span', { text: '同分' }),
      el('span', { className: 'tie-caret', text: '▾' }),
    ]);
  }

  function buildRow(team, animate) {
    const isLeader = team.rank === 1 && hasGames;
    const zoneClass = team.rank <= 3 && hasGames ? `rank-top rank-top-${team.rank}` : '';
    const toggle = tieToggle(team);
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
      el('td', { className: 'note-cell' }, [
        toggle,
        team.needsPlayoff
          ? el('span', { className: 'badge badge-warn', text: '需附加赛' })
          : toggle
            ? null
            : el('span', { className: 'muted', text: '—' }),
      ]),
    ]);
  }

  function paint(animate) {
    const rows = sortedTeams();
    // 一个同分集团只在它最后一行之后展开一次。
    const lastIndexOfGroup = new Map();
    rows.forEach((team, index) => {
      const group = groupByTeam.get(team.team);
      if (group) lastIndexOfGroup.set(group.key, index);
    });

    const nodes = [];
    rows.forEach((team, index) => {
      nodes.push(buildRow(team, animate));
      const group = groupByTeam.get(team.team);
      if (group && lastIndexOfGroup.get(group.key) === index && expandedTies.has(group.key)) {
        nodes.push(el('tr', { className: 'tie-detail-row' }, [
          el('td', { className: 'tie-detail-cell', colSpan: 13 }, [miniTable(group)]),
        ]));
      }
    });
    tbody.replaceChildren(...nodes);

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
