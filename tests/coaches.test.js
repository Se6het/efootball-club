import { beforeEach, describe, expect, it } from 'vitest';
import {
  addSeason,
  buildSeasonRecord,
  computeCoachRecords,
  isValidSeason,
  isValidWorld,
  loadWorld,
  makeSeasonId,
  mergeSeasons,
  normalizeWorld,
  parseWorldBackup,
  previousCoaches,
  removeSeason,
  saveWorld,
  sortSeasons,
  worldStats,
} from '../src/coaches.js';

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

function match(id, matchNumber, round, homeTeam, awayTeam, homeGoals, awayGoals, extra = {}) {
  return {
    id,
    matchNumber,
    round,
    homeTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    isPlayed: true,
    homeCards: { yellow: 0, red: 0 },
    awayCards: { yellow: 0, red: 0 },
    homePlayerCards: [],
    awayPlayerCards: [],
    homeScorers: [],
    awayScorers: [],
    homeAssists: [],
    awayAssists: [],
    ...extra,
  };
}

function stateOf(overrides = {}) {
  return {
    version: 1,
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    config: {
      playerA: '小明',
      playerB: '小红',
      teamsA: ['皇马'],
      teamsB: ['巴萨'],
      matchesPerPair: 2,
      ...(overrides.config ?? {}),
    },
    awards: {
      firstPlace: 300,
      secondPlace: 200,
      thirdPlace: 100,
      topScorer: 50,
      topAssist: 40,
      fmvp: 80,
      fmvpPlayerName: '',
      fmvpTeam: '',
      ...(overrides.awards ?? {}),
    },
    matches: overrides.matches ?? [],
  };
}

function row(team, coach, rank, extra = {}) {
  return {
    team,
    coach,
    rank,
    needsPlayoff: false,
    played: 2,
    wins: 1,
    draws: 1,
    losses: 0,
    goalsFor: 3,
    goalsAgainst: 1,
    goalDifference: 2,
    points: 4,
    ...extra,
  };
}

function seasonOf(overrides = {}) {
  return {
    id: 's-1',
    sourceId: 'src-1',
    label: '小明 vs 小红',
    archivedAt: '2026-01-01T00:00:00.000Z',
    complete: true,
    coaches: ['小明', '小红'],
    playedMatches: 2,
    totalMatches: 2,
    standings: [row('皇马', '小明', 1), row('巴萨', '小红', 2)],
    awards: {
      champion: { team: '皇马', coach: '小明', rank: 1, needsPlayoff: false },
      podium: [
        { team: '皇马', coach: '小明', rank: 1, needsPlayoff: false },
        { team: '巴萨', coach: '小红', rank: 2, needsPlayoff: false },
      ],
      topScorers: [],
      topAssists: [],
      fmvp: null,
    },
    h2h: { played: 2, winsA: 1, draws: 1, winsB: 0, goalsA: 3, goalsB: 1, biggestMargin: null },
    ...overrides,
  };
}

function worldOf(...seasons) {
  return { version: 1, seasons };
}

describe('world storage helpers', () => {
  it('normalizes arrays, objects and junk into a world', () => {
    expect(normalizeWorld([seasonOf()]).seasons).toHaveLength(1);
    expect(normalizeWorld({ seasons: [seasonOf()] }).seasons).toHaveLength(1);
    expect(normalizeWorld(null)).toEqual({ version: 1, seasons: [] });
    expect(normalizeWorld({ seasons: 'nope' }).seasons).toEqual([]);
  });

  it('makes unique season ids', () => {
    const ids = new Set([makeSeasonId(1), makeSeasonId(1), makeSeasonId(2)]);
    expect(ids.size).toBe(3);
    expect([...ids][0]).toMatch(/^s-/);
  });

  it('sorts seasons by archive time then id', () => {
    const later = seasonOf({ id: 's-b', archivedAt: '2026-02-01T00:00:00.000Z' });
    const earlier = seasonOf({ id: 's-a', archivedAt: '2026-01-01T00:00:00.000Z' });
    expect(sortSeasons([later, earlier]).map((item) => item.id)).toEqual(['s-a', 's-b']);
  });

  it('lists previous coaches uniquely and sorted', () => {
    const world = worldOf(
      seasonOf({ id: 's-1', coaches: ['小红', '小明'] }),
      seasonOf({ id: 's-2', coaches: ['小明', '小刚'] }),
    );
    expect(previousCoaches(world).sort()).toEqual(['小刚', '小明', '小红'].sort());
    expect(previousCoaches({ version: 1, seasons: [] })).toEqual([]);
  });

  it('summarizes the world size', () => {
    const world = worldOf(
      seasonOf({ id: 's-1', playedMatches: 6 }),
      seasonOf({ id: 's-2', coaches: ['小明', '小刚'], playedMatches: 4 }),
    );
    expect(worldStats(world)).toEqual({ seasons: 2, coaches: 3, matches: 10 });
    expect(worldStats(null)).toEqual({ seasons: 0, coaches: 0, matches: 0 });
  });
});

