// 「档案」页：足球世界的入口。上半部分是本赛季（未归档），下半部分是已归档进世界里的每个赛季，
// 再往下是按教练汇总的记录与世界之最。
//
// 这个界面是贯穿始终的：档越多内容越厚，所以版式走「大留白 + 大数字」，把教练胜平负、
// 赛季归属、世界之最都放大展开，而不是挤成一堆小字。

import { el, emptyState, teamBadge } from '../ui.js';
import { computeCoachRecords } from '../coaches.js';

function percentOf(rate) {
  return rate > 0 ? `${Math.round(rate * 100)}%` : '0%';
}

function formatDate(iso) {
  const text = String(iso ?? '');
  return text.length >= 10 ? text.slice(0, 10) : text || '未知日期';
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function recordLine(profile) {
  if (profile.matches === 0) {
    return '尚未执教过任何已结算比赛';
  }
  return `${profile.matches} 场 · ${profile.wins} 胜 ${profile.draws} 平 ${profile.losses} 负 · 胜率 ${percentOf(profile.winRate)} · 进 ${profile.goalsFor} 失 ${profile.goalsAgainst}`;
}

// 队徽 + 队名：档案里凡是出现球队的地方都用它，比纯文字直观得多。
function teamChip(team) {
  return el('span', { className: 'arc-team' }, [
    teamBadge(team),
    el('span', { className: 'arc-team-name', text: team }),
  ]);
}

// 一串球队：顿号分隔，每支都带队徽。
function teamChipList(teams) {
  const nodes = [];
  teams.forEach((team, index) => {
    if (index > 0) {
      nodes.push(el('span', { className: 'arc-team-sep', text: '、' }));
    }
    nodes.push(teamChip(team));
  });
  return nodes;
}

function seasonNumber(label) {
  return String(label).replace(/^第\s*/, '').replace(/\s*赛季$/, '');
}

// 荣誉栏：只认冠亚季。冠军逐季单列、金框高亮——每个冠军都是实打实的成绩，
// 不跟亚军季军摆在同一行；亚军季军收成底部一行次要文字，不影响冠军的分量。
function honorBlock(profile) {
  const sweepIds = new Set(profile.sweeps.map((item) => item.seasonId));

  const titleRows = profile.titles.map((item) =>
    el('li', { className: 'honor-title' }, [
      el('span', { className: 'honor-cup', text: '🏆' }),
      el('span', { className: 'honor-title-season', text: item.seasonLabel }),
      teamChip(item.team),
      sweepIds.has(item.seasonId) ? el('span', { className: 'honor-sweep', text: '包揽前三' }) : null,
    ])
  );

  const minorItem = (icon, label, items) => el('span', { className: 'honor-minor-item' }, [
    el('span', { className: 'honor-minor-icon', text: icon }),
    el('span', { text: `${label} ${items.length} 次` }),
    el('span', { className: 'honor-minor-seasons muted', text: items.map((item) => seasonNumber(item.seasonLabel)).join('、') }),
  ]);

  const minor = [];
  if (profile.runnerUps.length > 0) minor.push(minorItem('🥈', '亚军', profile.runnerUps));
  if (profile.thirds.length > 0) minor.push(minorItem('🥉', '季军', profile.thirds));

  return el('div', { className: 'arc-honors' }, [
    el('div', { className: 'arc-honors-head' }, [
      el('span', { className: 'arc-honors-title', text: '荣誉' }),
      profile.completeSeasons > 0
        ? el('span', { className: 'arc-honors-rate', text: `夺冠率 ${percentOf(profile.titleRate)}` })
        : null,
    ]),
    titleRows.length > 0
      ? el('ul', { className: 'honor-titles' }, titleRows)
      : el('p', { className: 'honor-none muted', text: '尚未夺冠' }),
    minor.length > 0 ? el('div', { className: 'honor-minor' }, minor) : null,
  ]);
}

// 教练名旁的速览徽章：只看冠亚季，冠军用金底加重。
function badgeRow(profile) {
  const badges = [
    ['🏆', profile.titlesCount, '冠军'],
    ['🥈', profile.runnerUpCount, '亚军'],
    ['🥉', profile.thirdCount, '季军'],
  ].filter(([, count]) => count > 0);

  if (badges.length === 0) {
    return el('span', { className: 'coach-badges muted', text: '暂无冠亚季军' });
  }

  return el('span', { className: 'coach-badges' }, badges.map(([icon, count, label]) =>
    el('span', { className: label === '冠军' ? 'coach-badge is-title' : 'coach-badge', title: label }, [
      el('span', { className: 'coach-badge-icon', text: icon }),
      el('span', { className: 'coach-badge-count', text: `×${count}` }),
    ])
  ));
}

function listBlock(title, node, emptyText) {
  return el('div', { className: 'coach-block' }, [
    el('h4', { className: 'coach-block-title', text: title }),
    node ?? el('p', { className: 'muted', text: emptyText }),
  ]);
}

function statTile(label, value, hint = '') {
  return el('div', { className: 'arc-tile' }, [
    el('span', { className: 'arc-tile-value', text: value }),
    el('span', { className: 'arc-tile-label', text: label }),
    hint ? el('span', { className: 'arc-tile-hint muted', text: hint }) : null,
  ]);
}

// 胜 / 平 / 负 比例条：三段按场次伸缩，数字直接写在段里。
function recordBar(profile) {
  if (profile.matches === 0) {
    return null;
  }
  const segment = (cls, count, label) => el('span', {
    className: `arc-wdl-seg ${cls}`,
    style: `flex-grow: ${count}`,
    title: `${count} ${label}`,
  }, count > 0 ? [el('span', { className: 'arc-wdl-num', text: String(count) })] : []);

  return el('div', { className: 'arc-wdl' }, [
    segment('win', profile.wins, '胜'),
    segment('draw', profile.draws, '平'),
    segment('loss', profile.losses, '负'),
  ]);
}

function coachStats(profile) {
  if (profile.matches === 0) {
    return null;
  }
  return el('div', { className: 'arc-stat-grid' }, [
    statTile('场均积分', profile.pointsPerGame.toFixed(2)),
    statTile('场均进球', profile.goalsForPerGame.toFixed(2)),
    statTile('场均失球', profile.goalsAgainstPerGame.toFixed(2)),
    statTile('净胜球', signed(profile.goalDifference)),
  ]);
}

// 名次的两种写法：赛季履历里写全「🏆 冠军」，积分榜里只放紧凑奖牌。
function rankLabel(rank, complete) {
  if (!complete || rank === null) return el('span', { className: 'arc-rank muted', text: complete ? '—' : '未完赛' });
  if (rank === 1) return el('span', { className: 'arc-rank is-1', text: '🏆 冠军' });
  if (rank === 2) return el('span', { className: 'arc-rank is-2', text: '🥈 亚军' });
  if (rank === 3) return el('span', { className: 'arc-rank is-3', text: '🥉 季军' });
  return el('span', { className: 'arc-rank', text: `第 ${rank} 名` });
}

function rankMedal(rank) {
  if (rank <= 3) {
    return el('span', { className: 'rank-num rank-num-medal', text: ['🏆', '🥈', '🥉'][rank - 1] });
  }
  return el('span', { className: 'rank-num', text: String(rank) });
}

function seasonLogBlock(profile) {
  const entries = [...profile.seasonEntries].sort((left, right) => left.ordinal - right.ordinal);
  if (entries.length === 0) {
    return null;
  }
  return el('ul', { className: 'arc-season-log' }, entries.map((entry) =>
    el('li', { className: entry.champion ? 'arc-log-row champ' : 'arc-log-row' }, [
      el('span', { className: 'arc-log-season', text: `第 ${entry.ordinal} 赛季` }),
      el('span', { className: 'arc-log-teams' }, entry.teams.length > 0
        ? teamChipList(entry.teams)
        : [el('span', { className: 'muted', text: '未带任何球队' })]),
      rankLabel(entry.bestRank, entry.complete),
    ])
  ));
}

function coachCard(profile) {
  const rivals = profile.rivals.filter((rival) => rival.played > 0);

  const rivalNode = rivals.length > 0 || profile.neverFaced.length > 0
    ? el('div', {}, [
        el('ul', { className: 'coach-rivals' }, rivals.map((rival) =>
          el('li', {}, [
            el('span', { className: 'coach-rival-name', text: `对 ${rival.name}` }),
            el('span', {
              className: 'coach-rival-record',
              text: `${rival.played} 场 ${rival.wins} 胜 ${rival.draws} 平 ${rival.losses} 负 · 进 ${rival.goalsFor} 失 ${rival.goalsAgainst}`,
            }),
          ])
        )),
        profile.neverFaced.length > 0
          ? el('p', { className: 'coach-never muted', text: `从未交手：${profile.neverFaced.join('、')}` })
          : null,
      ])
    : null;

  // 卡片本身就是折叠块：外面只留姓名、冠亚季徽章与战绩，细节点开再看。
  return el('details', { className: 'coach-card' }, [
    el('summary', { className: 'coach-head' }, [
      el('div', { className: 'coach-card-head' }, [
        el('h3', { className: 'coach-name', text: profile.name }),
        badgeRow(profile),
      ]),
      el('p', { className: 'coach-record muted', text: recordLine(profile) }),
      recordBar(profile),
    ]),
    el('div', { className: 'coach-body' }, [
      honorBlock(profile),
      coachStats(profile),
      el('div', { className: 'coach-meta' }, [
        el('span', { text: `参赛 ${profile.seasons} 个赛季` }),
        profile.completeSeasons !== profile.seasons
          ? el('span', { className: 'muted', text: `（含 ${profile.seasons - profile.completeSeasons} 个未完赛季）` })
          : null,
        profile.bestFinish !== null
          ? el('span', { text: `最好名次 第 ${profile.bestFinish} 名` })
          : null,
        profile.clubCount > 0
          ? el('span', { text: `执教过 ${profile.clubCount} 支俱乐部` })
          : null,
        profile.titlesCount === 0 && profile.seasons >= 2
          ? el('span', { className: 'coach-drought', text: `已 ${profile.seasons} 个赛季无冠` })
          : null,
      ]),
      profile.clubCount > 0
        ? el('div', { className: 'coach-clubs' }, [
            el('span', { className: 'coach-clubs-label', text: '执教过' }),
            ...profile.clubList.map((item) => el('span', { className: 'club-chip' }, [
              teamBadge(item.team),
              el('span', { className: 'club-chip-name', text: item.team }),
              el('span', { className: 'club-chip-count', text: `${item.count} 季` }),
            ])),
          ])
        : null,
      listBlock('赛季履历', seasonLogBlock(profile), '还没有执教记录'),
      listBlock('交手', rivalNode, '还没有与世界里的其他教练交过手'),
    ]),
  ]);
}

// 过往赛季的全部名次：不再只留前三，整张积分榜都摆在卡里，想看随时看。
function standingsBlock(season) {
  if (season.standings.length === 0) {
    return null;
  }
  const head = (label) => el('th', { text: label });
  return el('div', { className: 'season-standings' }, [
    el('div', { className: 'season-standings-head' }, [
      el('h4', { className: 'coach-block-title', text: '全部名次' }),
      el('span', { className: 'muted', text: `${season.standings.length} 支球队` }),
    ]),
    el('div', { className: 'table-wrap' }, [
      el('table', { className: 'season-table' }, [
        el('thead', {}, [el('tr', {}, [
          el('th', { className: 'cell-rank', text: '名次' }),
          el('th', { className: 'cell-team', text: '球队' }),
          el('th', { className: 'cell-coach', text: '教练' }),
          head('场'), head('胜'), head('平'), head('负'), head('进'), head('失'), head('净'),
          el('th', { className: 'cell-points', text: '积分' }),
        ])]),
        el('tbody', {}, season.standings.map((row) =>
          el('tr', { className: row.rank === 1 ? 'is-champ' : null }, [
            el('td', { className: 'cell-rank' }, [rankMedal(row.rank)]),
            el('td', { className: 'cell-team' }, [teamChip(row.team)]),
            el('td', { className: 'cell-coach muted', text: row.coach || '—' }),
            el('td', { text: String(row.played) }),
            el('td', { text: String(row.wins) }),
            el('td', { text: String(row.draws) }),
            el('td', { text: String(row.losses) }),
            el('td', { className: 'goals-for', text: String(row.goalsFor) }),
            el('td', { className: 'goals-against', text: String(row.goalsAgainst) }),
            el('td', { className: 'cell-gd', text: signed(row.goalDifference) }),
            el('td', { className: 'cell-points' }, [el('span', { className: 'points-chip', text: String(row.points) })]),
          ])
        )),
      ]),
    ]),
  ]);
}

// 赛季卡片：折叠块。summary 上只放「第几赛季 + 冠军 + 结算进度」，
// 前三、金靴 / 助攻王 / FMVP 与整张积分榜都收进 body，赛季再多也不用一路往下翻。
function seasonCard(season, handlers) {
  const champion = season.awards.champion;
  const podium = season.awards.podium ?? [];
  const runnerUp = podium.find((entry) => entry.rank === 2);
  const third = podium.find((entry) => entry.rank === 3);
  const boots = season.awards.topScorers[0];
  const assists = season.awards.topAssists[0];
  const fmvp = season.awards.fmvp;

  const totalGoals = season.standings.reduce((sum, row) => sum + row.goalsFor, 0);
  const avgGoals = season.playedMatches > 0 ? totalGoals / season.playedMatches : 0;

  const chip = (icon, text, team) => el('span', { className: 'season-chip' }, [
    el('span', { className: 'season-chip-icon', text: icon }),
    team ? teamBadge(team) : null,
    el('span', { text }),
  ]);

  const headline = champion
    ? el('span', { className: 'season-champ' }, [
        el('span', { className: 'season-champ-icon', text: '🏆' }),
        teamBadge(champion.team),
        el('span', { className: 'season-champ-text', text: `${champion.team}（${champion.coach}）` }),
      ])
    : el('span', { className: 'season-champ is-pending muted', text: season.complete ? '名次待加赛' : '尚未决出冠军' });

  return el('details', { className: 'season-card' }, [
    el('summary', { className: 'season-summary' }, [
      el('div', { className: 'season-summary-main' }, [
        el('div', { className: 'season-heading' }, [
          el('span', { className: 'season-ordinal', text: `第 ${season.ordinal} 赛季` }),
          el('span', { className: 'season-label muted', text: season.label }),
        ]),
        headline,
      ]),
      el('div', { className: 'season-summary-side' }, [
        el('span', {
          className: season.complete ? 'season-badge finished' : 'season-badge ongoing',
          text: season.complete ? '已结束' : '赛季未完',
        }),
        el('span', { className: 'season-progress muted', text: `${season.playedMatches} / ${season.totalMatches} 场 · 归档于 ${formatDate(season.archivedAt)}` }),
      ]),
    ]),
    el('div', { className: 'season-detail' }, [
      el('div', { className: 'season-card-body' }, [
        runnerUp ? chip('🥈', `亚军 ${runnerUp.team}（${runnerUp.coach}）`, runnerUp.team) : null,
        third ? chip('🥉', `季军 ${third.team}（${third.coach}）`, third.team) : null,
        boots ? chip('👟', `${boots.name}（${boots.team}，${boots.goals} 球）`, boots.team) : null,
        assists ? chip('🎯', `${assists.name}（${assists.team}，${assists.assists} 次）`, assists.team) : null,
        fmvp ? chip('⭐', `FMVP ${fmvp.name}（${fmvp.team}，${fmvp.coach}）`, fmvp.team) : null,
      ]),
      el('div', { className: 'arc-meta-row' }, [
        el('span', { className: 'arc-meta-item' }, [
          el('span', { className: 'arc-meta-k muted', text: '总进球' }),
          el('span', { className: 'arc-meta-v', text: String(totalGoals) }),
        ]),
        el('span', { className: 'arc-meta-item' }, [
          el('span', { className: 'arc-meta-k muted', text: '场均进球' }),
          el('span', { className: 'arc-meta-v', text: avgGoals.toFixed(1) }),
        ]),
      ]),
      standingsBlock(season),
      el('div', { className: 'season-card-actions' }, [
        el('button', { className: 'button small', type: 'button', text: '导出', onClick: () => handlers.onExportSeason(season.id) }),
        el('button', { className: 'button small danger', type: 'button', text: '移除', onClick: () => handlers.onRemoveSeason(season.id) }),
      ]),
    ]),
  ]);
}

function currentPanel(current, onArchive) {
  if (!current) {
    return null;
  }
  const progress = current.total > 0 ? `${current.played} / ${current.total} 场已结算` : '还没有赛程';
  const upToDate = current.archived && current.archivedPlayed === current.played;

  return el('section', { className: 'archive-panel archive-current' }, [
    el('div', { className: 'panel-head' }, [
      el('h2', { text: current.archived ? '本赛季（已归档）' : '本赛季（未归档）' }),
      el('span', {
        className: current.complete ? 'season-badge finished' : 'season-badge ongoing',
        text: current.complete ? '已结束' : '进行中',
      }),
    ]),
    el('p', { className: 'muted', text: `${current.coachA} vs ${current.coachB} · ${progress}` }),
    el('div', { className: 'toolbar' }, [
      el('button', {
        className: 'button primary',
        type: 'button',
        text: upToDate ? '本赛季已归档' : current.archived ? '更新归档' : '归档本赛季',
        disabled: upToDate,
        onClick: () => onArchive(),
      }),
    ]),
  ]);
}

export function renderArchiveView({ world, current = null, onArchive, onBack, onExportWorld, onImportWorld, onExportSeason, onRemoveSeason }) {
  const records = computeCoachRecords(world);
  const handlers = { onExportSeason, onRemoveSeason };

  return el('div', { className: 'app-shell archive-shell' }, [
    el('div', { className: 'brand-banner' }, [
      el('div', { className: 'brand-main' }, [
        el('span', { className: 'brand-logo', text: '📚' }),
        el('div', { className: 'brand' }, [
          el('h1', { text: '足球世界 · 档案' }),
          el('p', {
            className: 'brand-sub',
            text: `世界里已有 ${records.stats.seasons} 个赛季 · ${records.stats.coaches} 位教练 · ${records.stats.matches} 场已结算比赛`,
          }),
        ]),
      ]),
      el('div', { className: 'banner-toolbar' }, [
        el('button', { className: 'button', type: 'button', text: '导出档案', onClick: () => onExportWorld() }),
        el('button', { className: 'button', type: 'button', text: '导入档案', onClick: () => onImportWorld() }),
        el('button', { className: 'button', type: 'button', text: '← 返回', onClick: () => onBack() }),
      ]),
    ]),

    currentPanel(current, onArchive),

    // 板块并列：赛季与教练各占一列，各自折叠，点开才展开细节；世界之最横跨整行。
    el('div', { className: 'archive-columns' }, [
      el('section', { className: 'archive-panel archive-seasons' }, [
        el('div', { className: 'panel-head' }, [
          el('h2', { text: '世界里的赛季' }),
          el('span', { className: 'muted', text: `${records.seasons.length} 个档` }),
        ]),
        records.seasons.length > 0
          ? el('div', { className: 'season-list' }, records.seasons.map((season) => seasonCard(season, handlers)))
          : emptyState('🗂️', '世界档案还是空的', '打完一个赛季后，点上面的「归档本赛季」把成绩收进世界'),
      ]),

      el('section', { className: 'archive-panel archive-coaches' }, [
        el('div', { className: 'panel-head' }, [
          el('h2', { text: '教练记录' }),
          el('span', { className: 'muted', text: `${records.coaches.length} 位教练` }),
        ]),
        records.coaches.length > 0
          ? el('div', { className: 'coach-grid' }, records.coaches.map(coachCard))
          : emptyState('🧑‍🏫', '还没有教练', '归档第一个赛季后，这里会开始记录每位教练的荣誉与交手'),
      ]),
    ]),

    records.facts.length > 0
      ? el('section', { className: 'archive-panel archive-facts' }, [
          el('div', { className: 'panel-head' }, [el('h2', { text: '世界之最' })]),
          el('ul', { className: 'fact-list' }, records.facts.map((fact) =>
            el('li', { className: 'fact-row' }, [
              el('span', { className: 'fact-icon', text: fact.icon }),
              el('span', { className: 'fact-main' }, [
                el('span', { className: 'fact-title', text: fact.title }),
                el('span', { className: 'fact-detail muted', text: fact.detail }),
              ]),
            ])
          )),
        ])
      : null,
  ]);
}
