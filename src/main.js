import { computeTeamDiscipline, getSuspensionsBeforeMatch } from './discipline.js';
import { createInitialState } from './schedule.js';
import { collectKnownPlayers, computeLeaders, computePlayerDetail, computePlayerStats, computeTeamLeaders } from './leaders.js';
import { clearState, loadState, parseBackup, saveState, serializeState, updateAwards, updateMatch } from './store.js';
import { clear, el } from './ui.js';
import { fadeIn } from './animate.js';
import { showToast } from './toast.js';
import { renderSetupView } from './views/setup.js';
import { renderDashboard } from './views/dashboard.js';
import { renderNextMatchView } from './views/nextMatch.js';
import { renderScheduleView } from './views/schedule.js';
import { renderStandingsView } from './views/standings.js';
import { renderLeadersView } from './views/leaders.js';
import { renderNewsView } from './views/news.js';
import { renderAwardsView } from './views/awards.js';
import { renderTeamDetailView } from './views/teamDetail.js';
import { renderPlayerDetailView } from './views/playerDetail.js';
import { renderArchiveView } from './views/archive.js';
import { openMatchForm } from './views/matchForm.js';
import { addSeason, buildSeasonRecord, loadWorld, makeSeasonId, mergeSeasons, parseWorldBackup, previousCoaches, removeSeason, saveWorld, worldStats } from './coaches.js';
import { computeRankProgression, rankTeams } from './standings.js';
import { computeTeamForm, computeTeamFormMap, computeUpcomingFixtures } from './form.js';
import { computeHeadToHead } from './h2h.js';
import { computeNews } from './news.js';
import { computeOdds } from './odds.js';
import { buildAwardSummary, isSeasonFinished, normalizeAwardSettings, validateAwardSettings } from './awards.js';

const app = document.querySelector('#app');
let activeTab = 'dashboard';
let state = loadState();
let world = loadWorld();
let showArchive = false;

function persist(nextState) {
  state = saveState(nextState);
  render();
  if (!saveState.lastPersisted) {
    showToast(saveState.lastError, 'error');
  }
  return saveState.lastPersisted;
}

function persistWorld(nextWorld) {
  world = saveWorld(nextWorld);
  render();
  if (!saveWorld.lastPersisted) {
    showToast(saveWorld.lastError, 'error');
  }
  return saveWorld.lastPersisted;
}

function startLeague(nextState) {
  persist(nextState);
}

function archiveSeason({ silent = false } = {}) {
  if (!state) {
    return false;
  }
  if (!state.matches.some((match) => match.isPlayed)) {
    if (!silent) {
      showToast('本赛季还没有已结算的比赛，暂时无法归档', 'error');
    }
    return false;
  }
  const record = buildSeasonRecord(state, { id: makeSeasonId() });
  const result = addSeason(world, record);
  if (!result.added) {
    if (!silent) {
      showToast('归档失败：本赛季数据无法生成有效存档', 'error');
    }
    return false;
  }
  persistWorld(result.world);
  if (!silent) {
    showToast(result.replaced ? '已用最新结果更新世界档案' : '已归档到世界档案');
  }
  return true;
}

function removeArchivedSeason(seasonId) {
  const season = world.seasons.find((item) => item.id === seasonId);
  if (!season) {
    return;
  }
  if (!window.confirm(`确定把「${season.label}」移出世界档案吗？移除后教练记录会同步更新。建议先导出。`)) {
    return;
  }
  persistWorld(removeSeason(world, seasonId));
  showToast('已移出世界档案');
}

function resetLeague() {
  if (state && state.matches.some((match) => match.isPlayed)) {
    if (window.confirm('重置前，先把本赛季的成绩归档到「足球世界 · 档案」吗？')) {
      archiveSeason({ silent: true });
    }
  }
  if (!window.confirm('确定重置当前赛季吗？所有赛程、比分和球员数据都会被删除。')) {
    return;
  }
  if (!clearState()) {
    showToast('无法清除浏览器中的联赛数据', 'error');
    return;
  }
  state = null;
  activeTab = 'dashboard';
  render();
}

function getNextMatch(matches) {
  return matches.find((match) => !match.isPlayed) ?? null;
}

// 队名 → 归属玩家，供赛程表、积分榜低调标注球队归属。
function buildOwnerMap(config) {
  const map = {};
  for (const team of config.teamsA) map[team] = config.playerA;
  for (const team of config.teamsB) map[team] = config.playerB;
  return map;
}

const modalStack = [];

function pushModal({ ariaLabel, content }) {
  const trigger = document.activeElement;

  const modal = el('div', {
    className: 'modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': ariaLabel,
    tabindex: '-1',
  }, [
    el('button', {
      className: 'modal-close',
      type: 'button',
      text: '✕',
      'aria-label': '关闭',
      onClick: () => closeTop(),
    }),
  ]);
  modal.append(content());

  const backdrop = el('div', {
    className: 'modal-backdrop',
    onClick: (event) => {
      if (event.target === backdrop) {
        closeTop();
      }
    },
  }, [modal]);

  document.body.classList.add('modal-open');
  document.body.append(backdrop);
  modalStack.push({ backdrop, modal, trigger });

  const firstInput = modal.querySelector('input, select, textarea');
  const focusTarget = firstInput || modal.querySelector('button');
  (focusTarget ?? modal).focus();
}

