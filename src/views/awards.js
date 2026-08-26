import { el, emptyState } from '../ui.js';
import { animateNumber } from '../animate.js';

const PODIUM_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const PODIUM_CLASS = { 1: 'gold', 2: 'silver', 3: 'bronze' };

function renderPrizeValue(value) {
  return `${value} 元`;
}

function renderPodium(podium) {
  return el('div', { className: 'award-grid' }, podium.length
    ? podium.map((item) =>
        el('div', { className: `award-card ${PODIUM_CLASS[item.rank] ?? ''}` }, [
          el('div', { className: 'award-card-head' }, [
            el('span', { className: 'award-podium-medal', text: PODIUM_MEDALS[item.rank] ?? '' }),
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
        ])
      )
    : [emptyState('🏆', '暂无前三名数据', '赛季结束后这里会展示前三名与奖金')]);
}

function renderWinners(title, award, emptyText, label) {
  const prizeLabel = award.winners.length > 1 ? `${label} ${renderPrizeValue(award.prize)} / 人` : `奖金 ${renderPrizeValue(award.prize)}`;

  return el('div', { className: 'panel' }, [
    el('h2', { text: title }),
    award.winners.length
      ? el('div', { className: 'award-winners' }, [
          el('div', { className: 'muted', text: prizeLabel }),
          ...award.winners.map((winner) =>
            el('div', { className: 'row-card' }, [
              el('div', { text: winner.name }),
              el('div', { className: 'muted', text: `${winner.team} · ${winner.goals} 球 / ${winner.assists} 助` }),
            ])
          ),
        ])
      : el('p', { className: 'muted', text: emptyText }),
  ]);
}

function renderFmvp(award, onEdit) {
  return el('div', { className: 'panel' }, [
    el('h2', { text: 'FMVP' }),
    el('div', { className: 'award-card' }, [
      el('div', { className: 'award-amount', text: renderPrizeValue(award.prize) }),
      el('div', { text: award.name ? `${award.name} · ${award.team}` : '尚未录入' }),
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
  const form = el('form', { className: 'panel form-grid' });
  const firstPlace = el('input', { type: 'number', min: '0', step: '1', value: String(state?.firstPlace ?? 0) });
  const secondPlace = el('input', { type: 'number', min: '0', step: '1', value: String(state?.secondPlace ?? 0) });
  const thirdPlace = el('input', { type: 'number', min: '0', step: '1', value: String(state?.thirdPlace ?? 0) });
  const topScorer = el('input', { type: 'number', min: '0', step: '1', value: String(state?.topScorer ?? 0) });
  const topAssist = el('input', { type: 'number', min: '0', step: '1', value: String(state?.topAssist ?? 0) });
  const fmvp = el('input', { type: 'number', min: '0', step: '1', value: String(state?.fmvp ?? 0) });
  const fmvpPlayerName = el('input', { type: 'text', value: String(state?.fmvpPlayerName ?? '') });
  const fmvpTeam = el('input', { type: 'text', value: String(state?.fmvpTeam ?? '') });

  form.append(
    el('h2', { text: '录入奖金' }),
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

  return el('div', { className: 'grid-two' }, [
    el('div', { className: 'panel' }, [
      el('h2', { text: '前三名奖金' }),
      renderPodium(summary.podium),
    ]),
    renderWinners('射手王', summary.topScorer, '暂无射手王数据', '并列射手王奖金'),
    renderWinners('助攻王', summary.topAssist, '暂无助攻王数据', '并列助攻王奖金'),
    shouldShowForm ? renderFmvpForm(currentSettings, onSave) : renderFmvp(summary.fmvp, onEdit),
  ]);
}
