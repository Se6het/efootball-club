// 俱乐部元数据：中文名 → 队徽 CDN id + 主题配色。
// primary/secondary 用于行底色与徽章渐变，text 为底色上的文字色（保证对比度）。
// mark 是队徽图加载失败时的中文缩写兜底，crest 是 api-football 队徽图 id。

const CLUB_META = {
  皇家马德里: { mark: '皇马', crest: 541, primary: '#f5f6f8', secondary: '#c9a22b', text: '#1a1a2e' },
  巴塞罗那: { mark: '巴萨', crest: 529, primary: '#a50044', secondary: '#004d98', text: '#ffffff' },
  马德里竞技: { mark: '马竞', crest: 530, primary: '#cb3524', secondary: '#f2f2f2', text: '#ffffff' },
  塞维利亚: { mark: '塞维', crest: 536, primary: '#f2f3f6', secondary: '#e30613', text: '#1a1a2e' },
  皇家贝蒂斯: { mark: '贝蒂', crest: 544, primary: '#00954c', secondary: '#f2f2f2', text: '#ffffff' },
  巴伦西亚: { mark: '巴伦', crest: 532, primary: '#f2a100', secondary: '#1a1a1a', text: '#3a2a00' },
  比利亚雷亚尔: { mark: '黄潜', crest: 533, primary: '#f5c500', secondary: '#3b3f47', text: '#3a2a00' },
  皇家社会: { mark: '社会', crest: 548, primary: '#f0f4fa', secondary: '#0a4da3', text: '#1a2a4a' },
  毕尔巴鄂竞技: { mark: '雄狮', crest: 531, primary: '#e32636', secondary: '#f2f2f2', text: '#ffffff' },
  曼城: { mark: '曼城', crest: 50, primary: '#6caddf', secondary: '#f5f5f5', text: '#12324d' },
  曼联: { mark: '红魔', crest: 33, primary: '#e8261e', secondary: '#1a1a1a', text: '#ffffff' },
  利物浦: { mark: '红军', crest: 40, primary: '#c8102e', secondary: '#00b2a9', text: '#ffffff' },
  切尔西: { mark: '蓝军', crest: 49, primary: '#034694', secondary: '#f2f2f2', text: '#ffffff' },
  阿森纳: { mark: '枪手', crest: 42, primary: '#ef0107', secondary: '#f2f2f2', text: '#ffffff' },
  托特纳姆热刺: { mark: '热刺', crest: 47, primary: '#f2f2f2', secondary: '#0c2340', text: '#1a2a4a' },
  纽卡斯尔联: { mark: '喜鹊', crest: 34, primary: '#1a1a1a', secondary: '#f2f2f2', text: '#f2f2f2' },
  阿斯顿维拉: { mark: '维拉', crest: 66, primary: '#670e36', secondary: '#95bfe5', text: '#ffffff' },
  西汉姆联: { mark: '铁锤', crest: 48, primary: '#7a263a', secondary: '#1bb1e7', text: '#ffffff' },
  布莱顿: { mark: '海鸥', crest: 51, primary: '#0057b8', secondary: '#f2f2f2', text: '#ffffff' },
  尤文图斯: { mark: '尤文', crest: 496, primary: '#f2f2f2', secondary: '#0c0c0c', text: '#1a1a1a' },
  国际米兰: { mark: '国米', crest: 505, primary: '#0068a8', secondary: '#0d0d0d', text: '#ffffff' },
  AC米兰: { mark: '米兰', crest: 489, primary: '#e81b33', secondary: '#111111', text: '#ffffff' },
  那不勒斯: { mark: '天蓝', crest: 492, primary: '#12a0d7', secondary: '#f2f2f2', text: '#12324d' },
  罗马: { mark: '罗马', crest: 497, primary: '#8e1f2f', secondary: '#f2b91e', text: '#ffffff' },
  拉齐奥: { mark: '拉齐', crest: 487, primary: '#c0cad9', secondary: '#69b7e2', text: '#1a2a4a' },
  佛罗伦萨: { mark: '百合', crest: 494, primary: '#5a2d82', secondary: '#f2f2f2', text: '#ffffff' },
  亚特兰大: { mark: '亚特', crest: 499, primary: '#0b1f3a', secondary: '#1f5da8', text: '#ffffff' },
  拜仁慕尼黑: { mark: '拜仁', crest: 157, primary: '#dc052d', secondary: '#0066b2', text: '#ffffff' },
  多特蒙德: { mark: '多特', crest: 165, primary: '#fde100', secondary: '#111111', text: '#3a2a00' },
  勒沃库森: { mark: '药厂', crest: 168, primary: '#e32219', secondary: '#111111', text: '#ffffff' },
  法兰克福: { mark: '法兰', crest: 169, primary: '#f2f2f2', secondary: '#e7000f', text: '#1a1a2e' },
  莱比锡红牛: { mark: '红牛', crest: 173, primary: '#f2f2f2', secondary: '#d2042d', text: '#1a1a2e' },
  斯图加特: { mark: '斯图', crest: 172, primary: '#e8e8e8', secondary: '#a11f22', text: '#1a1a2e' },
  巴黎圣日耳曼: { mark: '巴黎', crest: 85, primary: '#004170', secondary: '#da291c', text: '#ffffff' },
  马赛: { mark: '马赛', crest: 81, primary: '#2faee0', secondary: '#f2f2f2', text: '#0f2b5e' },
  里昂: { mark: '里昂', crest: 80, primary: '#2e3a8c', secondary: '#e7131a', text: '#ffffff' },
  摩纳哥: { mark: '摩纳', crest: 91, primary: '#eaeaea', secondary: '#e62b3a', text: '#1a1a1a' },
  里尔: { mark: '里尔', crest: 79, primary: '#e01e35', secondary: '#0f4fa3', text: '#ffffff' },
  本菲卡: { mark: '本菲', crest: 211, primary: '#e8101f', secondary: '#f2f2f2', text: '#ffffff' },
  波尔图: { mark: '波尔', crest: 212, primary: '#0d3f8e', secondary: '#f2f2f2', text: '#ffffff' },
  阿贾克斯: { mark: '阿贾', crest: 94, primary: '#d31145', secondary: '#f2f2f2', text: '#ffffff' },
  埃因霍温: { mark: '埃因', crest: 674, primary: '#f2f2f2', secondary: '#dd1f2d', text: '#1a1a2e' },
  费耶诺德: { mark: '费耶', crest: 675, primary: '#ed1a3b', secondary: '#f2f2f2', text: '#ffffff' },
  凯尔特人: { mark: '凯尔', crest: 235, primary: '#018749', secondary: '#f2f2f2', text: '#ffffff' },
  格拉斯哥流浪者: { mark: '流浪', crest: 236, primary: '#f2f2f2', secondary: '#1a3f85', text: '#1a2a4a' },
};

