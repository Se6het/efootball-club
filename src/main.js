import { createInitialState } from './schedule.js';
import { computeLeaders, computePlayerStats, computeTeamLeaders } from './leaders.js';
import { loadState, saveState, clearState, updateMatch, updateAwards } from './store.js';
import { clear, el } from './ui.js';
import { fadeIn } from './animate.js';
import { renderSetupView } from './views/setup.js';
import { renderNextMatchView } from './views/nextMatch.js';
import { renderScheduleView } from './views/schedule.js';
import { renderStandingsView } from './views/standings.js';
import { renderLeadersView } from './views/leaders.js';
import { renderAwardsView } from './views/awards.js';
import { renderTeamDetailView } from './views/teamDetail.js';
import { openMatchForm } from './views/matchForm.js';
import { rankTeams } from './standings.js';
import { buildAwardSummary, isSeasonFinished, normalizeAwardSettings, validateAwardSettings } from './awards.js';

const baseTabs = [
  { key: 'next', label: '下一场' },
  { key: 'schedule', label: '赛程' },
  { key: 'standings', label: '球队榜' },
  { key: 'leaders', label: '球员榜' },
];

const app = document.querySelector('#app');
let activeTab = 'next';
let state = loadState();
let isEditingAwards = false;

function persist(nextState) {
  state = saveState(nextState);
  render();
}

function startLeague(nextState) {
  isEditingAwards = false;
  persist(nextState);
}

function resetLeague() {
  clearState();
  state = null;
  activeTab = 'next';
  isEditingAwards = false;
  render();
}

function getNextMatch(matches) {
  return matches.find((match) => !match.isPlayed) ?? null;
}

