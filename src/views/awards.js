import { el, emptyState, teamBadge } from '../ui.js';
import { animateNumber } from '../animate.js';

const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_CLASS = ['gold', 'silver', 'bronze'];
// 领奖台站位：亚军居左、冠军居中（最高一台）、季军居右。
const PODIUM_ORDER = [1, 0, 2];

function renderPrizeValue(value) {
  return `${value} 元`;
}

function awardPanelTitle(icon, title) {
  return el('h2', { className: 'award-panel-title' }, [
    el('span', { className: 'award-panel-icon', text: icon }),
    el('span', { text: title }),
  ]);
}

function renderPodiumCard(item, slot) {
  return el('div', { className: `award-card podium-card ${PODIUM_CLASS[slot] ?? ''}` }, [
    el('div', { className: 'award-card-head' }, [
      el('span', { className: 'award-podium-medal', text: PODIUM_MEDALS[slot] ?? '' }),
      el('span', { className: 'badge', text: `第 ${item.rank} 名` }),
    ]),
    teamBadge(item.team),
    el('h3', { text: item.team }),
    el('div', {
      className: 'award-amount',
      text: renderPrizeValue(item.prize),
      onAfterRender: (node) => animateNumber(node, 0, item.prize, {
        duration: 600,
        formatter: (value) => `${Math.round(value)} 元`,
      }),
    }),
    item.needsPlayoff ? el('p', { className: 'muted', text: '待附加赛，暂不结算奖金' }) : null,
  ]);
}

function renderPodium(podium) {
  if (!podium.length) {
    return el('div', { className: 'award-grid' }, [
      emptyState('🏆', '暂无前三名数据', '赛季结束后这里会展示前三名与奖金'),
    ]);
  }
  return el('div', { className: 'podium' }, PODIUM_ORDER.map((slot) => (
    podium[slot]
      ? renderPodiumCard(podium[slot], slot)
      : el('div', { className: 'podium-slot' })
  )));
}

// 冠军横幅：把第一名（冠军）单独抬出来做仪式感焦点。仅当冠军已定（非待附加赛）时出现。
function renderChampionBanner(champion) {
  if (!champion || champion.needsPlayoff) {
    return null;
  }
  return el('section', { className: 'awards-hero' }, [
    el('span', { className: 'awards-hero-trophy', text: '🏆' }),
    el('div', { className: 'awards-hero-main' }, [
      el('span', { className: 'awards-hero-kicker', text: '赛季冠军' }),
      el('span', { className: 'awards-hero-team' }, [
        teamBadge(champion.team),
        el('span', { className: 'awards-hero-name', text: champion.team }),
      ]),
      el('span', { className: 'awards-hero-prize', text: renderPrizeValue(champion.prize) }),
    ]),
    el('span', { className: 'awards-hero-medal', text: PODIUM_MEDALS[0] }),
  ]);
}

function renderWinners(icon, title, award, emptyText, label) {
  const prizeLabel = award.winners.length > 1 ? `${label} ${renderPrizeValue(award.prize)} / 人` : `奖金 ${renderPrizeValue(award.prize)}`;

  return el('div', { className: 'panel award-panel' }, [
    awardPanelTitle(icon, title),
    award.winners.length
      ? el('div', { className: 'award-winners' }, [
          el('div', { className: 'award-prize-chip', text: prizeLabel }),
          ...award.winners.map((winner) =>
            el('div', { className: 'row-card award-winner' }, [
              el('div', { className: 'award-winner-name', text: winner.name }),
              el('div', { className: 'muted', text: `${winner.team} · ${winner.goals} 球 / ${winner.assists} 助` }),
            ])
          ),
        ])
      : el('p', { className: 'muted', text: emptyText }),
  ]);
}

// FMVP 的奖金在创建存档时就已录入，赛季结束后只需要评出获奖球员，
// 所以这里直接给一个下拉选择，不再重复让用户填一遍奖金。
function renderFmvp(award, players, settings, onSave) {
  const hasWinner = Boolean(award.name);
  const sorted = [...players].sort((left, right) =>
    right.goals - left.goals || right.assists - left.assists || left.name.localeCompare(right.name, 'zh-Hans-CN')
  );
  const winnerStats = hasWinner
    ? sorted.find((player) => player.name === award.name && player.team === award.team)
    : null;

  const select = el('select', { className: 'fmvp-select' }, [
    el('option', { value: '', text: hasWinner ? '更换 FMVP 球员' : '选择 FMVP 球员', disabled: true }),
    ...sorted.map((player, index) => el('option', {
      value: String(index),
      text: `${player.name} · ${player.team}`,
    })),
  ]);

  if (hasWinner) {
    const index = sorted.findIndex((player) => player.name === award.name && player.team === award.team);
    if (index >= 0) {
      select.value = String(index);
    }
  } else {
    select.value = '';
  }

  select.addEventListener('change', () => {
    const picked = sorted[Number(select.value)];
    if (!picked) {
      return;
    }
    onSave({ ...settings, fmvpPlayerName: picked.name, fmvpTeam: picked.team });
  });

  return el('div', { className: 'panel award-panel' }, [
    awardPanelTitle('⭐', 'FMVP'),
    el('div', { className: 'award-winners' }, [
      el('div', { className: 'award-prize-chip', text: `奖金 ${renderPrizeValue(award.prize)}` }),
      hasWinner
        ? el('div', { className: 'row-card award-winner' }, [
            el('div', { className: 'award-winner-name', text: award.name }),
            el('div', {
              className: 'muted',
              text: winnerStats
                ? `${award.team} · ${winnerStats.goals} 球 / ${winnerStats.assists} 助`
                : award.team,
            }),
          ])
        : el('p', { className: 'muted', text: '尚未评选，请选出本赛季的 FMVP 球员' }),
    ]),
    el('label', { className: 'fmvp-picker' }, [
      el('span', { className: 'fmvp-picker-label', text: 'FMVP 球员' }),
      select,
    ]),
  ]);
}

export function renderAwardsView({ seasonFinished, summary, settings, players = [], onSave }) {
  if (!seasonFinished) {
    return el('div', { className: 'panel' }, [
      el('h2', { text: '赛季颁奖' }),
      emptyState('🏆', '赛季还未结束', '完成所有比赛后，这里会展示奖金与获奖名单'),
    ]);
  }

  return el('div', { className: 'awards-stage' }, [
    renderChampionBanner(summary.podium[0]),
    el('div', { className: 'panel award-panel award-podium-panel' }, [
      awardPanelTitle('🏆', '前三名奖金'),
      renderPodium(summary.podium),
    ]),
    el('div', { className: 'award-columns' }, [
      renderWinners('👟', '射手王', summary.topScorer, '暂无射手王数据', '并列射手王奖金'),
      renderWinners('🎯', '助攻王', summary.topAssist, '暂无助攻王数据', '并列助攻王奖金'),
      renderFmvp(summary.fmvp, players, settings, onSave),
    ]),
  ]);
}
