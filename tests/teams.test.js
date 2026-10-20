import { describe, expect, it } from 'vitest';
import {
  CLUB_META,
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

describe('expanded club catalogue', () => {
  it('carries crest ids for the newly added clubs', () => {
    expect(teamCrestCode('埃弗顿')).toBe(45);
    expect(teamCrestCode('赫罗纳')).toBe(547);
    expect(teamCrestCode('博洛尼亚')).toBe(500);
    expect(teamCrestCode('门兴格拉德巴赫')).toBe(163);
    expect(teamCrestCode('里斯本竞技')).toBe(228);
    expect(teamCrestCode('博卡青年')).toBe(451);
    expect(teamCrestCode('利雅得新月')).toBe(2939);
  });

  it('resolves the new short names and nicknames', () => {
    expect(canonicalTeamName('太妃糖')).toBe('埃弗顿');
    expect(canonicalTeamName('圣徒')).toBe('南安普顿');
    expect(canonicalTeamName('狼堡')).toBe('沃尔夫斯堡');
    expect(canonicalTeamName('不莱梅')).toBe('云达不莱梅');
    expect(canonicalTeamName('葡萄牙体育')).toBe('里斯本竞技');
    expect(canonicalTeamName('新月')).toBe('利雅得新月');
  });

  it('exposes marks and row background classes for new clubs', () => {
    expect(getTeamMark('门兴格拉德巴赫')).toBe('门兴');
    expect(teamRowClass('埃弗顿')).toBe('row-bg-太妃');
    expect(teamRowClass('博卡青年')).toBe('row-bg-博卡');
  });
});

describe('中超 clubs', () => {
  it('carries real crest URLs from the football-logos catalogue', () => {
    expect(teamCrestUrl('上海海港')).toBe('https://assets.football-logos.cc/logos/china/512x512/shanghai-port.0aa038ca.png');
    expect(teamCrestUrl('北京国安')).toMatch(/^https:\/\/assets\.football-logos\.cc\/logos\/china\/512x512\/beijing-guoan\.[0-9a-f]+\.png$/);
    expect(teamCrestUrl('长春亚泰')).toContain('changchun-yatai');
  });

  it('resolves common Chinese short names and nicknames', () => {
    expect(canonicalTeamName('申花')).toBe('上海申花');
    expect(canonicalTeamName('鲁能')).toBe('山东泰山');
    expect(canonicalTeamName('国安')).toBe('北京国安');
    expect(canonicalTeamName('建业')).toBe('河南嵩山龙门');
    expect(canonicalTeamName('鹏城')).toBe('深圳新鹏城');
    expect(canonicalTeamName('铜梁')).toBe('重庆铜梁龙');
  });

  it('exposes marks and row background classes for CSL clubs', () => {
    expect(getTeamMark('上海海港')).toBe('海港');
    expect(getTeamMark('浙江队')).toBe('浙江');
    expect(teamRowClass('山东泰山')).toBe('row-bg-泰山');
    expect(teamRowClass('青岛西海岸')).toBe('row-bg-西海');
  });
});

describe('catalogue integrity', () => {
  const clubs = [];
  const seen = new Set();
  for (const meta of Object.values(CLUB_META)) {
    if (seen.has(meta)) {
      continue;
    }
    seen.add(meta);
    clubs.push(meta);
  }

  it('lists a large catalogue of clubs', () => {
    expect(clubs.length).toBeGreaterThanOrEqual(100);
  });

  it('gives every club a crest and a non-empty mark', () => {
    for (const meta of clubs) {
      const crestOk = typeof meta.crest === 'number'
        ? meta.crest > 0
        : typeof meta.crest === 'string' && meta.crest.startsWith('https://');
      expect(crestOk).toBe(true);
      expect(meta.mark.length).toBeGreaterThan(0);
    }
  });

  it('keeps every club mark unique', () => {
    const marks = clubs.map((meta) => meta.mark);
    expect(new Set(marks).size).toBe(marks.length);
  });

  it('makes every mark typeable and resolvable back to its club', () => {
    for (const meta of clubs) {
      expect(CLUB_META[meta.mark]).toBe(meta);
      expect(CLUB_META[canonicalTeamName(meta.mark)]).toBe(meta);
    }
  });
});
