import { el, teamBadge, teamCell } from '../ui.js';

// 四宫格总览：每格给摘要，点击整格展开对应的详细视图。
// 结构说明：格子是 <button>，内部只用 span/img 行内元素，避免非法嵌套。

const MORE_LABEL = '查看全部 →';

function tileHead(icon, title) {
  return el('span', { className: 'tile-head' }, [
    el('span', { className: 'tile-icon', text: icon }),
    el('span', { className: 'tile-title', text: title }),
    el('span', { className: 'tile-more', text: MORE_LABEL }),
  ]);
}

function tile(key, icon, title, body, onOpen) {
  return el('button', {
    className: 'tile',
    type: 'button',
    'aria-label': `展开${title}`,
    onClick: () => onOpen(key),
  }, [
    tileHead(icon, title),
    el('span', { className: 'tile-body' }, body),
  ]);
}

function tileTeam(team) {
  return el('span', { className: 'tile-team' }, [
    teamBadge(team),
    el('span', { className: 'tile-team-name', text: team }),
  ]);
}

function nextBody(match) {
  if (!match) {
    return [el('span', { className: 'muted', text: '所有比赛都已完成' })];
  }
  return [
    el('span', { className: 'mini-versus' }, [
      tileTeam(match.homeTeam),
      el('span', { className: 'mini-vs', text: 'VS' }),
      tileTeam(match.awayTeam),
    ]),
    el('span', {
      className: 'mini-meta',
      text: `第 ${match.round} 轮 · 第 ${match.matchNumber} 场 · 未进行`,
    }),
  ];
}

function awardBody(rankedTeams) {
  const champion = rankedTeams[0];
  if (!champion) {
    return [el('span', { className: 'muted', text: '暂无球队数据' })];
  }
  return [
    el('span', { className: 'award-champ' }, [
      teamBadge(champion.team),
      el('span', { className: 'award-champ-name', text: champion.team }),
      el('span', { className: 'award-champ-tag', text: '冠军' }),
    ]),
    el('span', { className: 'mini-meta', text: '赛季已结束 · 点击查看颁奖设置' }),
  ];
}

function scheduleBody(matches) {
  const upcoming = matches.filter((match) => !match.isPlayed).slice(0, 3);
  if (!upcoming.length) {
    return [el('span', { className: 'muted', text: matches.length ? '赛程已全部完成' : '还没有赛程' })];
  }
  return upcoming.map((match) => el('span', { className: 'mini-fix' }, [
    el('span', { className: 'mini-fix-round', text: `R${match.round}` }),
    el('span', { className: 'mini-fix-side' }, [teamCell(match.homeTeam)]),
    el('span', { className: 'mini-fix-vs', text: 'vs' }),
    el('span', { className: 'mini-fix-side away' }, [teamCell(match.awayTeam)]),
  ]));
}

function standingsBody(rankedTeams) {
  const top = rankedTeams.slice(0, 5);
  if (!top.length) {
    return [el('span', { className: 'muted', text: '还没有球队数据' })];
  }
  return top.map((team, index) => el('span', { className: 'mini-row' }, [
    el('span', { className: 'mini-idx', text: String(index + 1) }),
    el('span', { className: 'mini-main' }, [teamCell(team.team)]),
    el('span', { className: 'mini-val' }, [
      String(team.points),
      el('span', { className: 'mini-unit', text: ' 分' }),
    ]),
  ]));
}

function leadersBody(leaders) {
  const top = (leaders?.scorerList ?? []).slice(0, 5);
  if (!top.length) {
    return [el('span', { className: 'muted', text: '暂无进球记录' })];
  }
  return top.map((player, index) => el('span', { className: 'mini-row' }, [
    el('span', { className: 'mini-idx', text: String(index + 1) }),
    el('span', { className: 'mini-main' }, [
      el('span', { className: 'mini-player', text: player.name }),
      el('span', { className: 'mini-team', text: `· ${player.team}` }),
    ]),
    el('span', { className: 'mini-val' }, [
      String(player.goals ?? 0),
      el('span', { className: 'mini-unit', text: ' 球' }),
    ]),
  ]));
}

export function renderDashboard({ nextMatch, matches, rankedTeams, leaders, seasonFinished, onOpen }) {
  const leadTile = seasonFinished
    ? tile('awards', '🏅', '赛季颁奖', awardBody(rankedTeams), onOpen)
    : tile('next', '⚽', '下一场', nextBody(nextMatch), onOpen);

  return el('div', { className: 'dashboard' }, [
    leadTile,
    tile('schedule', '🗓️', '赛程', scheduleBody(matches), onOpen),
    tile('standings', '🏆', '球队榜', standingsBody(rankedTeams), onOpen),
    tile('leaders', '👟', '球员榜', leadersBody(leaders), onOpen),
  ]);
}
