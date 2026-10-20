// 俱乐部元数据：中文名 → 队徽 CDN id + 主题配色。
// primary/secondary 用于行底色与徽章渐变，text 为底色上的文字色（保证对比度）。
// mark 是队徽图加载失败时的中文缩写兜底，crest 通常是 api-football 队徽图 id；
// 中超在 api-football 没有稳定 id，crest 直接放名称化的 football-logos 图片 URL。

const CSL_CREST_BASE = 'https://assets.football-logos.cc/logos/china/512x512';

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

  // 英超
  埃弗顿: { mark: '太妃', crest: 45, primary: '#0a3f8f', secondary: '#f2f2f2', text: '#ffffff' },
  莱斯特城: { mark: '狐狸', crest: 46, primary: '#0b3a8c', secondary: '#fdbe11', text: '#ffffff' },
  狼队: { mark: '狼队', crest: 39, primary: '#fdb913', secondary: '#231f20', text: '#3a2a00' },
  水晶宫: { mark: '老鹰', crest: 52, primary: '#1b458f', secondary: '#c4122e', text: '#ffffff' },
  富勒姆: { mark: '农场', crest: 36, primary: '#f2f2f2', secondary: '#1a1a1a', text: '#1a1a2e' },
  诺丁汉森林: { mark: '森林', crest: 65, primary: '#d71920', secondary: '#f2f2f2', text: '#ffffff' },
  伯恩茅斯: { mark: '樱桃', crest: 35, primary: '#d71920', secondary: '#1a1a1a', text: '#ffffff' },
  布伦特福德: { mark: '蜜蜂', crest: 55, primary: '#e30613', secondary: '#f2f2f2', text: '#ffffff' },
  南安普顿: { mark: '圣徒', crest: 41, primary: '#d71920', secondary: '#f2f2f2', text: '#ffffff' },
  利兹联: { mark: '利兹', crest: 63, primary: '#f2f2f2', secondary: '#1d428a', text: '#1a2a4a' },
  谢菲尔德联: { mark: '谢联', crest: 62, primary: '#e2001a', secondary: '#1a1a1a', text: '#ffffff' },
  伯恩利: { mark: '伯恩', crest: 44, primary: '#6c1d45', secondary: '#99d6ea', text: '#ffffff' },
  沃特福德: { mark: '沃特', crest: 38, primary: '#fbee23', secondary: '#1a1a1a', text: '#3a2a00' },

  // 西甲
  赫罗纳: { mark: '赫罗', crest: 547, primary: '#cd2534', secondary: '#f2f2f2', text: '#ffffff' },
  奥萨苏纳: { mark: '奥萨', crest: 727, primary: '#d91a21', secondary: '#0a3463', text: '#ffffff' },
  塞尔塔: { mark: '塞尔', crest: 538, primary: '#8ac3ee', secondary: '#f2f2f2', text: '#12324d' },
  赫塔菲: { mark: '赫塔', crest: 546, primary: '#005999', secondary: '#f2f2f2', text: '#ffffff' },
  阿拉维斯: { mark: '阿拉', crest: 542, primary: '#0f4f9e', secondary: '#f2f2f2', text: '#ffffff' },
  马略卡: { mark: '马略', crest: 798, primary: '#e20613', secondary: '#1a1a1a', text: '#ffffff' },
  巴列卡诺: { mark: '巴列', crest: 728, primary: '#f2f2f2', secondary: '#e2001a', text: '#1a1a2e' },
  西班牙人: { mark: '西班', crest: 540, primary: '#0072bc', secondary: '#f2f2f2', text: '#ffffff' },
  加的斯: { mark: '加的', crest: 724, primary: '#f7d417', secondary: '#0a4da3', text: '#3a2a00' },
  格拉纳达: { mark: '格拉', crest: 715, primary: '#c8102e', secondary: '#f2f2f2', text: '#ffffff' },
  阿尔梅里亚: { mark: '阿尔', crest: 723, primary: '#d3212c', secondary: '#f2f2f2', text: '#ffffff' },

  // 意甲
  博洛尼亚: { mark: '博洛', crest: 500, primary: '#a21c26', secondary: '#1b2a55', text: '#ffffff' },
  都灵: { mark: '都灵', crest: 503, primary: '#8a1e2d', secondary: '#f2f2f2', text: '#ffffff' },
  萨索洛: { mark: '萨索', crest: 502, primary: '#00a752', secondary: '#1a1a1a', text: '#ffffff' },
  热那亚: { mark: '热那', crest: 495, primary: '#a01e2f', secondary: '#1a2a5e', text: '#ffffff' },
  蒙扎: { mark: '蒙扎', crest: 490, primary: '#e30613', secondary: '#f2f2f2', text: '#ffffff' },
  维罗纳: { mark: '维罗', crest: 504, primary: '#f6c500', secondary: '#1a2a5e', text: '#3a2a00' },
  恩波利: { mark: '恩波', crest: 511, primary: '#1462a8', secondary: '#f2f2f2', text: '#ffffff' },
  卡利亚里: { mark: '卡利', crest: 510, primary: '#b21e2a', secondary: '#1a2a5e', text: '#ffffff' },
  莱切: { mark: '莱切', crest: 521, primary: '#f7d417', secondary: '#d3212c', text: '#3a2a00' },

  // 德甲
  门兴格拉德巴赫: { mark: '门兴', crest: 163, primary: '#f2f2f2', secondary: '#1a1a1a', text: '#1a1a2e' },
  沃尔夫斯堡: { mark: '狼堡', crest: 161, primary: '#65b32e', secondary: '#f2f2f2', text: '#12320f' },
  弗赖堡: { mark: '弗赖', crest: 160, primary: '#f2f2f2', secondary: '#e2001a', text: '#1a1a2e' },
  霍芬海姆: { mark: '霍芬', crest: 167, primary: '#1c63b7', secondary: '#f2f2f2', text: '#ffffff' },
  美因茨: { mark: '美因', crest: 164, primary: '#c3141e', secondary: '#f2f2f2', text: '#ffffff' },
  奥格斯堡: { mark: '奥格', crest: 170, primary: '#ba3733', secondary: '#f2f2f2', text: '#ffffff' },
  云达不莱梅: { mark: '不莱', crest: 162, primary: '#1d9053', secondary: '#f2f2f2', text: '#ffffff' },
  柏林联合: { mark: '柏林', crest: 182, primary: '#eb1923', secondary: '#f2f2f2', text: '#ffffff' },
  波鸿: { mark: '波鸿', crest: 176, primary: '#005ca9', secondary: '#f2f2f2', text: '#ffffff' },
  海登海姆: { mark: '海登', crest: 180, primary: '#e30613', secondary: '#1a2a5e', text: '#ffffff' },

  // 法甲
  尼斯: { mark: '尼斯', crest: 84, primary: '#e2001a', secondary: '#1a1a1a', text: '#ffffff' },
  朗斯: { mark: '朗斯', crest: 116, primary: '#d3212c', secondary: '#f7c500', text: '#ffffff' },
  雷恩: { mark: '雷恩', crest: 82, primary: '#e2001a', secondary: '#1a1a1a', text: '#ffffff' },
  南特: { mark: '南特', crest: 83, primary: '#f7d417', secondary: '#00843d', text: '#3a2a00' },
  蒙彼利埃: { mark: '蒙彼', crest: 89, primary: '#0a4da3', secondary: '#f5820b', text: '#ffffff' },
  图卢兹: { mark: '图卢', crest: 96, primary: '#5f259f', secondary: '#f2f2f2', text: '#ffffff' },
  兰斯: { mark: '兰斯', crest: 93, primary: '#e2001a', secondary: '#f2f2f2', text: '#ffffff' },
  斯特拉斯堡: { mark: '斯特', crest: 95, primary: '#0a4da3', secondary: '#f2f2f2', text: '#ffffff' },
  布雷斯特: { mark: '布雷', crest: 106, primary: '#d3212c', secondary: '#f2f2f2', text: '#ffffff' },
  欧塞尔: { mark: '欧塞', crest: 108, primary: '#0a4da3', secondary: '#f2f2f2', text: '#ffffff' },

  // 葡超
  里斯本竞技: { mark: '里斯', crest: 228, primary: '#00843d', secondary: '#f2f2f2', text: '#ffffff' },
  布拉加: { mark: '布拉', crest: 229, primary: '#d3212c', secondary: '#f2f2f2', text: '#ffffff' },

  // 土超
  贝西克塔斯: { mark: '贝西', crest: 610, primary: '#1a1a1a', secondary: '#f2f2f2', text: '#f2f2f2' },
  费内巴切: { mark: '费内', crest: 611, primary: '#f7d417', secondary: '#0a3463', text: '#3a2a00' },
  加拉塔萨雷: { mark: '加拉', crest: 645, primary: '#a90432', secondary: '#f7b500', text: '#ffffff' },

  // 比甲
  布鲁日: { mark: '布鲁', crest: 448, primary: '#0a4da3', secondary: '#1a1a1a', text: '#ffffff' },
  安德莱赫特: { mark: '安德', crest: 449, primary: '#5f259f', secondary: '#f2f2f2', text: '#ffffff' },

  // 俄超
  圣彼得堡泽尼特: { mark: '泽尼', crest: 600, primary: '#0a3d91', secondary: '#7ac3ee', text: '#ffffff' },

  // 巴甲
  弗拉门戈: { mark: '弗拉', crest: 127, primary: '#d3212c', secondary: '#1a1a1a', text: '#ffffff' },
  帕尔梅拉斯: { mark: '帕尔', crest: 121, primary: '#006b3f', secondary: '#f2f2f2', text: '#ffffff' },
  桑托斯: { mark: '桑托', crest: 128, primary: '#f2f2f2', secondary: '#1a1a1a', text: '#1a1a2e' },

  // 阿甲
  博卡青年: { mark: '博卡', crest: 451, primary: '#f7c500', secondary: '#0a3463', text: '#3a2a00' },
  河床: { mark: '河床', crest: 435, primary: '#f2f2f2', secondary: '#e2001a', text: '#1a1a2e' },

  // 美职联 / 沙特
  迈阿密国际: { mark: '迈阿', crest: 1354, primary: '#f7b5cd', secondary: '#1a1a1a', text: '#4a1226' },
  利雅得胜利: { mark: '胜利', crest: 2932, primary: '#f7c500', secondary: '#0a4da3', text: '#3a2a00' },
  利雅得新月: { mark: '新月', crest: 2939, primary: '#0a4da3', secondary: '#f2f2f2', text: '#ffffff' },

  // 中超
  上海海港: { mark: '海港', crest: `${CSL_CREST_BASE}/shanghai-port.0aa038ca.png`, primary: '#d21f2b', secondary: '#f2f2f2', text: '#ffffff' },
  上海申花: { mark: '申花', crest: `${CSL_CREST_BASE}/shanghai-shenhua.cbc94596.png`, primary: '#1a4fa0', secondary: '#f2f2f2', text: '#ffffff' },
  山东泰山: { mark: '泰山', crest: `${CSL_CREST_BASE}/shandong-taishan.a66e8c94.png`, primary: '#e8760e', secondary: '#1a1a1a', text: '#3a2a00' },
  北京国安: { mark: '国安', crest: `${CSL_CREST_BASE}/beijing-guoan.1df87f4d.png`, primary: '#0a8f4a', secondary: '#f2f2f2', text: '#ffffff' },
  成都蓉城: { mark: '蓉城', crest: `${CSL_CREST_BASE}/chengdu-rongcheng.2bc45ba4.png`, primary: '#d71920', secondary: '#f2f2f2', text: '#ffffff' },
  武汉三镇: { mark: '三镇', crest: `${CSL_CREST_BASE}/wuhan-three-towns.6be65d9a.png`, primary: '#0f5fa6', secondary: '#f2f2f2', text: '#ffffff' },
  浙江队: { mark: '浙江', crest: `${CSL_CREST_BASE}/zhejiang-professional.4f74e6f0.png`, primary: '#0f7a3d', secondary: '#f2f2f2', text: '#ffffff' },
  天津津门虎: { mark: '津门', crest: `${CSL_CREST_BASE}/tianjin-jinmen-tiger.0607a525.png`, primary: '#0a4da3', secondary: '#f2f2f2', text: '#ffffff' },
  河南嵩山龙门: { mark: '河南', crest: `${CSL_CREST_BASE}/henan-songshan-longmen.3cd0d41d.png`, primary: '#cf1d2e', secondary: '#f2f2f2', text: '#ffffff' },
  青岛海牛: { mark: '海牛', crest: `${CSL_CREST_BASE}/qingdao-hainiu.c30126cd.png`, primary: '#12a0d7', secondary: '#f2f2f2', text: '#12324d' },
  青岛西海岸: { mark: '西海', crest: `${CSL_CREST_BASE}/qingdao-west-coast.6d386f2c.png`, primary: '#f5c500', secondary: '#0a4da3', text: '#3a2a00' },
  大连英博: { mark: '英博', crest: `${CSL_CREST_BASE}/dalian-yingbo.69d1000a.png`, primary: '#0a3f8f', secondary: '#f2f2f2', text: '#ffffff' },
  云南玉昆: { mark: '玉昆', crest: `${CSL_CREST_BASE}/yunnan-yukun.1030dde0.png`, primary: '#c8102e', secondary: '#f2f2f2', text: '#ffffff' },
  深圳新鹏城: { mark: '深圳', crest: `${CSL_CREST_BASE}/shenzhen-xinpengcheng.adc9e767.png`, primary: '#1a4fa0', secondary: '#f2f2f2', text: '#ffffff' },
  辽宁铁人: { mark: '铁人', crest: `${CSL_CREST_BASE}/liaoning-tiening.2898060b.png`, primary: '#8e1f2f', secondary: '#f2f2f2', text: '#ffffff' },
  重庆铜梁龙: { mark: '铜梁', crest: `${CSL_CREST_BASE}/chongqing-tonglianglong.53547953.png`, primary: '#cf1d2e', secondary: '#f2f2f2', text: '#ffffff' },
  梅州客家: { mark: '梅州', crest: `${CSL_CREST_BASE}/meizhou-hakka.2e5499a2.png`, primary: '#f5c500', secondary: '#1a7d3c', text: '#3a2a00' },
  长春亚泰: { mark: '亚泰', crest: `${CSL_CREST_BASE}/changchun-yatai.73366586.png`, primary: '#0a4da3', secondary: '#f2f2f2', text: '#ffffff' },
};

