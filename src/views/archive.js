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

// 教练荣誉的结构化条目：奖杯图标 + 说明 + 带徽章的球队（+ 尾巴，如球员与数据）。
function honorEntries(profile) {
  const rows = [];
  const push = (icon, lead, teams, tail) => rows.push({ icon, lead, teams, tail });
  for (const item of profile.titles) push('🏆', `${item.seasonLabel} 带`, [item.team], '夺冠');
  for (const item of profile.sweeps) push('🥇', `${item.seasonLabel} 包揽前三`, item.teams, '');
  for (const item of profile.runnerUps) push('🥈', `${item.seasonLabel} 亚军`, [item.team], '');
  for (const item of profile.thirds) push('🥉', `${item.seasonLabel} 季军`, [item.team], '');
  for (const item of profile.goldenBoots) push('👟', `${item.seasonLabel} 金靴`, [item.team], `${item.player} · ${item.goals} 球`);
  for (const item of profile.assistCrowns) push('🎯', `${item.seasonLabel} 助攻王`, [item.team], `${item.player} · ${item.assists} 助攻`);
  for (const item of profile.fmvps) push('⭐', `${item.seasonLabel} FMVP`, [item.team], item.player);
  return rows;
}

// 荣誉栏：单独一块醒目的面板，放在教练卡靠上的位置。
function honorBlock(profile) {
  const entries = honorEntries(profile);
  return el('div', { className: 'arc-honors' }, [
    el('div', { className: 'arc-honors-head' }, [
      el('span', { className: 'arc-honors-title', text: '荣誉' }),
      entries.length > 0 ? el('span', { className: 'arc-honors-count', text: `${entries.length} 项` }) : null,
    ]),
    entries.length > 0
      ? el('ul', { className: 'coach-honors' }, entries.map((entry) =>
          el('li', { className: 'coach-honor' }, [
            el('span', { className: 'honor-medal', text: entry.icon }),
            el('span', { className: 'honor-body' }, [
              el('span', { className: 'honor-lead', text: entry.lead }),
              ...teamChipList(entry.teams),
              entry.tail ? el('span', { className: 'honor-tail muted', text: entry.tail }) : null,
            ]),
          ])
        ))
      : el('p', { className: 'coach-honors-empty muted', text: '暂无冠军、奖项记录' }),
  ]);
}