describe('buildSeasonRecord', () => {
  it('returns null when the state is unusable', () => {
    expect(buildSeasonRecord(null)).toBeNull();
    expect(buildSeasonRecord({ config: null, matches: [] })).toBeNull();
    expect(buildSeasonRecord({ config: {}, matches: null })).toBeNull();
  });

  it('captures coaches, standings, awards and head-to-head', () => {
    const state = stateOf({
      config: { playerA: '小明', playerB: '小红', teamsA: ['皇马', '拜仁'], teamsB: ['巴萨', '曼城'] },
      awards: { fmvpPlayerName: '贝林厄姆', fmvpTeam: '皇马' },
      matches: [
        match('m-1', 1, 1, '皇马', '巴萨', 2, 0, {
          homeScorers: [{ name: '维尼修斯', count: 2 }],
          homeAssists: [{ name: '贝林厄姆', count: 1 }],
        }),
        // 客队是教练 A 的球队，进球要算到 A 头上。
        match('m-2', 2, 1, '巴萨', '皇马', 0, 3, { awayScorers: [{ name: '维尼修斯', count: 3 }] }),
        match('m-3', 3, 1, '拜仁', '曼城', 1, 1),
      ],
    });

    const record = buildSeasonRecord(state, { id: 'fixed', archivedAt: '2026-05-05T00:00:00.000Z' });
    expect(record.id).toBe('fixed');
    expect(record.sourceId).toBe('2026-01-01T00:00:00.000Z');
    expect(record.label).toBe('小明 vs 小红');
    expect(record.complete).toBe(true);
    expect(record.coaches).toEqual(['小明', '小红']);
    expect(record.playedMatches).toBe(3);
    expect(record.totalMatches).toBe(3);

    // 每支球队都带上了所属教练。
    expect(record.standings.find((item) => item.team === '皇马').coach).toBe('小明');
    expect(record.standings.find((item) => item.team === '巴萨').coach).toBe('小红');
    expect(record.standings[0].team).toBe('皇马');
    expect(record.standings[0].rank).toBe(1);

    expect(record.awards.champion).toMatchObject({ team: '皇马', coach: '小明' });
    expect(record.awards.topScorers[0]).toMatchObject({ name: '维尼修斯', team: '皇马', coach: '小明', goals: 5 });
    expect(record.awards.topAssists[0]).toMatchObject({ name: '贝林厄姆', team: '皇马', coach: '小明', assists: 1 });
    expect(record.awards.fmvp).toEqual({ name: '贝林厄姆', team: '皇马', coach: '小明' });

    expect(record.h2h).toMatchObject({ played: 3, winsA: 2, draws: 1, winsB: 0, goalsA: 6, goalsB: 1 });
    expect(record.h2h.biggestMargin).toMatchObject({ diff: 3, score: '0:3', coach: '小明', winner: '皇马', loser: '巴萨' });
  });

  it('drops the champion when the title still needs a playoff', () => {
    const state = stateOf({ matches: [match('m-1', 1, 1, '皇马', '巴萨', 1, 1)] });
    const record = buildSeasonRecord(state, { id: 'x' });
    expect(record.complete).toBe(true);
    expect(record.awards.champion).toBeNull();
    expect(record.awards.podium[0].needsPlayoff).toBe(true);
    expect(record.h2h).toMatchObject({ played: 1, winsA: 0, draws: 1, winsB: 0 });
    expect(record.h2h.biggestMargin).toBeNull();
  });

  it('marks a season that is not finished yet', () => {
    const state = stateOf({
      matches: [
        match('m-1', 1, 1, '皇马', '巴萨', 2, 0),
        match('m-2', 2, 1, '巴萨', '皇马', 0, 0, { isPlayed: false }),
      ],
    });
    const record = buildSeasonRecord(state, { id: 'x' });
    expect(record.complete).toBe(false);
    expect(record.playedMatches).toBe(1);
    expect(record.totalMatches).toBe(2);
  });

  it('keeps honours empty until the season is finished', () => {
    const state = stateOf({
      awards: { fmvpPlayerName: '维尼修斯', fmvpTeam: '皇马' },
      matches: [
        match('m-1', 1, 1, '皇马', '巴萨', 2, 0, {
          homeScorers: [{ name: '维尼修斯', count: 2 }],
          homeAssists: [{ name: '贝林厄姆', count: 1 }],
        }),
        match('m-2', 2, 1, '巴萨', '皇马', 0, 0, { isPlayed: false }),
      ],
    });
    const record = buildSeasonRecord(state, { id: 'x' });
    expect(record.awards.champion).toBeNull();
    expect(record.awards.podium).toEqual([]);
    expect(record.awards.topScorers).toEqual([]);
    expect(record.awards.topAssists).toEqual([]);
    expect(record.awards.fmvp).toBeNull();
    // 名次仍在 standings 里，只是不作为荣誉写进 awards。
    expect(record.standings[0].team).toBe('皇马');
  });

  it('falls back to default coach names when the players are unnamed', () => {
    const state = stateOf({ config: { playerA: '  ', playerB: '' }, matches: [match('m-1', 1, 1, '皇马', '巴萨', 1, 0)] });
    const record = buildSeasonRecord(state, { id: 'x' });
    expect(record.coaches).toEqual(['玩家A', '玩家B']);
    expect(record.label).toBe('玩家A vs 玩家B');
  });
});

