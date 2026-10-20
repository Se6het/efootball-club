// 「档案」页：足球世界的入口。上半部分是本赛季（未归档），下半部分是已归档进世界里的每个赛季，
// 再往下是按教练汇总的记录与世界之最。

import { el, emptyState, teamBadge } from '../ui.js';
import { computeCoachRecords } from '../coaches.js';

function percentOf(rate) {
  return rate > 0 ? `${Math.round(rate * 100)}%` : '0%';
}

function formatDate(iso) {
  const text = String(iso ?? '');
  return text.length >= 10 ? text.slice(0, 10) : text || '未知日期';
}

function recordLine(profile) {
  if (profile.matches === 0) {
    return '尚未执教过任何已结算比赛';
  }
  return `${profile.matches} 场 · ${profile.wins} 胜 ${profile.draws} 平 ${profile.losses} 负 · 胜率 ${percentOf(profile.winRate)} · 进 ${profile.goalsFor} 失 ${profile.goalsAgainst}`;
}

function honorLines(profile) {
  const lines = [];
  for (const item of profile.titles) lines.push(`🏆 ${item.seasonLabel} 带 ${item.team} 夺冠`);
  for (const item of profile.sweeps) lines.push(`🥇 ${item.seasonLabel} 包揽前三（${item.teams.join(' / ')}）`);
  for (const item of profile.runnerUps) lines.push(`🥈 ${item.seasonLabel} 亚军（${item.team}）`);
  for (const item of profile.thirds) lines.push(`🥉 ${item.seasonLabel} 季军（${item.team}）`);
  for (const item of profile.goldenBoots) lines.push(`👟 ${item.seasonLabel} 金靴：${item.player}（${item.team}，${item.goals} 球）`);
  for (const item of profile.assistCrowns) lines.push(`🎯 ${item.seasonLabel} 助攻王：${item.player}（${item.team}，${item.assists} 次）`);
  for (const item of profile.fmvps) lines.push(`⭐ ${item.seasonLabel} FMVP：${item.player}（${item.team}）`);
  return lines;
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

function coachCard(profile) {
  const honors = honorLines(profile);
  const rivals = profile.rivals.filter((rival) => rival.played > 0);

  const honorNode = honors.length > 0
    ? el('ul', { className: 'coach-honors' }, honors.map((line) => el('li', { text: line })))
    : null;

  const rivalNode = rivals.length > 0 || profile.neverFaced.length > 0
    ? el('div', {}, [
        el('ul', { className: 'coach-rivals' }, rivals.map((rival) =>
          el('li', {}, [
            el('span', { className: 'coach-rival-name', text: `对 ${rival.name}` }),
            el('span', {
              className: 'coach-rival-record',
              text: `${rival.played} 场 ${rival.wins} 胜 ${rival.draws} 平 ${rival.losses} 负 · 进 ${rival.goalsFor} 失 ${rival.goalsAgainst}`,
            }),
            rival.biggestMargin && rival.biggestMargin.diff !== 0
              ? el('span', {
                  className: 'coach-rival-margin muted',
                  text: `最大 ${rival.biggestMargin.diff > 0 ? '+' : ''}${rival.biggestMargin.diff}`,
                })
              : null,
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
      ? el('p', { className: 'coach-clubs muted', text: `俱乐部：${profile.clubList.map((item) => `${item.team}（${item.count} 季）`).join('、')}` })
      : null,
    listBlock('荣誉', honorNode, '暂无冠军、奖项记录'),
    listBlock('交手', rivalNode, '还没有与世界里的其他教练交过手'),
  ]);
}

function seasonCard(season, handlers) {
  const champion = season.awards.champion;
  const boots = season.awards.topScorers[0];
  const assists = season.awards.topAssists[0];

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
      boots
        ? el('span', { className: 'season-chip' }, [
            el('span', { className: 'season-chip-icon', text: '👟' }),
            el('span', { text: `${boots.name}（${boots.team}，${boots.goals} 球）` }),
          ])
        : null,
      assists
        ? el('span', { className: 'season-chip' }, [
            el('span', { className: 'season-chip-icon', text: '🎯' }),
            el('span', { text: `${assists.name}（${assists.team}，${assists.assists} 次）` }),
          ])
        : null,
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