function badgeRow(profile) {
  const badges = [
    ['🏆', profile.titlesCount, '冠军'],
    ['🥈', profile.runnerUpCount, '亚军'],
    ['🥉', profile.thirdCount, '季军'],
    ['👟', profile.goldenBootCount, '金靴'],
    ['🎯', profile.assistCrownCount, '助攻王'],
    ['⭐', profile.fmvpCount, 'FMVP'],
  ].filter(([, count]) => count > 0);

  if (badges.length === 0) {
    return el('span', { className: 'coach-badges muted', text: '暂未获得荣誉' });
  }

  return el('span', { className: 'coach-badges' }, badges.map(([icon, count, label]) =>
    el('span', { className: 'coach-badge', title: label }, [
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
    statTile('夺冠率', percentOf(profile.titleRate)),
  ]);
}

function seasonLogBlock(profile) {
  const entries = [...profile.seasonEntries].sort((left, right) => left.ordinal - right.ordinal);
  if (entries.length === 0) {
    return null;
  }
  return el('ul', { className: 'arc-season-log' }, entries.map((entry) =>
    el('li', { className: entry.champion ? 'arc-log-row champ' : 'arc-log-row' }, [
      el('span', { className: 'arc-log-season', text: `第 ${entry.ordinal} 赛季` }),
      entry.champion ? el('span', { className: 'arc-log-flag', text: '🏆' }) : null,
      el('span', { className: 'arc-log-teams' }, entry.teams.length > 0
        ? teamChipList(entry.teams)
        : [el('span', { className: 'muted', text: '未带任何球队' })]),
      entry.bestRank !== null
        ? el('span', { className: 'arc-log-rank muted', text: `最好第 ${entry.bestRank} 名` })
        : (entry.complete ? null : el('span', { className: 'arc-log-rank muted', text: '未完赛' })),
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

  return el('article', { className: 'coach-card' }, [
    el('div', { className: 'coach-card-head' }, [
      el('h3', { className: 'coach-name', text: profile.name }),
      badgeRow(profile),
    ]),
    el('p', { className: 'coach-record muted', text: recordLine(profile) }),
    recordBar(profile),
    coachStats(profile),
    honorBlock(profile),
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
          el('span', { className: 'coach-clubs-label muted', text: '执教过' }),
          ...profile.clubList.map((item) => el('span', { className: 'arc-team' }, [
            teamBadge(item.team),
            el('span', { className: 'arc-team-name', text: `${item.team}（${item.count} 季）` }),
          ])),
        ])
      : null,
    listBlock('赛季履历', seasonLogBlock(profile), '还没有执教记录'),
    listBlock('交手', rivalNode, '还没有与世界里的其他教练交过手'),
  ]);
}

// 赛季卡片：冠军 + 前三 + 金靴 / 助攻王 / FMVP，再列出每位教练带的球队与赛季数据。
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

  const roster = new Map();
  for (const row of season.standings) {
    if (!row.coach) continue;
    if (!roster.has(row.coach)) roster.set(row.coach, []);
    roster.get(row.coach).push(row.team);
  }

  const chip = (icon, text, team) => el('span', { className: 'season-chip' }, [
    el('span', { className: 'season-chip-icon', text: icon }),
    team ? teamBadge(team) : null,
    el('span', { text }),
  ]);

  return el('article', { className: 'season-card' }, [
    el('div', { className: 'season-card-head' }, [
      el('h3', { className: 'season-card-title' }, [
        el('span', { className: 'season-ordinal', text: `第 ${season.ordinal} 赛季` }),
        el('span', { className: 'season-label muted', text: season.label }),
      ]),
      el('div', { className: 'season-card-actions' }, [
        el('span', {
          className: season.complete ? 'season-badge finished' : 'season-badge ongoing',
          text: season.complete ? '已结束' : '赛季未完',
        }),
        el('button', { className: 'button small', type: 'button', text: '导出', onClick: () => handlers.onExportSeason(season.id) }),
        el('button', { className: 'button small danger', type: 'button', text: '移除', onClick: () => handlers.onRemoveSeason(season.id) }),
      ]),
    ]),
    el('p', {
      className: 'season-card-meta muted',
      text: `${season.playedMatches} / ${season.totalMatches} 场已结算 · 归档于 ${formatDate(season.archivedAt)}`,
    }),
    el('div', { className: 'season-card-body' }, [
      champion
        ? el('span', { className: 'season-chip champ' }, [
            teamBadge(champion.team),
            el('span', { text: `冠军 ${champion.team}（${champion.coach}）` }),
          ])
        : el('span', { className: 'season-chip muted', text: season.complete ? '名次待加赛' : '尚未决出冠军' }),
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
    roster.size > 0
      ? el('div', { className: 'arc-roster' }, [...roster.entries()].map(([name, teams]) =>
          el('div', { className: 'arc-roster-row' }, [
            el('span', { className: 'arc-roster-coach', text: name }),
            el('span', { className: 'arc-roster-teams' }, teamChipList(teams)),
          ])
        ))
      : null,
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

function overviewPanel(records) {
  const totalGoals = records.coaches.reduce((sum, profile) => sum + profile.goalsFor, 0);
  const avgGoals = records.stats.matches > 0 ? (totalGoals / records.stats.matches).toFixed(1) : '0.0';
  return el('section', { className: 'arc-overview' }, [
    statTile('赛季', String(records.stats.seasons)),
    statTile('教练', String(records.stats.coaches)),
    statTile('已结算比赛', String(records.stats.matches)),
    statTile('世界总进球', String(totalGoals)),
    statTile('场均进球', avgGoals),
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

    records.stats.seasons > 0 ? overviewPanel(records) : null,

    currentPanel(current, onArchive),

    el('section', { className: 'archive-panel' }, [
      el('div', { className: 'panel-head' }, [
        el('h2', { text: '世界里的赛季' }),
        el('span', { className: 'muted', text: `${records.seasons.length} 个档` }),
      ]),
      records.seasons.length > 0
        ? el('div', { className: 'season-list' }, records.seasons.map((season) => seasonCard(season, handlers)))
        : emptyState('🗂️', '世界档案还是空的', '打完一个赛季后，点上面的「归档本赛季」把成绩收进世界'),
    ]),

    el('section', { className: 'archive-panel' }, [
      el('div', { className: 'panel-head' }, [
        el('h2', { text: '教练记录' }),
        el('span', { className: 'muted', text: `${records.coaches.length} 位教练` }),
      ]),
      records.coaches.length > 0
        ? el('div', { className: 'coach-grid' }, records.coaches.map(coachCard))
        : emptyState('🧑‍🏫', '还没有教练', '归档第一个赛季后，这里会开始记录每位教练的荣誉与交手'),
    ]),

    records.facts.length > 0
      ? el('section', { className: 'archive-panel' }, [
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
