import { el, emptyState, teamCell } from '../ui.js';

export function renderNextMatchView(match, onEdit, suspensions = []) {
  return el('div', { className: 'panel' }, [
    el('h2', { text: '下一场比赛' }),
    match
      ? el('div', { className: 'row-card next-match-card' }, [
          el('div', { className: 'next-match-teams' }, [
            teamCell(match.homeTeam),
            el('span', { className: 'vs-sep', text: 'vs' }),
            teamCell(match.awayTeam),
          ]),
          el('div', { className: 'muted', text: `第 ${match.round} 轮，第 ${match.matchNumber} 场` }),
          suspensions.length ? el('div', { className: 'error', text: `停赛提醒：${suspensions.map((item) => `${item.name}（${item.team}，还需停赛 ${item.pendingSuspension} 场）`).join('、')}` }) : null,
          el('div', { className: 'toolbar' }, [
            el('button', { className: 'button primary', type: 'button', text: match.isPlayed ? '修改比分' : '录入比分', onClick: () => onEdit(match) }),
          ]),
        ])
      : emptyState('🎉', '所有比赛都已完成', '去「球队榜」和「球员榜」查看最终排名吧'),
  ]);
}
