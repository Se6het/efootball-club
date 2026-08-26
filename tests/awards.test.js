import { describe, expect, it } from 'vitest';
import {
  buildAwardSummary,
  isSeasonFinished,
  normalizeAwardSettings,
  validateAwardSettings,
} from '../src/awards.js';

describe('validateAwardSettings', () => {
  it('accepts non-negative integer prizes and a valid FMVP selection', () => {
    expect(
      validateAwardSettings(
        {
          firstPlace: 300,
          secondPlace: 200,
          thirdPlace: 100,
          topScorer: 50,
          topAssist: 40,
          fmvp: 80,
          fmvpPlayerName: '张三',
          fmvpTeam: '皇家马德里',
        },
        ['皇家马德里', '巴塞罗那']
      )
    ).toBeNull();
  });

  it('rejects invalid prizes and missing FMVP fields', () => {
    expect(
      validateAwardSettings(
        {
          firstPlace: -1,
          secondPlace: 200,
          thirdPlace: 100,
          topScorer: 50,
          topAssist: 40,
          fmvp: 80,
          fmvpPlayerName: ' ',
          fmvpTeam: '不存在',
        },
        ['皇家马德里', '巴塞罗那']
      )
    ).toContain('奖金');
  });
});

describe('normalizeAwardSettings', () => {
  it('creates an immutable snapshot', () => {
    const source = {
      firstPlace: 300,
      secondPlace: 200,
      thirdPlace: 100,
      topScorer: 50,
      topAssist: 40,
      fmvp: 80,
      fmvpPlayerName: '张三',
      fmvpTeam: '皇家马德里',
    };

    expect(normalizeAwardSettings(source)).toEqual(source);
  });
});

describe('isSeasonFinished', () => {
  it('detects complete seasons only when every match has been played', () => {
    expect(isSeasonFinished([])).toBe(false);
    expect(isSeasonFinished([{ isPlayed: true }, { isPlayed: true }])).toBe(true);
    expect(isSeasonFinished([{ isPlayed: true }, { isPlayed: false }])).toBe(false);
  });
});

describe('buildAwardSummary', () => {
  it('returns podium, tied winners, and FMVP data', () => {
    const summary = buildAwardSummary(
      {
        firstPlace: 300,
        secondPlace: 200,
        thirdPlace: 100,
        topScorer: 50,
        topAssist: 40,
        fmvp: 80,
        fmvpPlayerName: '张三',
        fmvpTeam: '皇家马德里',
      },
      {
        rankedTeams: [
          { rank: 1, team: '皇家马德里', points: 18 },
          { rank: 2, team: '巴塞罗那', points: 15 },
          { rank: 3, team: '拜仁慕尼黑', points: 12 },
        ],
        playerStats: [
          { name: '张三', team: '皇家马德里', goals: 4, assists: 2 },
          { name: '李四', team: '巴塞罗那', goals: 4, assists: 2 },
          { name: '王五', team: '拜仁慕尼黑', goals: 2, assists: 5 },
        ],
      }
    );

    expect(summary.podium).toEqual([
      { rank: 1, team: '皇家马德里', prize: 300 },
      { rank: 2, team: '巴塞罗那', prize: 200 },
      { rank: 3, team: '拜仁慕尼黑', prize: 100 },
    ]);
    expect(summary.topScorer.winners).toEqual([
      { name: '李四', team: '巴塞罗那', goals: 4, assists: 2 },
      { name: '张三', team: '皇家马德里', goals: 4, assists: 2 },
    ]);
    expect(summary.topAssist.winners).toEqual([
      { name: '王五', team: '拜仁慕尼黑', goals: 2, assists: 5 },
    ]);
    expect(summary.fmvp).toEqual({
      name: '张三',
      team: '皇家马德里',
      prize: 80,
    });
  });

  it('awards the golden boot to the player with more assists when goals are tied', () => {
    const summary = buildAwardSummary(
      {
        firstPlace: 300,
        secondPlace: 200,
        thirdPlace: 100,
        topScorer: 50,
        topAssist: 40,
        fmvp: 80,
        fmvpPlayerName: '张三',
        fmvpTeam: '皇家马德里',
      },
      {
        rankedTeams: [],
        playerStats: [
          { name: '张三', team: '皇家马德里', goals: 4, assists: 1 },
          { name: '李四', team: '巴塞罗那', goals: 4, assists: 3 },
        ],
      }
    );

    expect(summary.topScorer.winners).toEqual([
      { name: '李四', team: '巴塞罗那', goals: 4, assists: 3 },
    ]);
  });

  it('awards the assist king to the player with more goals when assists are tied', () => {
    const summary = buildAwardSummary(
      {
        firstPlace: 300,
        secondPlace: 200,
        thirdPlace: 100,
        topScorer: 50,
        topAssist: 40,
        fmvp: 80,
        fmvpPlayerName: '张三',
        fmvpTeam: '皇家马德里',
      },
      {
        rankedTeams: [],
        playerStats: [
          { name: '张三', team: '皇家马德里', goals: 2, assists: 5 },
          { name: '李四', team: '巴塞罗那', goals: 3, assists: 5 },
        ],
      }
    );

    expect(summary.topAssist.winners).toEqual([
      { name: '李四', team: '巴塞罗那', goals: 3, assists: 5 },
    ]);
  });

  it('does not create scorers or assisters when everyone has zero output', () => {
    const summary = buildAwardSummary(
      {
        firstPlace: 300,
        secondPlace: 200,
        thirdPlace: 100,
        topScorer: 50,
        topAssist: 40,
        fmvp: 80,
        fmvpPlayerName: '张三',
        fmvpTeam: '皇家马德里',
      },
      {
        rankedTeams: [],
        playerStats: [
          { name: '张三', team: '皇家马德里', goals: 0, assists: 0 },
          { name: '李四', team: '巴塞罗那', goals: 0, assists: 0 },
        ],
      }
    );

    expect(summary.topScorer.winners).toEqual([]);
    expect(summary.topAssist.winners).toEqual([]);
  });
});