describe('season validation', () => {
  it('accepts a well-formed season and rejects broken ones', () => {
    expect(isValidSeason(seasonOf())).toBe(true);
    expect(isValidWorld(worldOf(seasonOf()))).toBe(true);
    expect(isValidWorld([seasonOf()])).toBe(true);

    expect(isValidSeason(null)).toBe(false);
    expect(isValidSeason(seasonOf({ id: '' }))).toBe(false);
    expect(isValidSeason(seasonOf({ coaches: ['小明'] }))).toBe(false);
    expect(isValidSeason(seasonOf({ coaches: ['小明', ''] }))).toBe(false);
    expect(isValidSeason(seasonOf({ complete: 'yes' }))).toBe(false);
    expect(isValidSeason(seasonOf({ sourceId: 7 }))).toBe(false);
    expect(isValidSeason(seasonOf({ standings: [{}] }))).toBe(false);
    expect(isValidSeason(seasonOf({ awards: { champion: null, podium: [{}], topScorers: [], topAssists: [], fmvp: null } }))).toBe(false);
    expect(isValidSeason(seasonOf({ awards: { champion: null, podium: [], topScorers: [{ name: 'A' }], topAssists: [], fmvp: null } }))).toBe(false);
    expect(isValidSeason(seasonOf({ awards: { champion: null, podium: [], topScorers: [], topAssists: [], fmvp: { name: 'A' } } }))).toBe(false);
    expect(isValidSeason(seasonOf({ h2h: { played: -1, winsA: 0, draws: 0, winsB: 0, goalsA: 0, goalsB: 0, biggestMargin: null } }))).toBe(false);
    expect(isValidSeason(seasonOf({ h2h: { played: 1, winsA: 0, draws: 0, winsB: 0, goalsA: 0, goalsB: 0, biggestMargin: { diff: 'x' } } }))).toBe(false);
    expect(isValidSeason(seasonOf({ awards: null }))).toBe(false);
    expect(isValidSeason(seasonOf({ h2h: null }))).toBe(false);
  });

  it('keeps valid seasons and drops the corrupt ones when loading', () => {
    global.window.localStorage.setItem('efootball-league:world:v1', JSON.stringify({
      version: 1,
      seasons: [seasonOf(), { id: 'broken' }],
    }));
    expect(loadWorld().seasons.map((item) => item.id)).toEqual(['s-1']);
  });

  it('returns an empty world without stored data or with broken JSON', () => {
    expect(loadWorld()).toEqual({ version: 1, seasons: [] });
    global.window.localStorage.setItem('efootball-league:world:v1', '{broken');
    expect(loadWorld().seasons).toEqual([]);
  });

  it('saves the world and survives a storage failure', () => {
    const saved = saveWorld(worldOf(seasonOf()));
    expect(saved.seasons).toHaveLength(1);
    expect(loadWorld().seasons).toHaveLength(1);
    expect(saveWorld.lastPersisted).toBe(true);

    global.window.localStorage.setItem = () => { throw new Error('quota'); };
    expect(saveWorld(worldOf(seasonOf())).seasons).toHaveLength(1);
    expect(saveWorld.lastPersisted).toBe(false);
    expect(saveWorld.lastError).toBeTruthy();
  });
});