// 常见中文别名 → 规范名，方便直接输入「皇马」「巴萨」这类简称。
// 徽章上的中文缩写（mark）也都收录在内，做到「徽章显示什么就能输什么」。
const ALIASES = {
  皇马: '皇家马德里',
  巴萨: '巴塞罗那',
  马竞: '马德里竞技',
  塞维: '塞维利亚',
  贝蒂斯: '皇家贝蒂斯',
  瓦伦西亚: '巴伦西亚',
  黄潜: '比利亚雷亚尔',
  毕尔巴鄂: '毕尔巴鄂竞技',
  雄狮: '毕尔巴鄂竞技',
  热刺: '托特纳姆热刺',
  托特纳姆: '托特纳姆热刺',
  纽卡: '纽卡斯尔联',
  纽卡斯尔: '纽卡斯尔联',
  喜鹊: '纽卡斯尔联',
  西汉姆: '西汉姆联',
  铁锤: '西汉姆联',
  尤文: '尤文图斯',
  国米: '国际米兰',
  米兰: 'AC米兰',
  拿波里: '那不勒斯',
  天蓝: '那不勒斯',
  紫百合: '佛罗伦萨',
  拜仁: '拜仁慕尼黑',
  多特: '多特蒙德',
  大黄蜂: '多特蒙德',
  药厂: '勒沃库森',
  法兰: '法兰克福',
  莱比锡: '莱比锡红牛',
  红牛: '莱比锡红牛',
  斯图: '斯图加特',
  巴黎: '巴黎圣日耳曼',
  大巴黎: '巴黎圣日耳曼',
  摩纳: '摩纳哥',
  本菲: '本菲卡',
  波尔: '波尔图',
  阿贾: '阿贾克斯',
  埃因: '埃因霍温',
  费耶: '费耶诺德',
  凯尔: '凯尔特人',
  流浪: '格拉斯哥流浪者',
  流浪者: '格拉斯哥流浪者',
  红魔: '曼联',
  红军: '利物浦',
  蓝军: '切尔西',
  枪手: '阿森纳',
  海鸥: '布莱顿',
  亚特: '亚特兰大',
  百合: '佛罗伦萨',
  社会: '皇家社会',
  拉齐: '拉齐奥',
};

for (const [alias, canonical] of Object.entries(ALIASES)) {
  CLUB_META[alias] = CLUB_META[canonical];
}

const DEFAULT_META = { mark: '', crest: null, primary: null, secondary: null, text: null };

// 归一化：去掉常见后缀，便于「皇家马德里队」匹配「皇家马德里」。
function normalizeName(name) {
  return String(name ?? '')
    .trim()
    .replace(/(足球)?队$|(足球)?俱乐部$/, '');
}

export function getTeamMeta(team) {
  const raw = String(team ?? '').trim();
  if (!raw) {
    return DEFAULT_META;
  }
  if (CLUB_META[raw]) {
    return CLUB_META[raw];
  }
  const normalized = normalizeName(raw);
  if (CLUB_META[normalized]) {
    return CLUB_META[normalized];
  }
  return DEFAULT_META;
}

export function teamPrimary(team) {
  return getTeamMeta(team).primary;
}

export function teamSecondary(team) {
  return getTeamMeta(team).secondary;
}

export function teamText(team) {
  return getTeamMeta(team).text;
}

export function teamMark(team) {
  return getTeamMeta(team).mark;
}

export function teamCrestCode(team) {
  return getTeamMeta(team).crest;
}

// api-football 队徽图；无 id 或未知球队返回空串（UI 降级为主题色圆徽）。
export function teamCrestUrl(team) {
  const crest = teamCrestCode(team);
  if (!crest) {
    return '';
  }
  return `https://media.api-sports.io/football/teams/${crest}.png`;
}

export function teamRowClass(team) {
  const mark = teamMark(team);
  if (!mark) {
    return '';
  }
  return `row-bg-${mark}`;
}

// 队徽图加载失败或离线时的中文缩写兜底。
export function getTeamMark(team) {
  return teamMark(team) || '⚽';
}

// 简称/后缀 → 规范全称：方便「皇马」「巴萨」等输入统一为「皇家马德里」「巴塞罗那」。
export function canonicalTeamName(team) {
  const raw = String(team ?? '').trim();
  if (!raw) {
    return '';
  }
  const meta = getTeamMeta(raw);
  if (meta === DEFAULT_META) {
    return raw;
  }
  return Object.keys(CLUB_META).find((key) => CLUB_META[key] === meta) ?? raw;
}

export { CLUB_META };