function closeTop() {
  const top = modalStack.pop();
  if (!top) {
    return;
  }
  top.backdrop.remove();
  if (modalStack.length === 0) {
    document.body.classList.remove('modal-open');
  }
  if (top.trigger && typeof top.trigger.focus === 'function' && top.trigger.isConnected) {
    top.trigger.focus();
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeTop();
  }
});

function openEditor(match) {
  pushModal({
    ariaLabel: '录入比分',
    content: () => openMatchForm(match, {
      knownPlayers: collectKnownPlayers(state.matches),
      suspensions: getSuspensionsBeforeMatch(state.matches, match),
      h2h: computeHeadToHead(state.matches, match),
      onSave: (nextMatch) => {
        const nextState = updateMatch(state, match.id, () => nextMatch);
        if (isSeasonFinished(nextState.matches)) {
          activeTab = 'awards';
        }
        closeTop();
        if (persist(nextState)) {
          showToast('已保存比赛');
        }
      },
      onCancel: () => closeTop(),
    }),
  });
}

function openTeamDetail(team) {
  pushModal({
    ariaLabel: `${team} 队内数据`,
    content: () => renderTeamDetailView(team, computeTeamLeaders(state.matches, team), openPlayerDetail, {
      form: computeTeamForm(state.matches, team, 5),
      upcoming: computeUpcomingFixtures(state.matches, team, 5),
      season: computeTeamForm(state.matches, team, 0),
      progression: computeRankProgression(state.config, state.matches, team),
      totalTeams: state.config.teamsA.length + state.config.teamsB.length,
      discipline: computeTeamDiscipline(state.matches, team),
    }),
  });
}

function openPlayerDetail(player) {
  const detail = computePlayerDetail(state.matches, player.name, player.team);
  if (!detail) {
    return;
  }
  const nextTeamMatch = state.matches.find((match) => !match.isPlayed && (match.homeTeam === player.team || match.awayTeam === player.team));
  if (nextTeamMatch) {
    const suspension = getSuspensionsBeforeMatch(state.matches, nextTeamMatch).find((item) => item.name === player.name && item.team === player.team);
    detail.pendingSuspension = suspension?.pendingSuspension ?? 0;
  }
  pushModal({
    ariaLabel: `${player.name} 球员数据`,
    content: () => renderPlayerDetailView(detail),
  });
}

function downloadJson(data, filename) {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function exportBackup() {
  downloadJson(serializeState(state), `efootball-league-备份-${today()}.json`);
  showToast('已导出备份文件');
}

function exportWorld() {
  if (world.seasons.length === 0) {
    showToast('世界档案还是空的，没有可导出的内容', 'error');
    return;
  }
  downloadJson(world, `efootball-足球世界-${today()}.json`);
  showToast('已导出世界档案');
}

function exportSeason(seasonId) {
  const season = world.seasons.find((item) => item.id === seasonId);
  if (!season) {
    return;
  }
  const safeLabel = season.label.replace(/[\\/:*?"<>|\s]+/g, '-');
  downloadJson(season, `efootball-赛季-${safeLabel}-${today()}.json`);
  showToast('已导出该赛季存档');
}

function importBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = parseBackup(String(reader.result ?? ''));
      if (result.error) {
        window.alert(result.error);
        return;
      }
      if (!window.confirm('导入将覆盖当前所有数据，确定继续吗？')) {
        return;
      }
      if (persist(result.state)) {
        showToast('已导入备份');
      }
    });
    reader.readAsText(file);
  });
  input.click();
}

function importWorld() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = parseWorldBackup(String(reader.result ?? ''));
      if (result.error) {
        window.alert(result.error);
        return;
      }
      const merged = mergeSeasons(world, result.seasons);
      if (merged.added === 0) {
        showToast('这些赛季都已经在世界里了，无需重复导入', 'error');
        return;
      }
      persistWorld(merged.world);
      showToast(`已把 ${merged.added} 个赛季导入世界档案`);
    });
    reader.readAsText(file);
  });
  input.click();
}

function openArchive() {
  showArchive = true;
  render();
}

function closeArchive() {
  showArchive = false;
  render();
}

function archiveCurrent() {
  if (!state) {
    return null;
  }
  const sourceId = String(state.createdAt ?? '');
  const existing = sourceId ? world.seasons.find((item) => item.sourceId === sourceId) : null;
  return {
    coachA: state.config.playerA,
    coachB: state.config.playerB,
    complete: isSeasonFinished(state.matches),
    played: state.matches.filter((match) => match.isPlayed).length,
    total: state.matches.length,
    archived: Boolean(existing),
    archivedPlayed: existing ? existing.playedMatches : 0,
  };
}