describe('archiving seasons into the world', () => {
  it('appends a new season', () => {
    const result = addSeason(worldOf(), seasonOf());
    expect(result.added).toBe(true);
    expect(result.replaced).toBe(false);
    expect(result.world.seasons).toHaveLength(1);
  });

  it('replaces an earlier record of the same save instead of duplicating it', () => {
    const first = worldOf(seasonOf({ id: 's-old', playedMatches: 2 }));
    const result = addSeason(first, seasonOf({ id: 's-new', playedMatches: 5 }));
    expect(result.replaced).toBe(true);
    expect(result.world.seasons).toHaveLength(1);
    expect(result.world.seasons[0].id).toBe('s-new');
    expect(result.world.seasons[0].playedMatches).toBe(5);
  });

  it('refuses invalid seasons and duplicate ids', () => {
    expect(addSeason(worldOf(), { id: 'bad' }).added).toBe(false);
    const world = worldOf(seasonOf());
    expect(addSeason(world, seasonOf({ id: 's-1', sourceId: 'other' })).added).toBe(false);
  });

  it('removes a season by id', () => {
    const world = worldOf(seasonOf({ id: 's-1' }), seasonOf({ id: 's-2', sourceId: 'src-2' }));
    expect(removeSeason(world, 's-1').seasons.map((item) => item.id)).toEqual(['s-2']);
  });

  it('merges imported seasons, skipping duplicates and junk', () => {
    const world = worldOf(seasonOf({ id: 's-1' }));
    const merged = mergeSeasons(world, [seasonOf({ id: 's-1' }), seasonOf({ id: 's-2', sourceId: 'src-2' }), { id: 'bad' }]);
    expect(merged.added).toBe(1);
    expect(merged.world.seasons.map((item) => item.id)).toEqual(['s-1', 's-2']);
    expect(mergeSeasons(world, null).added).toBe(0);
  });
});

describe('parseWorldBackup', () => {
  it('reads a world file, a bare array and a single season file', () => {
    expect(parseWorldBackup(JSON.stringify(worldOf(seasonOf()))).seasons).toHaveLength(1);
    expect(parseWorldBackup(JSON.stringify([seasonOf()])).seasons).toHaveLength(1);
    expect(parseWorldBackup(JSON.stringify(seasonOf())).seasons).toHaveLength(1);
  });

  it('reports a friendly error for unusable files', () => {
    expect(parseWorldBackup('{broken').error).toBeTruthy();
    expect(parseWorldBackup(JSON.stringify({ hello: 'world' })).error).toBeTruthy();
    expect(parseWorldBackup(JSON.stringify({ version: 1, seasons: [{ id: 'broken' }] })).error).toBeTruthy();
  });
});

