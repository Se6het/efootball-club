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

function renderFmvp(award, onEdit) {
  return el('div', { className: 'panel award-panel' }, [
    awardPanelTitle('⭐', 'FMVP'),
    el('div', { className: 'award-card fmvp-card' }, [
      el('div', { className: 'award-amount', text: renderPrizeValue(award.prize) }),
      el('div', { className: 'fmvp-name', text: award.name ? `${award.name} · ${award.team}` : '尚未录入' }),
    ]),
    el('div', { className: 'toolbar' }, [
      el('button', {
        className: 'button',
        type: 'button',
        text: '修改颁奖设置',
        onClick: onEdit,
      }),
    ]),
  ]);
}

function renderFmvpForm(state, onSave) {
  const form = el('form', { className: 'panel award-panel form-grid' });
  const firstPlace = el('input', { type: 'number', min: '0', step: '1', value: String(state?.firstPlace ?? 0) });
  const secondPlace = el('input', { type: 'number', min: '0', step: '1', value: String(state?.secondPlace ?? 0) });
  const thirdPlace = el('input', { type: 'number', min: '0', step: '1', value: String(state?.thirdPlace ?? 0) });
  const topScorer = el('input', { type: 'number', min: '0', step: '1', value: String(state?.topScorer ?? 0) });
  const topAssist = el('input', { type: 'number', min: '0', step: '1', value: String(state?.topAssist ?? 0) });
  const fmvp = el('input', { type: 'number', min: '0', step: '1', value: String(state?.fmvp ?? 0) });
  const fmvpPlayerName = el('input', { type: 'text', value: String(state?.fmvpPlayerName ?? '') });
  const fmvpTeam = el('input', { type: 'text', value: String(state?.fmvpTeam ?? '') });

  form.append(
    awardPanelTitle('⭐', '录入奖金'),
    el('p', { className: 'muted', text: '如果射手王或助攻王出现并列，这里录入的是每位获奖球员的奖金。' }),
    el('label', {}, ['冠军奖金', firstPlace]),
    el('label', {}, ['亚军奖金', secondPlace]),
    el('label', {}, ['季军奖金', thirdPlace]),
    el('label', {}, ['射手王奖金', topScorer]),
    el('label', {}, ['助攻王奖金', topAssist]),
    el('label', {}, ['FMVP 奖金', fmvp]),
    el('label', {}, ['FMVP 球员', fmvpPlayerName]),
    el('label', {}, ['FMVP 球队', fmvpTeam]),
    el('div', { className: 'toolbar' }, [
      el('button', {
        className: 'button primary',
        type: 'submit',
        text: '保存颁奖设置',
      }),
    ])
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    onSave({
      firstPlace: Number(firstPlace.value),
      secondPlace: Number(secondPlace.value),
      thirdPlace: Number(thirdPlace.value),
      topScorer: Number(topScorer.value),
      topAssist: Number(topAssist.value),
      fmvp: Number(fmvp.value),
      fmvpPlayerName: fmvpPlayerName.value,
      fmvpTeam: fmvpTeam.value,
    });
  });

  return form;
}

export function renderAwardsView({ seasonFinished, summary, onSave, onEdit, currentSettings, isEditing }) {
  if (!seasonFinished) {
    return el('div', { className: 'panel' }, [
      el('h2', { text: '赛季颁奖' }),
      emptyState('🏆', '赛季还未结束', '完成所有比赛后，这里会展示奖金与获奖名单'),
    ]);
  }

  const shouldShowForm = isEditing || !currentSettings?.fmvpPlayerName;

  return el('div', { className: 'awards-stage' }, [
    renderChampionBanner(summary.podium[0]),
    el('div', { className: 'panel award-panel award-podium-panel' }, [
      awardPanelTitle('🏆', '前三名奖金'),
      renderPodium(summary.podium),
    ]),
    el('div', { className: 'award-columns' }, [
      renderWinners('👟', '射手王', summary.topScorer, '暂无射手王数据', '并列射手王奖金'),
      renderWinners('🎯', '助攻王', summary.topAssist, '暂无助攻王数据', '并列助攻王奖金'),
      shouldShowForm ? renderFmvpForm(currentSettings, onSave) : renderFmvp(summary.fmvp, onEdit),
    ]),
  ]);
}
