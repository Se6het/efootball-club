import { el } from '../ui.js';
import { validateContributionTotals, validateMvpSelection } from '../leaders.js';

function createEntryList(items = []) {
  return items.map((item) => ({ name: item.name ?? '', count: item.count ?? 0 }));
}

export function openMatchForm(match, { onSave, onCancel }) {
  const state = {
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    homeScorers: createEntryList(match.homeScorers),
    awayScorers: createEntryList(match.awayScorers),
    homeAssists: createEntryList(match.homeAssists),
    awayAssists: createEntryList(match.awayAssists),
    homeCards: { ...match.homeCards },
    awayCards: { ...match.awayCards },
    mvp: {
      name: match.mvp?.name ?? '',
      team: match.mvp?.team ?? match.homeTeam,
      score: match.mvp?.score ?? 0,
    },
  };

  const error = el('div', { className: 'error' });
  const root = el('div', { className: 'panel' });

  function readTeamEntries(teamEntries) {
    return teamEntries
      .map((item) => ({ name: item.name.trim(), count: Number(item.count) }))
      .filter((item) => item.name);
  }

  function makeEntryRow(list, index, label) {
    const row = list[index];
    return el('div', { className: 'row-card compact' }, [
      el('div', { className: 'field-grid' }, [
        el('label', { className: 'field' }, [
          el('span', { text: `${label} ${index + 1} 球员` }),
          el('input', {
            type: 'text',
            value: row.name,
            onInput: (event) => {
              row.name = event.target.value;
            },
          }),
        ]),
        el('label', { className: 'field' }, [
          el('span', { text: `${label} ${index + 1} 数量` }),
          el('input', {
            type: 'number',
            min: '0',
            step: '1',
            value: String(row.count),
            onInput: (event) => {
              row.count = Number(event.target.value || 0);
            },
          }),
        ]),
      ]),
      el('button', {
        className: 'button ghost',
        type: 'button',
        text: '删除',
        onClick: () => {
          list.splice(index, 1);
          render();
        },
      }),
    ]);
  }

  function renderRows(list, label) {
    return el('div', { className: 'match-list' }, list.map((_, index) => makeEntryRow(list, index, label)));
  }

  function render() {
    root.replaceChildren(
      el('h3', { text: `${match.homeTeam} vs ${match.awayTeam}` }),
      el('div', { className: 'field-grid' }, [
        el('label', { className: 'field' }, [
          el('span', { text: '主队比分' }),
          el('input', {
            type: 'number',
            min: '0',
            step: '1',
            value: String(state.homeGoals),
            onInput: (event) => {
              state.homeGoals = Number(event.target.value || 0);
            },
          }),
        ]),
        el('label', { className: 'field' }, [
          el('span', { text: '客队比分' }),
          el('input', {
            type: 'number',
            min: '0',
            step: '1',
            value: String(state.awayGoals),
            onInput: (event) => {
              state.awayGoals = Number(event.target.value || 0);
            },
          }),
        ]),
      ]),
      el('div', { className: 'panel' }, [
        el('h3', { text: '全场 MVP' }),
        el('div', { className: 'field-grid' }, [
          el('label', { className: 'field' }, [
            el('span', { text: 'MVP 球员' }),
            el('input', {
              type: 'text',
              value: state.mvp.name,
              onInput: (event) => {
                state.mvp.name = event.target.value;
              },
            }),
          ]),
          el('label', { className: 'field' }, [
            el('span', { text: 'MVP 球队' }),
            el('select', {
              value: state.mvp.team,
              onChange: (event) => {
                state.mvp.team = event.target.value;
              },
            }, [
              el('option', { value: match.homeTeam, text: match.homeTeam }),
              el('option', { value: match.awayTeam, text: match.awayTeam }),
            ]),
          ]),
          el('label', { className: 'field' }, [
            el('span', { text: 'MVP 评分' }),
            el('input', {
              type: 'number',
              min: '0',
              max: '10',
              step: '0.1',
              value: String(state.mvp.score),
              onInput: (event) => {
                state.mvp.score = Number(event.target.value || 0);
              },
            }),
          ]),
        ]),
      ]),
      el('div', { className: 'grid-two' }, [
        el('div', { className: 'panel' }, [
          el('h3', { text: '主队进球与助攻' }),
          renderRows(state.homeScorers, '进球'),
          el('button', { className: 'button', type: 'button', text: '添加进球球员', onClick: () => { state.homeScorers.push({ name: '', count: 0 }); render(); } }),
          renderRows(state.homeAssists, '助攻'),
          el('button', { className: 'button', type: 'button', text: '添加助攻球员', onClick: () => { state.homeAssists.push({ name: '', count: 0 }); render(); } }),
          el('div', { className: 'field-grid' }, [
            el('label', { className: 'field' }, [
              el('span', { text: '黄牌' }),
              el('input', {
                type: 'number',
                min: '0',
                step: '1',
                value: String(state.homeCards.yellow),
                onInput: (event) => {
                  state.homeCards.yellow = Number(event.target.value || 0);
                },
              }),
            ]),
            el('label', { className: 'field' }, [
              el('span', { text: '红牌' }),
              el('input', {
                type: 'number',
                min: '0',
                step: '1',
                value: String(state.homeCards.red),
                onInput: (event) => {
                  state.homeCards.red = Number(event.target.value || 0);
                },
              }),
            ]),
          ]),
        ]),
        el('div', { className: 'panel' }, [
          el('h3', { text: '客队进球与助攻' }),
          renderRows(state.awayScorers, '进球'),
          el('button', { className: 'button', type: 'button', text: '添加进球球员', onClick: () => { state.awayScorers.push({ name: '', count: 0 }); render(); } }),
          renderRows(state.awayAssists, '助攻'),
          el('button', { className: 'button', type: 'button', text: '添加助攻球员', onClick: () => { state.awayAssists.push({ name: '', count: 0 }); render(); } }),
          el('div', { className: 'field-grid' }, [
            el('label', { className: 'field' }, [
              el('span', { text: '黄牌' }),
              el('input', {
                type: 'number',
                min: '0',
                step: '1',
                value: String(state.awayCards.yellow),
                onInput: (event) => {
                  state.awayCards.yellow = Number(event.target.value || 0);
                },
              }),
            ]),
            el('label', { className: 'field' }, [
              el('span', { text: '红牌' }),
              el('input', {
                type: 'number',
                min: '0',
                step: '1',
                value: String(state.awayCards.red),
                onInput: (event) => {
                  state.awayCards.red = Number(event.target.value || 0);
                },
              }),
            ]),
          ]),
        ]),
      ]),
      error,
      el('div', { className: 'toolbar' }, [
        el('button', {
          className: 'button primary',
          type: 'button',
          text: '保存比赛',
          onClick: () => {
            const nextMatch = {
              ...match,
              homeGoals: state.homeGoals,
              awayGoals: state.awayGoals,
              homeScorers: readTeamEntries(state.homeScorers),
              awayScorers: readTeamEntries(state.awayScorers),
              homeAssists: readTeamEntries(state.homeAssists),
              awayAssists: readTeamEntries(state.awayAssists),
              homeCards: state.homeCards,
              awayCards: state.awayCards,
              mvp: {
                name: state.mvp.name.trim(),
                team: state.mvp.team.trim(),
                score: Number(state.mvp.score),
              },
              isPlayed: true,
            };
            const errorText = validateContributionTotals(nextMatch);
            const mvpErrorText = validateMvpSelection(nextMatch);
            if (mvpErrorText) {
              error.textContent = mvpErrorText;
              return;
            }
            if (errorText) {
              error.textContent = errorText;
              return;
            }
            onSave(nextMatch);
          },
        }),
        el('button', { className: 'button', type: 'button', text: '取消', onClick: onCancel }),
      ])
    );
  }

  root.append(error);
  render();
  return root;
}
