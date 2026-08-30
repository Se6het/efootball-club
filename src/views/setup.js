import { createInitialState, validateSetup } from '../schedule.js';
import { clear, el, inputValue, numberValue } from '../ui.js';

function buildTeamInputs(title, teams, onChange) {
  return el('div', { className: 'panel' }, [
    el('h3', { text: title }),
    el('div', {
      className: 'team-list',
      id: `${title}-teams`,
    }, teams.map((team, index) => {
      const input = el('input', {
        type: 'text',
        value: team,
        placeholder: `俱乐部 ${index + 1}`,
        onInput: (event) => onChange(index, event.target.value),
      });
      return el('div', { className: 'field' }, [
        el('label', { text: `第 ${index + 1} 支俱乐部` }),
        input,
      ]);
    })),
  ]);
}

function buildPrizeInputs(prizes, onChange) {
  const fields = [
    ['冠军奖金', 'firstPlace'],
    ['亚军奖金', 'secondPlace'],
    ['季军奖金', 'thirdPlace'],
    ['射手王奖金', 'topScorer'],
    ['助攻王奖金', 'topAssist'],
    ['FMVP 奖金', 'fmvp'],
  ];

  return el('div', { className: 'panel' }, [
    el('h3', { text: '赛后奖金设置' }),
    el('p', { className: 'muted', text: '这里先录入奖金金额，赛季结束后再选择 FMVP 球员。' }),
    el('div', { className: 'award-input-grid' }, fields.map(([label, key]) =>
      el('label', { className: 'field' }, [
        el('span', { text: label }),
        el('input', {
          type: 'number',
          min: '0',
          step: '1',
          value: String(prizes[key]),
          onInput: (event) => onChange(key, Number(event.target.value || 0)),
        }),
      ])
    )),
  ]);
}

export function renderSetupView({ onStart, initialConfig = null, sampleConfig = null, error = '', onImport }) {
  const root = el('div', { className: 'grid-two' });
  const leftTeams = initialConfig?.teamsA ?? [''];
  const rightTeams = initialConfig?.teamsB ?? [''];
  const initialAwards = initialConfig?.awards ?? {};
  const state = {
    playerA: initialConfig?.playerA ?? '玩家A',
    playerB: initialConfig?.playerB ?? '玩家B',
    matchesPerPair: initialConfig?.matchesPerPair ?? 2,
    teamsA: [...leftTeams],
    teamsB: [...rightTeams],
    awards: {
      firstPlace: initialAwards.firstPlace ?? 0,
      secondPlace: initialAwards.secondPlace ?? 0,
      thirdPlace: initialAwards.thirdPlace ?? 0,
      topScorer: initialAwards.topScorer ?? 0,
      topAssist: initialAwards.topAssist ?? 0,
      fmvp: initialAwards.fmvp ?? 0,
    },
  };

  const errorBox = el('div', { className: 'error', text: error });

  const render = () => {
    clear(root);
    root.append(
      el('div', { className: 'panel' }, [
        el('h2', { text: '赛前配置' }),
        el('div', { className: 'field-grid' }, [
          el('label', { className: 'field' }, [
            el('span', { text: '玩家 A 名称' }),
            el('input', {
              type: 'text',
              value: state.playerA,
              onInput: (event) => {
                state.playerA = event.target.value;
              },
            }),
          ]),
          el('label', { className: 'field' }, [
            el('span', { text: '玩家 B 名称' }),
            el('input', {
              type: 'text',
              value: state.playerB,
              onInput: (event) => {
                state.playerB = event.target.value;
              },
            }),
          ]),
        ]),
        el('div', { className: 'field-grid' }, [
          el('label', { className: 'field' }, [
            el('span', { text: '每位玩家选择俱乐部数量 x' }),
            el('input', {
              type: 'number',
              min: '1',
              step: '1',
              value: String(state.teamsA.length),
              onInput: (event) => {
                const next = Math.max(1, Number(event.target.value || 1));
                state.teamsA = Array.from({ length: next }, (_, index) => state.teamsA[index] ?? '');
                state.teamsB = Array.from({ length: next }, (_, index) => state.teamsB[index] ?? '');
                onStart?.preview?.();
                render();
              },
            }),
          ]),
          el('label', { className: 'field' }, [
            el('span', { text: '每组对战场次 y（偶数）' }),
            el('input', {
              type: 'number',
              min: '2',
              step: '2',
              value: String(state.matchesPerPair),
              onInput: (event) => {
                state.matchesPerPair = numberValue(event.target);
              },
            }),
          ]),
        ]),
        el('div', { className: 'grid-two' }, [
          buildTeamInputs('玩家 A', state.teamsA, (index, value) => {
            state.teamsA[index] = value;
          }),
          buildTeamInputs('玩家 B', state.teamsB, (index, value) => {
            state.teamsB[index] = value;
          }),
        ]),
        buildPrizeInputs(state.awards, (key, value) => {
          state.awards[key] = value;
        }),
        errorBox,
        el('div', { className: 'toolbar' }, [
          el('button', { className: 'button primary', type: 'button', text: '生成赛程', onClick: () => {
            const errorText = validateSetup({ teamsA: state.teamsA, teamsB: state.teamsB, matchesPerPair: state.matchesPerPair });
            if (errorText) {
              errorBox.textContent = errorText;
              return;
            }
            const nextState = createInitialState({
              playerA: state.playerA.trim() || '玩家A',
              playerB: state.playerB.trim() || '玩家B',
              teamsA: state.teamsA.map((team) => team.trim()),
              teamsB: state.teamsB.map((team) => team.trim()),
              matchesPerPair: Number(state.matchesPerPair),
              awards: state.awards,
            });
            onStart(nextState);
          }}),
          sampleConfig
            ? el('button', { className: 'button', type: 'button', text: '加载示例', onClick: () => {
                state.playerA = sampleConfig.playerA;
                state.playerB = sampleConfig.playerB;
                state.matchesPerPair = sampleConfig.matchesPerPair;
                state.teamsA = [...sampleConfig.teamsA];
                state.teamsB = [...sampleConfig.teamsB];
                render();
              } })
            : null,
          onImport
            ? el('button', { className: 'button', type: 'button', text: '导入备份', onClick: onImport })
            : null,
        ]),
      ]),
      el('div', { className: 'panel' }, [
        el('h2', { text: '说明' }),
        el('p', {
          className: 'muted',
          text: '输入双方玩家名称、各自俱乐部和对阵场次后，系统会自动生成完整赛程并保存到浏览器。',
        }),
        el('div', { className: 'setup-tips' }, [
          el('div', { className: 'setup-tip' }, ['🛡️ ', '输入俱乐部名后，赛程/榜单会自动带上队徽配色']),
          el('div', { className: 'setup-tip' }, ['📈 ', '录完比分即可查看球队榜、球员榜和赛季颁奖']),
          el('div', { className: 'setup-tip' }, ['💾 ', '数据保存在浏览器本地，无需账号']),
        ]),
      ])
    );
  };

  render();
  return root;
}
