// 临时预览脚本：用 jsdom 真实渲染各标签页，检查结构、有无 undefined/NaN。--no-save 安装，不入库。
import { JSDOM } from 'jsdom';
import { writeFileSync } from 'node:fs';

const dom = new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>', {
  url: 'https://example.com/',
  pretendToBeVisual: true,
});
const { window } = dom;

global.window = window;
global.document = window.document;
global.localStorage = window.localStorage;
global.Blob = window.Blob;
global.URL = window.URL;
global.alert = () => {};
global.confirm = () => true;
global.requestAnimationFrame = window.requestAnimationFrame.bind(window);
global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

function match(id, matchNumber, round, homeTeam, awayTeam, homeGoals, awayGoals, isPlayed, extra = {}) {
  return {
    id,
    matchNumber,
    round,
    homeTeam,
    awayTeam,
    homeGoals,
    awayGoals,
    isPlayed,
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

const matches = [
  match('m-1', 1, 1, '皇家马德里', '巴塞罗那', 2, 1, true, {
    homeScorers: [{ name: '维尼修斯', count: 1 }, { name: '贝林厄姆', count: 1 }],
    awayScorers: [{ name: '莱万多夫斯基', count: 1 }],
    homeAssists: [{ name: '贝林厄姆', count: 1 }],
    homePlayerCards: [{ name: '卡瓦哈尔', yellow: 1, red: 0 }],
    homeCards: { yellow: 1, red: 0 },
    mvp: { name: '贝林厄姆', team: '皇家马德里', score: 8.6 },
  }),
  match('m-2', 2, 1, '拜仁慕尼黑', '上海海港', 3, 2, true, {
    homeScorers: [{ name: '凯恩', count: 2 }, { name: '穆西亚拉', count: 1 }],
    awayScorers: [{ name: '哈兰德', count: 2 }],
    homeAssists: [{ name: '凯恩', count: 1 }],
    awayAssists: [{ name: '德布劳内', count: 1 }],
    mvp: { name: '凯恩', team: '拜仁慕尼黑', score: 8.9 },
  }),
  match('m-3', 3, 2, '巴塞罗那', '皇家马德里', 1, 2, true, {
    homeScorers: [{ name: '莱万多夫斯基', count: 1 }],
    awayScorers: [{ name: '维尼修斯', count: 2 }],
    awayAssists: [{ name: '贝林厄姆', count: 1 }],
    mvp: { name: '维尼修斯', team: '皇家马德里', score: 8.3 },
  }),
  match('m-4', 4, 2, '上海海港', '拜仁慕尼黑', 2, 2, true, {
    homeScorers: [{ name: '哈兰德', count: 2 }],
    awayScorers: [{ name: '凯恩', count: 1 }, { name: '穆西亚拉', count: 1 }],
    homeAssists: [{ name: '德布劳内', count: 1 }],
    awayAssists: [{ name: '凯恩', count: 1 }],
    mvp: { name: '哈兰德', team: '上海海港', score: 8.4 },
  }),
  match('m-5', 5, 3, '皇家马德里', '巴塞罗那', 0, 0, false),
  match('m-6', 6, 3, '拜仁慕尼黑', '上海海港', 0, 0, false),
  match('m-7', 7, 4, '皇家马德里', '上海海港', 0, 0, false),
  match('m-8', 8, 4, '拜仁慕尼黑', '巴塞罗那', 0, 0, false),
  match('m-9', 9, 5, '上海海港', '皇家马德里', 0, 0, false),
  match('m-10', 10, 5, '巴塞罗那', '拜仁慕尼黑', 0, 0, false),
];

const state = {
  version: 1,
  createdAt: new Date().toISOString(),
  config: {
    playerA: '小明',
    playerB: '小红',
    teamsA: ['皇家马德里', '拜仁慕尼黑'],
    teamsB: ['巴塞罗那', '上海海港'],
    matchesPerPair: 2,
  },
  awards: {
    firstPlace: 300, secondPlace: 200, thirdPlace: 100,
    topScorer: 50, topAssist: 40, fmvp: 80, fmvpPlayerName: '', fmvpTeam: '',
  },
  matches,
};

window.localStorage.setItem('efootball-league:club:v1', JSON.stringify(state));

const world = {
  version: 1,
  seasons: [
    {
      id: 's-1', sourceId: 'src-1', label: '小明 vs 小红', archivedAt: '2026-09-01T10:00:00.000Z', complete: true,
      coaches: ['小明', '小红'], playedMatches: 4, totalMatches: 4,
      standings: [
        { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false, played: 4, wins: 3, draws: 0, losses: 1, goalsFor: 8, goalsAgainst: 4, goalDifference: 4, points: 9 },
        { team: '巴塞罗那', coach: '小红', rank: 2, needsPlayoff: false, played: 4, wins: 1, draws: 0, losses: 3, goalsFor: 4, goalsAgainst: 8, goalDifference: -4, points: 3 },
      ],
      awards: {
        champion: { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
        podium: [
          { team: '皇家马德里', coach: '小明', rank: 1, needsPlayoff: false },
          { team: '巴塞罗那', coach: '小红', rank: 2, needsPlayoff: false },
        ],
        topScorers: [{ name: '维尼修斯', team: '皇家马德里', coach: '小明', goals: 5 }],
        topAssists: [{ name: '贝林厄姆', team: '皇家马德里', coach: '小明', assists: 4 }],
        fmvp: { name: '维尼修斯', team: '皇家马德里', coach: '小明', prize: 80 },
      },
      h2h: { played: 4, winsA: 3, draws: 0, winsB: 1, goalsA: 8, goalsB: 4, biggestMargin: { diff: 3, score: '4-1', coach: '小明', winner: '皇家马德里', loser: '巴塞罗那' } },
    },
    {
      id: 's-2', sourceId: 'src-2', label: '小红 vs 小刚', archivedAt: '2026-10-01T10:00:00.000Z', complete: false,
      coaches: ['小红', '小刚'], playedMatches: 2, totalMatches: 6,
      standings: [
        { team: '上海海港', coach: '小红', rank: 1, needsPlayoff: false, played: 2, wins: 2, draws: 0, losses: 0, goalsFor: 5, goalsAgainst: 2, goalDifference: 3, points: 6 },
        { team: '拜仁慕尼黑', coach: '小刚', rank: 2, needsPlayoff: false, played: 2, wins: 0, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: -3, points: 0 },
      ],
      awards: { champion: null, podium: [], topScorers: [], topAssists: [], fmvp: null },
      h2h: { played: 2, winsA: 2, draws: 0, winsB: 0, goalsA: 5, goalsB: 2, biggestMargin: { diff: 2, score: '3-1', coach: '小红', winner: '上海海港', loser: '拜仁慕尼黑' } },
    },
  ],
};
window.localStorage.setItem('efootball-league:world:v1', JSON.stringify(world));

await import('./src/main.js');

const captures = {};
const app = window.document.querySelector('#app');
const dashboardHtml = app.innerHTML;
captures['一-总览四宫格'] = dashboardHtml;

function tileByTitle(title) {
  return [...app.querySelectorAll('.tile')]
    .find((node) => node.querySelector('.tile-title')?.textContent.trim() === title);
}

function openTile(title) {
  const tile = tileByTitle(title);
  if (!tile) throw new Error(`tile not found: ${title}`);
  tile.click();
  return app.innerHTML;
}

function goBack() {
  const button = app.querySelector('.back-button');
  if (!button) throw new Error('back button not found');
  button.click();
}

captures['二-赛程详情'] = openTile('赛程');
goBack();

captures['三-球队榜详情'] = openTile('球队榜');
// 打开球队详情弹窗（含近期战绩 + 未来赛程）
const teamLink = app.querySelector('.team-link');
teamLink.click();
captures['四-球队详情弹窗'] = window.document.querySelector('.modal')?.outerHTML ?? '(no modal)';
window.document.querySelector('.modal-close')?.click();
goBack();

captures['五-球员榜详情'] = openTile('球员榜');
// 打开球员详情弹窗（含全部场次）
const playerLink = app.querySelector('.player-link');
playerLink.click();
captures['六-球员详情弹窗'] = window.document.querySelector('.modal')?.outerHTML ?? '(no modal)';
window.document.querySelector('.modal-close')?.click();
goBack();

captures['七-下一场详情'] = openTile('下一场');
// 打开比赛录入弹窗（含历史交锋）
const editButton = [...app.querySelectorAll('button')].find((button) => button.textContent.includes('录入比分'));
editButton.click();
captures['八-录入比分弹窗'] = window.document.querySelector('.modal')?.outerHTML ?? '(no modal)';
window.document.querySelector('.modal-close')?.click();
goBack();

captures['九-新闻详情'] = openTile('新闻');
goBack();

// 足球世界 · 档案：从联赛页的「足球世界」横幅进入，再点「归档本赛季」看归档后的状态。
const archiveButton = [...app.querySelectorAll('button')].find((button) => button.textContent.includes('进入足球世界'));
if (!archiveButton) throw new Error('archive button not found');
archiveButton.click();
captures['十-世界档案'] = app.innerHTML;
const archiveCurrentButton = [...app.querySelectorAll('button')].find((button) => button.textContent.trim() === '归档本赛季');
if (archiveCurrentButton) {
  archiveCurrentButton.click();
  captures['十一-归档后的世界档案'] = app.innerHTML;
}
const archiveBack = [...app.querySelectorAll('button')].find((button) => button.textContent.includes('返回'));
if (archiveBack) archiveBack.click();

const firstRender = { innerHTML: dashboardHtml };
const tileTitles = [...firstRender.innerHTML.matchAll(/tile-title">([^<]*)</g)].map((match) => match[1]);
console.log('\n四宫格格子顺序:', tileTitles.join(' / ') || '(none)');
console.log('旧标签页 .tab 残留:', firstRender.innerHTML.includes('class="tab"') ? '有 ⚠' : '无 ✓');

let report = '';
for (const [name, html] of Object.entries(captures)) {
  const flags = [];
  if (/undefined/.test(html)) flags.push('含 undefined');
  if (/NaN/.test(html)) flags.push('含 NaN');
  if (/\[object /.test(html)) flags.push('含 [object ...]');
  report += `\n### ${name}  (${html.length} chars)${flags.length ? '  ⚠ ' + flags.join(',') : '  ✓'}\n`;
  report += `  key markers: ` + ['tile', 'mini-versus', 'mini-fix', 'mini-row', 'mini-news', 'team-crest', 'team-link', 'player-link', 'points-chip', 'form-pill', 'h2h-chip', 'h2h-meeting', 'rank-num-medal', 'form-summary-pill', 'upcoming-row', 'row-idle', 'stat-tile-goals', 'news-view', 'news-card', 'odds-table', 'odd-value', 'shanghai-port', 'row-bg-海港', 'world-strip', 'world-hero', 'archive-panel', 'archive-current', 'arc-overview', 'arc-tile', 'arc-wdl', 'arc-season-log', 'season-table', 'honor-title', 'club-chip', 'arc-rank', 'season-card', 'season-badge', 'coach-card', 'coach-pick', 'fact-row', 'coach-rivals']
    .filter((marker) => html.includes(marker))
    .join(', ') + '\n';
  if (html.includes('team-avatar')) report += '  ⚠ 仍出现旧队徽外圈类 team-avatar\n';
}
console.log(report);

// 预览产物写在 efootball-club-main 的上一级，样式表按相对路径引用。
const CSS_HREF = './efootball-club-main/styles.css';
const fullDoc = (body) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="${CSS_HREF}"></head><body>${body}</body></html>`;
writeFileSync('/home/linux/efootball/preview-league.html', fullDoc(dashboardHtml));
writeFileSync('/home/linux/efootball/preview-captures.html', fullDoc(
  `<style>
     body { margin: 0; padding: 28px 20px 60px; }
     .cap-sec { max-width: 980px; margin: 0 auto 34px; }
     .cap-sec > h1 { font-size: 15px; letter-spacing: .5px; color: var(--muted); margin: 0 0 10px; padding-bottom: 8px; border-bottom: 2px dashed var(--border); }
     .cap-sec .app-shell { max-width: none; }
     .cap-sec .modal { margin: 0 auto; }
   </style>` +
  Object.entries(captures)
    .map(([name, html]) => `<section class="cap-sec"><h1>${name}</h1>${html}</section>`)
    .join('\n')));
console.log('预览已写出: /home/linux/efootball/preview-captures.html');