function openEditor(match) {
  const trigger = document.activeElement;
  const close = () => {
    document.removeEventListener('keydown', onKeyDown);
    backdrop.remove();
    document.body.classList.remove('modal-open');
    if (trigger && typeof trigger.focus === 'function') {
      trigger.focus();
    }
    render();
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  const modal = el('div', {
    className: 'modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': '录入比分',
  }, [
    el('button', {
      className: 'modal-close',
      type: 'button',
      text: '✕',
      'aria-label': '关闭',
      onClick: close,
    }),
  ]);
  modal.append(
    openMatchForm(match, {
      onSave: (nextMatch) => {
        const nextState = updateMatch(state, match.id, () => nextMatch);
        if (isSeasonFinished(nextState.matches)) {
          activeTab = 'awards';
          isEditingAwards = !nextState.awards;
        }
        close();
        persist(nextState);
      },
      onCancel: close,
    })
  );

  const backdrop = el('div', {
    className: 'modal-backdrop',
    onClick: (event) => {
      if (event.target === backdrop) {
        close();
      }
    },
  }, [modal]);

  document.body.classList.add('modal-open');
  document.body.append(backdrop);
  document.addEventListener('keydown', onKeyDown);

  // 打开后聚焦弹窗内第一个可输入控件，方便键盘用户直接录入
  const firstInput = modal.querySelector('input, select, textarea, button');
  if (firstInput) {
    firstInput.focus();
  }
}

function openTeamDetail(team) {
  const trigger = document.activeElement;

  const close = () => {
    document.removeEventListener('keydown', onKeyDown);
    backdrop.remove();
    document.body.classList.remove('modal-open');
    if (trigger && typeof trigger.focus === 'function') {
      trigger.focus();
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      close();
    }
  };

  const modal = el('div', {
    className: 'modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': `${team} 队内数据`,
    tabindex: '-1',
  }, [
    el('button', {
      className: 'modal-close',
      type: 'button',
      text: '✕',
      'aria-label': '关闭',
      onClick: close,
    }),
    renderTeamDetailView(team, computeTeamLeaders(state.matches, team)),
  ]);

  const backdrop = el('div', {
    className: 'modal-backdrop',
    onClick: (event) => {
      if (event.target === backdrop) {
        close();
      }
    },
  }, [modal]);

  document.body.classList.add('modal-open');
  document.body.append(backdrop);
  document.addEventListener('keydown', onKeyDown);
  modal.focus();
}

function renderSetup() {
  clear(app);
  const sampleConfig = {
    playerA: '玩家A',
    playerB: '玩家B',
    matchesPerPair: 2,
    teamsA: ['皇家马德里', '拜仁慕尼黑', '曼城', '阿森纳'],
    teamsB: ['巴塞罗那', '巴黎圣日耳曼', '利物浦', '国际米兰'],
  };
  app.append(
    renderSetupView({
      onStart: startLeague,
      sampleConfig,
    })
  );
}

function renderLeague() {
  const nextMatch = getNextMatch(state.matches);
  const rankedTeams = rankTeams(state.config, state.matches);
  const leaders = computeLeaders(state.matches);
  const seasonFinished = isSeasonFinished(state.matches);
  if (!seasonFinished && activeTab === 'awards') {
    activeTab = 'next';
    isEditingAwards = false;
  }
  const tabs = seasonFinished ? [...baseTabs, { key: 'awards', label: '赛季颁奖' }] : baseTabs;
  const summary = buildAwardSummary(state.awards ?? {}, {
    rankedTeams,
    playerStats: computePlayerStats(state.matches),
  });

  clear(app);

  const nav = el('div', { className: 'tabs' }, tabs.map((tab) => el('button', {
    className: tab.key === activeTab ? 'tab active' : 'tab',
    type: 'button',
    text: tab.label,
    onClick: () => {
      activeTab = tab.key;
      render();
    },
  })));

  const content = {
    next: renderNextMatchView(nextMatch, openEditor),
    schedule: renderScheduleView(state.matches, openEditor),
    standings: renderStandingsView(rankedTeams, openTeamDetail),
    leaders: renderLeadersView(leaders),
    awards: renderAwardsView({
      seasonFinished,
      summary,
      isEditing: isEditingAwards || !state.awards,
      currentSettings: state.awards ? normalizeAwardSettings(state.awards) : null,
      onEdit: () => {
        isEditingAwards = true;
        render();
      },
      onSave: (settings) => {
        const normalized = normalizeAwardSettings(settings);
        const error = validateAwardSettings(normalized, [...state.config.teamsA, ...state.config.teamsB]);
        if (error) {
          window.alert(error);
          return;
        }
        isEditingAwards = false;
        persist(updateAwards(state, normalized));
      },
    }),
  }[activeTab];

  const total = state.matches.length;
  const played = state.matches.filter((match) => match.isPlayed).length;
  const percent = total > 0 ? Math.round((played / total) * 100) : 0;

  const progressCard = el('div', { className: 'progress-card' }, [
    el('div', { className: 'progress-info' }, [
      el('span', { className: 'progress-nums' }, [
        el('span', { className: 'done', text: String(played) }),
        el('span', { className: 'total', text: ` / ${total} 场已完成` }),
      ]),
    ]),
    el('div', {
      className: 'progress-track',
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': String(total),
      'aria-valuenow': String(played),
    }, [
      el('div', {
        className: seasonFinished ? 'progress-fill done' : 'progress-fill',
        style: `width: ${percent}%`,
      }),
    ]),
    seasonFinished
      ? el('span', { className: 'progress-badge finished', text: '🏆 赛季完成' })
      : null,
  ]);

  fadeIn(content);

  app.append(
    el('div', { className: 'app-shell' }, [
      el('div', { className: 'brand-banner' }, [
        el('div', { className: 'brand-main' }, [
          el('span', { className: 'brand-logo', text: '⚽' }),
          el('div', { className: 'brand' }, [
            el('h1', { text: 'eFootball League' }),
            el('p', { className: 'brand-sub', text: `${state.config.playerA} 对 ${state.config.playerB} 的俱乐部联赛` }),
          ]),
        ]),
        el('div', { className: 'banner-toolbar' }, [
          el('button', { className: 'button', type: 'button', text: '重置', onClick: resetLeague }),
        ]),
      ]),
      progressCard,
      nav,
      content,
    ])
  );
}

function render() {
  if (!state) {
    renderSetup();
    return;
  }
  renderLeague();
}

render();