// 联赛页里的「足球世界」入口：一条醒目横幅，替掉原来右上角那个不起眼的小按钮。
function worldStrip() {
  const stats = worldStats(world);
  return el('section', { className: 'world-strip' }, [
    el('div', { className: 'world-strip-main' }, [
      el('span', { className: 'world-strip-logo', text: '📚' }),
      el('div', {}, [
        el('h2', { className: 'world-strip-title', text: '足球世界 · 档案' }),
        el('p', {
          className: 'world-strip-sub',
          text: stats.seasons > 0
            ? `已收进 ${stats.seasons} 个赛季 · ${stats.coaches} 位教练 · ${stats.matches} 场已结算比赛`
            : '把本赛季归档后，跨赛季的教练荣誉与纪录都会留在这里',
        }),
      ]),
    ]),
    el('button', { className: 'world-strip-enter', type: 'button', text: '进入足球世界', onClick: openArchive }),
  ]);
}

function renderArchive() {
  clear(app);
  app.append(
    renderArchiveView({
      world,
      current: archiveCurrent(),
      onArchive: () => archiveSeason(),
      onBack: closeArchive,
      onExportWorld: exportWorld,
      onImportWorld: importWorld,
      onExportSeason: exportSeason,
      onRemoveSeason: removeArchivedSeason,
    })
  );
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
      onImport: importBackup,
      coaches: previousCoaches(world),
      archiveCount: world.seasons.length,
      onOpenArchive: openArchive,
    })
  );
}

function renderLeague() {
  const nextMatch = getNextMatch(state.matches);
  const rankedTeams = rankTeams(state.config, state.matches);
  const formByTeam = computeTeamFormMap(state.matches, [...state.config.teamsA, ...state.config.teamsB], 5);
  const leaders = computeLeaders(state.matches);
  const seasonFinished = isSeasonFinished(state.matches);
  if (!seasonFinished && activeTab === 'awards') {
    activeTab = 'dashboard';
  }
  const playerStats = computePlayerStats(state.matches);
  const summary = buildAwardSummary(state.awards ?? {}, {
    rankedTeams,
    playerStats,
  });
  const ownerByTeam = buildOwnerMap(state.config);
  const news = computeNews({ config: state.config, matches: state.matches, leaders });
  const odds = computeOdds({ config: state.config, matches: state.matches });
  const playedCount = state.matches.filter((match) => match.isPlayed).length;

  clear(app);

  // 详情视图按需渲染：内容与既有视图完全一致，只在前面加一条“返回总览”。
  const detailViews = {
    next: () => renderNextMatchView(nextMatch, openEditor, nextMatch ? getSuspensionsBeforeMatch(state.matches, nextMatch) : [], nextMatch
      ? {
          h2h: computeHeadToHead(state.matches, nextMatch),
          homeForm: computeTeamForm(state.matches, nextMatch.homeTeam, 5),
          awayForm: computeTeamForm(state.matches, nextMatch.awayTeam, 5),
        }
      : {}),
    schedule: () => renderScheduleView(state.matches, openEditor, ownerByTeam),
    standings: () => renderStandingsView(rankedTeams, openTeamDetail, { formByTeam, ownerByTeam }),
    leaders: () => renderLeadersView(leaders, openPlayerDetail),
    news: () => renderNewsView({ news, odds, playedCount }),
    awards: () => renderAwardsView({
      seasonFinished,
      summary,
      settings: state.awards,
      players: playerStats,
      onSave: (settings) => {
        const normalized = normalizeAwardSettings(settings);
        const error = validateAwardSettings(normalized, [...state.config.teamsA, ...state.config.teamsB]);
        if (error) {
          window.alert(error);
          return;
        }
        if (persist(updateAwards(state, normalized))) {
          showToast('已评出 FMVP');
        }
      },
    }),
  };

  const content = activeTab === 'dashboard'
    ? renderDashboard({
        nextMatch,
        matches: state.matches,
        rankedTeams,
        leaders,
        news,
        seasonFinished,
        onOpen: (key) => {
          activeTab = key;
          render();
        },
      })
    : el('div', { className: 'detail-view' }, [
        el('div', { className: 'detail-bar' }, [
          el('button', {
            className: 'back-button',
            type: 'button',
            text: '← 返回总览',
            onClick: () => {
              activeTab = 'dashboard';
              render();
            },
          }),
        ]),
        detailViews[activeTab](),
      ]);

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
          el('button', { className: 'button', type: 'button', text: '导出', onClick: exportBackup }),
          el('button', { className: 'button', type: 'button', text: '导入', onClick: importBackup }),
          el('button', { className: 'button', type: 'button', text: '重置', onClick: resetLeague }),
        ]),
      ]),
      progressCard,
      worldStrip(),
      content,
    ])
  );
}

function render() {
  if (showArchive) {
    renderArchive();
    return;
  }
  if (!state) {
    renderSetup();
    return;
  }
  renderLeague();
}

render();
