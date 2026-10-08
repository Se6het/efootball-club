import { el, emptyState, teamCell } from '../ui.js';

function formPill(result) {
  return el('span', { className: `form-pill ${result === '胜' ? 'win' : result === '负' ? 'loss' : 'draw'}`, text: result });
}

function miniForm(form = []) {
  if (!form.length) {
    return el('span', { className: 'muted', text: '暂无战绩' });
  }
  return el('span', { className: 'form-strip' }, form.map(formPill));
}

function renderVersusForm(homeTeam, awayTeam, homeForm = [], awayForm = []) {
  return el('div', { className: 'versus-form' }, [
    el('div', { className: 'versus-form-side' }, [
      el('div', { className: 'versus-form-label' }, [teamCell(homeTeam)]),
      miniForm(homeForm),
    ]),
    el('div', { className: 'versus-form-side' }, [
      el('div', { className: 'versus-form-label' }, [teamCell(awayTeam)]),
      miniForm(awayForm),
    ]),
  ]);
}

function meetingRow(meeting) {
  return el('div', { className: 'h2h-meeting' }, [
    el('span', { className: 'h2h-round', text: `第${meeting.round}轮` }),
    el('span', { className: `h2h-team${meeting.winner === 'home' ? ' h2h-win' : ''}`, text: meeting.homeTeam }),
    el('span', { className: 'h2h-score', text: `${meeting.homeGoals} : ${meeting.awayGoals}` }),
    el('span', { className: `h2h-team${meeting.winner === 'away' ? ' h2h-win' : ''}`, text: meeting.awayTeam }),
  ]);
}

export function renderHeadToHead(h2h) {
  if (!h2h) {
    return el('div', { className: 'h2h-panel' }, [
      el('h3', {}, [el('span', { className: 'panel-icon', text: '⚔️' }), el('span', { text: '历史交锋' })]),
      el('p', { className: 'muted', text: '暂无交锋数据' }),
    ]);
  }

  const { homeTeam, awayTeam, summary, meetings, highlights, meetingNumber, playedCount } = h2h;

  const header = el('div', { className: 'h2h-head' }, [
    el('h3', {}, [el('span', { className: 'panel-icon', text: '⚔️' }), el('span', { text: '历史交锋' })]),
    el('span', { className: 'h2h-ordinal', text: playedCount > 0 ? `本赛季第 ${meetingNumber} 次交手` : '本赛季首次交手' }),
  ]);

  if (playedCount === 0) {
    return el('div', { className: 'h2h-panel' }, [
      header,
      el('p', { className: 'muted', text: `${homeTeam} 与 ${awayTeam} 本赛季此前没有交手记录，这将是双方首次碰面。` }),
    ]);
  }

  const summaryBar = el('div', { className: 'h2h-summary' }, [
    el('span', { className: 'h2h-sum-side h2h-sum-home' }, [
      el('strong', { text: String(summary.homeWins) }),
      el('span', { text: ' 胜' }),
    ]),
    el('span', { className: 'h2h-sum-draw' }, [
      el('strong', { text: String(summary.draws) }),
      el('span', { text: ' 平' }),
    ]),
    el('span', { className: 'h2h-sum-side h2h-sum-away' }, [
      el('strong', { text: String(summary.awayWins) }),
      el('span', { text: ' 胜' }),
    ]),
    el('span', { className: 'h2h-sum-goals', text: `总比分 ${summary.homeGoals} : ${summary.awayGoals}` }),
    el('span', { className: 'h2h-sum-label', text: `${homeTeam} / ${awayTeam}` }),
  ]);

  return el('div', { className: 'h2h-panel' }, [
    header,
    summaryBar,
    el('div', { className: 'h2h-meetings' }, meetings.map(meetingRow)),
    highlights.length
      ? el('div', { className: 'h2h-highlights' }, [
          el('div', { className: 'h2h-highlights-title', text: '交锋看点' }),
          el('div', { className: 'h2h-chips' }, highlights.map((item) =>
            el('span', { className: 'h2h-chip' }, [
              el('span', { className: 'h2h-chip-icon', text: item.icon }),
              el('span', { text: item.text }),
            ])
          )),
        ])
      : null,
  ]);
}

export function renderNextMatchView(match, onEdit, suspensions = [], extras = {}) {
  return el('div', { className: 'panel next-panel' }, [
    el('h2', { text: '下一场比赛' }),
    match
      ? el('div', { className: 'row-card next-match-card' }, [
          el('div', { className: 'next-match-teams' }, [
            teamCell(match.homeTeam),
            el('span', { className: 'vs-sep', text: 'VS' }),
            teamCell(match.awayTeam),
          ]),
          el('div', { className: 'next-match-meta muted', text: `第 ${match.round} 轮 · 第 ${match.matchNumber} 场` }),
          suspensions.length ? el('div', { className: 'alert-suspension', text: `停赛提醒：${suspensions.map((item) => `${item.name}（${item.team}，还需停赛 ${item.pendingSuspension} 场）`).join('、')}` }) : null,
          renderVersusForm(match.homeTeam, match.awayTeam, extras.homeForm, extras.awayForm),
          renderHeadToHead(extras.h2h),
          el('div', { className: 'toolbar next-toolbar' }, [
            el('button', { className: 'button primary', type: 'button', text: match.isPlayed ? '修改比分' : '录入比分', onClick: () => onEdit(match) }),
          ]),
        ])
      : emptyState('🎉', '所有比赛都已完成', '去「球队榜」和「球员榜」查看最终排名吧'),
  ]);
}