describe('computeCoachRecords', () => {
  it('is empty for an empty world', () => {
    const records = computeCoachRecords({ version: 1, seasons: [] });
    expect(records.coaches).toEqual([]);
    expect(records.seasons).toEqual([]);
    expect(records.pairs).toEqual([]);
    expect(records.stats).toEqual({ seasons: 0, coaches: 0, matches: 0 });
  });

  it('numbers seasons chronologically and collects honours', () => {
    const world = worldOf(
      seasonOf({
        id: 's-1',
        archivedAt: '2026-01-01T00:00:00.000Z',
        standings: [row('皇马', '小明', 1), row('拜仁', '小明', 2), row('曼城', '小明', 3)],
        awards: {
          champion: { team: '皇马', coach: '小明', rank: 1, needsPlayoff: false },
          podium: [
            { team: '皇马', coach: '小明', rank: 1, needsPlayoff: false },
            { team: '拜仁', coach: '小明', rank: 2, needsPlayoff: false },
            { team: '曼城', coach: '小明', rank: 3, needsPlayoff: false },
          ],
          topScorers: [{ name: '维尼修斯', team: '皇马', coach: '小明', goals: 9 }],
          topAssists: [{ name: '贝林厄姆', team: '皇马', coach: '小明', assists: 6 }],
          fmvp: { name: '贝林厄姆', team: '皇马', coach: '小明' },
        },
      }),
      seasonOf({
        id: 's-2',
        sourceId: 'src-2',
        archivedAt: '2026-02-01T00:00:00.000Z',
        standings: [row('巴萨', '小红', 1), row('皇马', '小明', 2)],
        awards: {
          champion: { team: '巴萨', coach: '小红', rank: 1, needsPlayoff: false },
          podium: [
            { team: '巴萨', coach: '小红', rank: 1, needsPlayoff: false },
            { team: '皇马', coach: '小明', rank: 2, needsPlayoff: false },
          ],
          topScorers: [],
          topAssists: [],
          fmvp: null,
        },
      }),
    );

    const records = computeCoachRecords(world);
    expect(records.seasons.map((item) => item.ordinal)).toEqual([1, 2]);

    const ming = records.coaches.find((coach) => coach.name === '小明');
    expect(ming.titlesCount).toBe(1);
    expect(ming.runnerUpCount).toBe(2);
    expect(ming.thirdCount).toBe(1);
    expect(ming.sweepCount).toBe(1);
    expect(ming.sweeps[0].seasonLabel).toBe('第 1 赛季');
    expect(ming.goldenBootCount).toBe(1);
    expect(ming.assistCrownCount).toBe(1);
    expect(ming.fmvpCount).toBe(1);
    expect(ming.titles[0]).toMatchObject({ seasonLabel: '第 1 赛季', team: '皇马' });
    expect(ming.clubCount).toBe(3);
    expect(ming.firstTitle.seasonLabel).toBe('第 1 赛季');

    const hong = records.coaches.find((coach) => coach.name === '小红');
    expect(hong.titlesCount).toBe(1);
    expect(hong.runnerUpCount).toBe(0);
    expect(hong.lastPlaces).toBe(0);
    // 荣誉多的教练排在前面。
    expect(records.coaches[0].name).toBe('小明');
  });

  it('accumulates head-to-head from both orientations', () => {
    const world = worldOf(
      seasonOf({
        id: 's-1',
        standings: [],
        h2h: { played: 3, winsA: 2, draws: 0, winsB: 1, goalsA: 5, goalsB: 3, biggestMargin: { diff: 3, score: '3:0', coach: '小明', winner: '皇马', loser: '巴萨' } },
      }),
      // 第二个档里 小红 是 A 方，胜负要按档内主客重算。
      seasonOf({
        id: 's-2',
        sourceId: 'src-2',
        coaches: ['小红', '小明'],
        standings: [],
        h2h: { played: 2, winsA: 1, draws: 1, winsB: 0, goalsA: 2, goalsB: 1, biggestMargin: { diff: -2, score: '0:2', coach: '小明', winner: '皇马', loser: '巴萨' } },
      }),
    );

    const records = computeCoachRecords(world);
    const ming = records.coaches.find((coach) => coach.name === '小明');
    const rival = ming.rivals.find((item) => item.name === '小红');
    expect(rival).toMatchObject({ played: 5, wins: 2, draws: 1, losses: 2, goalsFor: 6, goalsAgainst: 5 });
    expect(rival.biggestMargin.diff).toBe(3);
    expect(ming.biggestWin.margin).toBe(3);

    const hong = records.coaches.find((coach) => coach.name === '小红');
    const reverse = hong.rivals.find((item) => item.name === '小明');
    expect(reverse).toMatchObject({ wins: 2, draws: 1, losses: 2 });
    expect(reverse.biggestMargin.diff).toBe(-3);
    expect(hong.biggestLoss.margin).toBe(3);

    expect(records.pairs).toHaveLength(1);
    expect(records.pairs[0].played).toBe(5);
  });

  it('keeps unfinished seasons out of the honours but not out of the record', () => {
    const world = worldOf(seasonOf({
      complete: false,
      awards: {
        champion: { team: '皇马', coach: '小明', rank: 1, needsPlayoff: false },
        podium: [{ team: '皇马', coach: '小明', rank: 1, needsPlayoff: false }],
        topScorers: [{ name: '维尼修斯', team: '皇马', coach: '小明', goals: 4 }],
        topAssists: [],
        fmvp: null,
      },
    }));

    const records = computeCoachRecords(world);
    const ming = records.coaches.find((coach) => coach.name === '小明');
    expect(ming.titlesCount).toBe(0);
    expect(ming.goldenBootCount).toBe(0);
    expect(ming.seasons).toBe(1);
    expect(ming.completeSeasons).toBe(0);
    // 场次与交手照算，名次类统计不算。
    expect(ming.matches).toBe(2);
    expect(ming.bestFinish).toBeNull();
    expect(ming.rivals.find((item) => item.name === '小红').played).toBe(2);
  });

  it('reports coaches who never shared a season', () => {
    const world = worldOf(
      seasonOf({ id: 's-1', coaches: ['小明', '小红'] }),
      seasonOf({ id: 's-2', sourceId: 'src-2', coaches: ['小明', '小刚'] }),
    );
    const records = computeCoachRecords(world);
    const hong = records.coaches.find((coach) => coach.name === '小红');
    expect(hong.rivals.map((item) => item.name)).toEqual(['小明']);
    expect(hong.neverFaced).toEqual(['小刚']);
    const gang = records.coaches.find((coach) => coach.name === '小刚');
    expect(gang.neverFaced).toEqual(['小红']);
  });

  it('tracks how long a coach has gone without a title', () => {
    const world = worldOf(
      seasonOf({
        id: 's-1',
        awards: {
          champion: { team: '皇马', coach: '小明', rank: 1, needsPlayoff: false },
          podium: [{ team: '皇马', coach: '小明', rank: 1, needsPlayoff: false }],
          topScorers: [],
          topAssists: [],
          fmvp: null,
        },
      }),
      seasonOf({ id: 's-2', sourceId: 'src-2', awards: { champion: null, podium: [], topScorers: [], topAssists: [], fmvp: null } }),
      seasonOf({ id: 's-3', sourceId: 'src-3', awards: { champion: null, podium: [], topScorers: [], topAssists: [], fmvp: null } }),
    );

    const records = computeCoachRecords(world);
    const ming = records.coaches.find((coach) => coach.name === '小明');
    expect(ming.titleDrought).toBe(2);
    const hong = records.coaches.find((coach) => coach.name === '小红');
    expect(hong.titleDrought).toBe(3);
  });

  it('does not credit a title that still needs a playoff', () => {
    const world = worldOf(seasonOf({
      awards: {
        champion: null,
        podium: [{ team: '皇马', coach: '小明', rank: 1, needsPlayoff: true }],
        topScorers: [],
        topAssists: [],
        fmvp: null,
      },
    }));
    expect(computeCoachRecords(world).coaches.find((coach) => coach.name === '小明').titlesCount).toBe(0);
  });

  it('crowns the quirkiest coaches of the world', () => {
    const podiumOf = (entries) => entries.map(([team, coach], index) => ({ team, coach, rank: index + 1, needsPlayoff: false }));
    const hongWins = {
      champion: { team: '巴萨', coach: '小红', rank: 1, needsPlayoff: false },
      podium: podiumOf([['巴萨', '小红'], ['皇马', '小明']]),
      topScorers: [],
      topAssists: [],
      fmvp: null,
    };
    const world = worldOf(
      seasonOf({
        id: 's-1',
        standings: [row('皇马', '小明', 1), row('拜仁', '小明', 2), row('曼城', '小明', 3)],
        awards: {
          champion: { team: '皇马', coach: '小明', rank: 1, needsPlayoff: false },
          podium: podiumOf([['皇马', '小明'], ['拜仁', '小明'], ['曼城', '小明']]),
          topScorers: [],
          topAssists: [],
          fmvp: null,
        },
      }),
      seasonOf({ id: 's-2', sourceId: 'src-2', standings: [row('巴萨', '小红', 1), row('皇马', '小明', 2)], awards: hongWins }),
      seasonOf({ id: 's-3', sourceId: 'src-3', standings: [row('巴萨', '小红', 1), row('皇马', '小明', 2)], awards: hongWins }),
      seasonOf({ id: 's-4', sourceId: 'src-4', standings: [row('巴萨', '小红', 1), row('皇马', '小明', 2)], awards: hongWins }),
    );

    const records = computeCoachRecords(world);
    const ids = records.facts.map((fact) => fact.id);
    expect(ids).toContain('fact-first-champion');
    expect(ids).toContain('fact-runnerup');
    expect(ids).toContain('fact-clubs');
    expect(ids).toContain('fact-loyal');
    expect(ids).toContain('fact-rivalry');
    expect(ids).toContain('fact-scale');

    const first = records.facts.find((fact) => fact.id === 'fact-first-champion');
    expect(first.title).toContain('小明');
    const runner = records.facts.find((fact) => fact.id === 'fact-runnerup');
    expect(runner.title).toContain('小明');
    expect(runner.detail).toContain('4');
  });

  it('flags a titleless coach and a one-sided rivalry', () => {
    const titleless = { champion: null, podium: [], topScorers: [], topAssists: [], fmvp: null };
    const world = worldOf(
      seasonOf({
        id: 's-1',
        coaches: ['小明', '小刚'],
        standings: [row('皇马', '小明', 2)],
        awards: titleless,
        h2h: { played: 4, winsA: 4, draws: 0, winsB: 0, goalsA: 9, goalsB: 1, biggestMargin: null },
      }),
      seasonOf({
        id: 's-2',
        sourceId: 'src-2',
        coaches: ['小明', '小刚'],
        standings: [],
        awards: titleless,
        h2h: { played: 2, winsA: 2, draws: 0, winsB: 0, goalsA: 4, goalsB: 0, biggestMargin: null },
      }),
      seasonOf({
        id: 's-3',
        sourceId: 'src-3',
        coaches: ['小刚', '小红'],
        standings: [],
        awards: titleless,
        h2h: { played: 2, winsA: 1, draws: 0, winsB: 1, goalsA: 2, goalsB: 2, biggestMargin: null },
      }),
    );

    const records = computeCoachRecords(world);
    const ids = records.facts.map((fact) => fact.id);
    expect(ids).toContain('fact-crownless');
    expect(ids).toContain('fact-lopsided');
    const lopsided = records.facts.find((fact) => fact.id === 'fact-lopsided');
    expect(lopsided.title).toContain('小明');
    // 小刚打了 3 个赛季还没拿过冠军，是这里的「无冕之王」。
    const crownless = records.facts.find((fact) => fact.id === 'fact-crownless');
    expect(crownless.title).toContain('小刚');
    expect(crownless.detail).toContain('3');
  });

  it('marks the coach left at the bottom of a season', () => {
    const world = worldOf(
      seasonOf({ id: 's-1', standings: [row('皇马', '小明', 1), row('巴萨', '小红', 2)], awards: { champion: { team: '皇马', coach: '小明', rank: 1, needsPlayoff: false }, podium: [{ team: '皇马', coach: '小明', rank: 1, needsPlayoff: false }, { team: '巴萨', coach: '小红', rank: 2, needsPlayoff: false }], topScorers: [], topAssists: [], fmvp: null } }),
      seasonOf({ id: 's-2', sourceId: 'src-2', standings: [row('皇马', '小明', 1), row('巴萨', '小红', 2)], awards: { champion: { team: '皇马', coach: '小明', rank: 1, needsPlayoff: false }, podium: [{ team: '皇马', coach: '小明', rank: 1, needsPlayoff: false }, { team: '巴萨', coach: '小红', rank: 2, needsPlayoff: false }], topScorers: [], topAssists: [], fmvp: null } }),
    );
    const records = computeCoachRecords(world);
    const hong = records.coaches.find((coach) => coach.name === '小红');
    expect(hong.lastPlaces).toBe(2);
    expect(hong.bestFinish).toBe(2);
    expect(hong.worstFinish).toBe(2);
    expect(records.facts.map((fact) => fact.id)).toContain('fact-lastplace');
  });
});
