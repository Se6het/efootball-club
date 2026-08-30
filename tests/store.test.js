import { beforeEach, describe, expect, it } from 'vitest';
import { clearState, loadState, parseBackup, saveState, serializeState, updateAwards, updateMatch } from '../src/store.js';
import { STATE_KEY } from '../src/schedule.js';

beforeEach(() => {
  const localStorage = {
    data: new Map(),
    getItem(key) {
      return this.data.get(key) ?? null;
    },
    setItem(key, value) {
      this.data.set(key, String(value));
    },
    removeItem(key) {
      this.data.delete(key);
    },
  };
  global.window = { localStorage };
});

describe('store', () => {
  it('saves and loads a valid state', () => {
    const state = {
      version: 1,
      config: {
        playerA: 'A',
        playerB: 'B',
        teamsA: ['皇家马德里'],
        teamsB: ['巴塞罗那'],
        matchesPerPair: 2,
      },
      matches: [],
    };

    saveState(state);
    expect(global.window.localStorage.getItem(STATE_KEY)).toContain('"version":1');
    expect(loadState()).toEqual(state);
  });

  it('returns null for invalid stored state and broken JSON', () => {
    global.window.localStorage.setItem(STATE_KEY, JSON.stringify({ version: 2, matches: [] }));
    expect(loadState()).toBeNull();

    global.window.localStorage.setItem(STATE_KEY, '{broken');
    expect(loadState()).toBeNull();
  });

  it('returns null for invalid stored award settings', () => {
    global.window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      config: {
        playerA: 'A',
        playerB: 'B',
        teamsA: ['皇家马德里'],
        teamsB: ['巴塞罗那'],
        matchesPerPair: 2,
      },
      matches: [],
      awards: {
        firstPlace: -1,
        secondPlace: 200,
        thirdPlace: 100,
        topScorer: 50,
        topAssist: 40,
        fmvp: 80,
        fmvpPlayerName: '张三',
        fmvpTeam: '皇家马德里',
      },
    }));

    expect(loadState()).toBeNull();
  });

  it('accepts stored award amounts before FMVP selection is set', () => {
    global.window.localStorage.setItem(STATE_KEY, JSON.stringify({
      version: 1,
      config: {
        playerA: 'A',
        playerB: 'B',
        teamsA: ['皇家马德里'],
        teamsB: ['巴塞罗那'],
        matchesPerPair: 2,
      },
      matches: [],
      awards: {
        firstPlace: 300,
        secondPlace: 200,
        thirdPlace: 100,
        topScorer: 50,
        topAssist: 40,
        fmvp: 80,
        fmvpPlayerName: '',
        fmvpTeam: '',
      },
    }));

    expect(loadState()).not.toBeNull();
  });

  it('updates a single match immutably', () => {
    const original = {
      version: 1,
      config: {},
      matches: [{ id: 'm-1', homeGoals: 0 }],
    };

    const next = updateMatch(original, 'm-1', (match) => ({ ...match, homeGoals: 3 }));
    expect(next.matches[0].homeGoals).toBe(3);
    expect(original.matches[0].homeGoals).toBe(0);
  });

  it('updates awards immutably', () => {
    const original = {
      version: 1,
      config: {},
      matches: [],
    };

    const next = updateAwards(original, { firstPlace: 300, fmvpPlayerName: '张三' });
    expect(next.awards).toEqual({ firstPlace: 300, fmvpPlayerName: '张三' });
    expect(original.awards).toBeUndefined();
  });

  it('returns a snapshot when save fails', () => {
    global.window.localStorage.setItem = () => { throw new Error('quota'); };
    const state = { version: 1, config: {}, matches: [] };
    expect(saveState(state)).toEqual(state);
  });

  it('clears stored state', () => {
    global.window.localStorage.setItem(STATE_KEY, 'x');
    clearState();
    expect(loadState()).toBeNull();
  });
});

describe('serializeState / parseBackup', () => {
  const validState = {
    version: 1,
    config: {
      playerA: 'A',
      playerB: 'B',
      teamsA: ['皇家马德里'],
      teamsB: ['巴塞罗那'],
      matchesPerPair: 2,
    },
    matches: [],
  };

  it('round-trips a valid state', () => {
    const result = parseBackup(serializeState(validState));
    expect(result.error).toBeNull();
    expect(result.state).toEqual(validState);
  });

  it('rejects invalid JSON', () => {
    expect(parseBackup('{broken').error).toBeTruthy();
  });

  it('rejects a structurally invalid state', () => {
    expect(parseBackup(JSON.stringify({ version: 2, matches: [] })).error).toBeTruthy();
  });
});
