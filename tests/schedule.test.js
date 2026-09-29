import { describe, expect, it } from 'vitest';
import { createInitialState, generateSchedule, validateSetup } from '../src/schedule.js';

describe('validateSetup', () => {
  it('rejects missing teams', () => {
    expect(validateSetup({ teamsA: [], teamsB: ['巴塞罗那'], matchesPerPair: 2 })).toBeTruthy();
  });

  it('rejects duplicate or overlapping teams', () => {
    expect(validateSetup({ teamsA: ['皇家马德里', '皇家马德里'], teamsB: ['巴塞罗那', '拜仁慕尼黑'], matchesPerPair: 2 })).toBeTruthy();
    expect(validateSetup({ teamsA: ['皇家马德里'], teamsB: ['皇家马德里'], matchesPerPair: 2 })).toBeTruthy();
  });

  it('rejects invalid y', () => {
    expect(validateSetup({ teamsA: ['皇家马德里'], teamsB: ['巴塞罗那'], matchesPerPair: 1 })).toBeTruthy();
    expect(validateSetup({ teamsA: ['皇家马德里'], teamsB: ['巴塞罗那'], matchesPerPair: 3 })).toBeTruthy();
  });
});

describe('generateSchedule', () => {
  it('generates balanced home and away fixtures', () => {
    const matches = generateSchedule({
      teamsA: ['皇家马德里', '拜仁慕尼黑'],
      teamsB: ['巴塞罗那', '曼城'],
      matchesPerPair: 2,
    });

    expect(matches).toHaveLength(8);

    const pairMap = new Map();
    const roundTeams = new Map();
    const homeCounts = new Map();
    const awayCounts = new Map();

    for (const match of matches) {
      const pair = [match.homeTeam, match.awayTeam].sort().join(' vs ');
      pairMap.set(pair, (pairMap.get(pair) ?? 0) + 1);

      homeCounts.set(match.homeTeam, (homeCounts.get(match.homeTeam) ?? 0) + 1);
      awayCounts.set(match.awayTeam, (awayCounts.get(match.awayTeam) ?? 0) + 1);

      const roundSet = roundTeams.get(match.round) ?? new Set();
      expect(roundSet.has(match.homeTeam)).toBe(false);
      expect(roundSet.has(match.awayTeam)).toBe(false);
      roundSet.add(match.homeTeam);
      roundSet.add(match.awayTeam);
      roundTeams.set(match.round, roundSet);
    }

    expect([...pairMap.values()]).toEqual([2, 2, 2, 2]);
    expect(homeCounts.get('皇家马德里')).toBe(2);
    expect(awayCounts.get('皇家马德里')).toBe(2);
  });

  it('supports a single pair of teams', () => {
    const matches = generateSchedule({ teamsA: ['皇家马德里'], teamsB: ['巴塞罗那'], matchesPerPair: 2 });
    expect(matches).toHaveLength(2);
    expect(matches[0].homeTeam).toBe('皇家马德里');
    expect(matches[1].homeTeam).toBe('巴塞罗那');
  });
});

describe('createInitialState', () => {
  it('creates versioned state with cloned config', () => {
    const config = {
      playerA: 'A',
      playerB: 'B',
      teamsA: ['皇家马德里'],
      teamsB: ['巴塞罗那'],
      matchesPerPair: 2,
      awards: {
        firstPlace: 300,
        secondPlace: 200,
        thirdPlace: 100,
        topScorer: 50,
        topAssist: 40,
        fmvp: 80,
      },
    };

    const state = createInitialState(config);
    expect(state.version).toBe(1);
    expect(state.config.teamsA).toEqual(['皇家马德里']);
    expect(state.matches).toHaveLength(2);
    expect(state.awards).toEqual({
      firstPlace: 300,
      secondPlace: 200,
      thirdPlace: 100,
      topScorer: 50,
      topAssist: 40,
      fmvp: 80,
      fmvpPlayerName: '',
      fmvpTeam: '',
    });
  });

  it('creates a timestamped snapshot', () => {
    const state = createInitialState({
      playerA: 'A',
      playerB: 'B',
      teamsA: ['皇家马德里'],
      teamsB: ['巴塞罗那'],
      matchesPerPair: 2,
    });
    expect(state.createdAt).toMatch(/T/);
  });

  it('canonicalizes short club names in config', () => {
    const state = createInitialState({
      playerA: 'A',
      playerB: 'B',
      teamsA: ['皇马', '巴萨'],
      teamsB: ['拜仁', '红魔'],
      matchesPerPair: 2,
    });
    expect(state.config.teamsA).toEqual(['皇家马德里', '巴塞罗那']);
    expect(state.config.teamsB).toEqual(['拜仁慕尼黑', '曼联']);
    expect(state.matches.some((match) => match.homeTeam === '皇家马德里')).toBe(true);
  });
});