// 常见中文别名 → 规范名，方便直接输入「皇马」「巴萨」这类简称。
// 徽章上的中文缩写（mark）也都收录在内，做到「徽章显示什么就能输什么」。
const ALIASES = {
  皇马: '皇家马德里',
  巴萨: '巴塞罗那',
  马竞: '马德里竞技',
  塞维: '塞维利亚',
  贝蒂斯: '皇家贝蒂斯',
  贝蒂: '皇家贝蒂斯',
  瓦伦西亚: '巴伦西亚',
  巴伦: '巴伦西亚',
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
  维拉: '阿斯顿维拉',
  阿斯顿: '阿斯顿维拉',
  太妃: '埃弗顿',
  太妃糖: '埃弗顿',
  狐狸: '莱斯特城',
  莱斯特: '莱斯特城',
  伍尔弗汉普顿: '狼队',
  老鹰: '水晶宫',
  农场: '富勒姆',
  森林: '诺丁汉森林',
  诺丁汉: '诺丁汉森林',
  樱桃: '伯恩茅斯',
  蜜蜂: '布伦特福德',
  圣徒: '南安普顿',
  南安普敦: '南安普顿',
  利兹: '利兹联',
  谢联: '谢菲尔德联',
  谢菲联: '谢菲尔德联',
  伯恩: '伯恩利',
  沃特: '沃特福德',
  赫罗: '赫罗纳',
  奥萨: '奥萨苏纳',
  塞尔: '塞尔塔',
  维戈塞尔塔: '塞尔塔',
  赫塔: '赫塔菲',
  阿拉: '阿拉维斯',
  马略: '马略卡',
  巴列: '巴列卡诺',
  西班: '西班牙人',
  加的: '加的斯',
  格拉: '格拉纳达',
  阿尔: '阿尔梅里亚',
  博洛: '博洛尼亚',
  萨索: '萨索洛',
  热那: '热那亚',
  维罗: '维罗纳',
  恩波: '恩波利',
  卡利: '卡利亚里',
  门兴: '门兴格拉德巴赫',
  狼堡: '沃尔夫斯堡',
  弗赖: '弗赖堡',
  霍芬: '霍芬海姆',
  美因: '美因茨',
  奥格: '奥格斯堡',
  不莱: '云达不莱梅',
  不莱梅: '云达不莱梅',
  云达不来梅: '云达不莱梅',
  柏林: '柏林联合',
  海登: '海登海姆',
  蒙彼: '蒙彼利埃',
  图卢: '图卢兹',
  斯特: '斯特拉斯堡',
  布雷: '布雷斯特',
  欧塞: '欧塞尔',
  里斯: '里斯本竞技',
  葡萄牙体育: '里斯本竞技',
  布拉: '布拉加',
  贝西: '贝西克塔斯',
  费内: '费内巴切',
  加拉: '加拉塔萨雷',
  布鲁: '布鲁日',
  安德: '安德莱赫特',
  泽尼: '圣彼得堡泽尼特',
  泽尼特: '圣彼得堡泽尼特',
  弗拉: '弗拉门戈',
  帕尔: '帕尔梅拉斯',
  桑托: '桑托斯',
  博卡: '博卡青年',
  迈阿: '迈阿密国际',
  国际迈阿密: '迈阿密国际',
  胜利: '利雅得胜利',
  新月: '利雅得新月',
  海港: '上海海港',
  上港: '上海海港',
  申花: '上海申花',
  泰山: '山东泰山',
  鲁能: '山东泰山',
  山东: '山东泰山',
  国安: '北京国安',
  北京: '北京国安',
  蓉城: '成都蓉城',
  成都: '成都蓉城',
  三镇: '武汉三镇',
  武汉: '武汉三镇',
  浙江: '浙江队',
  津门: '天津津门虎',
  天津: '天津津门虎',
  泰达: '天津津门虎',
  河南: '河南嵩山龙门',
  建业: '河南嵩山龙门',
  嵩山龙门: '河南嵩山龙门',
  海牛: '青岛海牛',
  西海: '青岛西海岸',
  西海岸: '青岛西海岸',
  英博: '大连英博',
  大连: '大连英博',
  玉昆: '云南玉昆',
  云南: '云南玉昆',
  深圳: '深圳新鹏城',
  鹏城: '深圳新鹏城',
  铁人: '辽宁铁人',
  辽宁: '辽宁铁人',
  铜梁: '重庆铜梁龙',
  重庆: '重庆铜梁龙',
  梅州: '梅州客家',
  客家: '梅州客家',
  亚泰: '长春亚泰',
  长春: '长春亚泰',
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

// api-football 队徽图；crest 为完整 URL 时直接使用；无队徽或未知球队返回空串（UI 降级为主题色圆徽）。
export function teamCrestUrl(team) {
  const crest = teamCrestCode(team);
  if (!crest) {
    return '';
  }
  if (typeof crest === 'string') {
    return crest;
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
