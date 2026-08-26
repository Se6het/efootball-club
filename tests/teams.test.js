import { describe, expect, it } from 'vitest';
import {
  canonicalTeamName,
  getTeamMeta,
  getTeamMark,
  teamCrestCode,
  teamCrestUrl,
  teamPrimary,
  teamSecondary,
  teamRowClass,
  teamText,
} from '../src/teams.js';

describe('getTeamMeta', () => {
  it('returns metadata for a known club', () => {
    const meta = getTeamMeta('皇家马德里');
    expect(meta.mark).toBe('皇马');
    expect(meta.crest).toBe(541);
    expect(meta.primary).toBe('#f5f6f8');
    expect(meta.text).toBe('#1a1a2e');
  });

  it('matches a common Chinese alias (皇马 → 皇家马德里)', () => {
    const meta = getTeamMeta('皇马');
    expect(meta.crest).toBe(541);
    expect(meta.mark).toBe('皇马');
  });

  it('matches by normalized prefix (皇家马德里队 → 皇家马德里)', () => {
    const meta = getTeamMeta('皇家马德里队');
    expect(meta.crest).toBe(541);
  });

  it('matches with the football club suffix (利物浦足球俱乐部 → 利物浦)', () => {
    const meta = getTeamMeta('利物浦足球俱乐部');
    expect(meta.crest).toBe(40);
  });

  it('returns default meta for unknown teams', () => {
    const meta = getTeamMeta('自定义球队');
    expect(meta).toEqual({ mark: '', crest: null, primary: null, secondary: null, text: null });
  });

  it('returns default meta for empty input', () => {
    expect(getTeamMeta('')).toEqual({ mark: '', crest: null, primary: null, secondary: null, text: null });
    expect(getTeamMeta(undefined)).toEqual({ mark: '', crest: null, primary: null, secondary: null, text: null });
  });
});

describe('team accessors', () => {
  it('returns color values for known clubs', () => {
    expect(teamPrimary('巴塞罗那')).toBe('#a50044');
    expect(teamSecondary('巴塞罗那')).toBe('#004d98');
    expect(teamText('巴塞罗那')).toBe('#ffffff');
  });

  it('returns null colors for unknown teams', () => {
    expect(teamPrimary('火星队')).toBeNull();
    expect(teamText('火星队')).toBeNull();
  });
});

describe('teamCrestUrl', () => {
  it('builds an api-football crest URL from the team id', () => {
    expect(teamCrestUrl('皇家马德里')).toBe('https://media.api-sports.io/football/teams/541.png');
  });

  it('returns empty string for unknown teams', () => {
    expect(teamCrestUrl('未知队')).toBe('');
  });

  it('exposes the crest code separately', () => {
    expect(teamCrestCode('拜仁慕尼黑')).toBe(157);
  });
});

describe('teamRowClass', () => {
  it('derives a row class from the club mark', () => {
    expect(teamRowClass('皇家马德里')).toBe('row-bg-皇马');
    expect(teamRowClass('巴塞罗那')).toBe('row-bg-巴萨');
  });

  it('returns empty class for unknown teams', () => {
    expect(teamRowClass('未知队')).toBe('');
  });
});

describe('getTeamMark', () => {
  it('returns the Chinese abbreviation for known clubs', () => {
    expect(getTeamMark('利物浦')).toBe('红军');
    expect(getTeamMark('曼城')).toBe('曼城');
  });

  it('falls back to a football for unknown teams', () => {
    expect(getTeamMark('未知队')).toBe('⚽');
  });
});

describe('canonicalTeamName', () => {
  it('resolves aliases to the canonical full name', () => {
    expect(canonicalTeamName('皇马')).toBe('皇家马德里');
    expect(canonicalTeamName('巴萨')).toBe('巴塞罗那');
    expect(canonicalTeamName('米兰')).toBe('AC米兰');
  });

  it('normalizes suffixes to the canonical name', () => {
    expect(canonicalTeamName('皇家马德里队')).toBe('皇家马德里');
    expect(canonicalTeamName('利物浦足球俱乐部')).toBe('利物浦');
  });

  it('keeps unknown teams as typed', () => {
    expect(canonicalTeamName('自定义队')).toBe('自定义队');
  });

  it('keeps empty input empty', () => {
    expect(canonicalTeamName('')).toBe('');
    expect(canonicalTeamName(undefined)).toBe('');
  });
});
