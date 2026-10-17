import { el } from './ui.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// SVG 元素工厂：浏览器里用命名空间创建，测试垫片里回退到 createElement。
function svg(tag, attrs = {}, children = []) {
  const node = typeof document.createElementNS === 'function'
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) {
      continue;
    }
    node.setAttribute(key, String(value));
  }

  for (const child of children) {
    if (child === null || child === undefined) {
      continue;
    }
    node.append(child);
  }

  return node;
}

const BOX = { width: 560, height: 210, padTop: 18, padBottom: 30, padLeft: 34, padRight: 22 };

function roundedLabel(value) {
  return Math.round(value * 100) / 100;
}

// 赛季排名折线图：纵轴为排名（1 在最上），横轴为轮次。
export function renderRankChart(progression = [], options = {}) {
  const points = Array.isArray(progression) ? progression : [];
  if (points.length === 0) {
    return el('div', { className: 'chart-empty muted', text: '该队还没有已完成的比赛，暂无排名走势' });
  }

  const totalTeams = Math.max(2, Number(options.totalTeams) || points.length);
  const plotWidth = BOX.width - BOX.padLeft - BOX.padRight;
  const plotHeight = BOX.height - BOX.padTop - BOX.padBottom;

  const xAt = (index) => (points.length === 1
    ? BOX.padLeft + plotWidth / 2
    : BOX.padLeft + (index / (points.length - 1)) * plotWidth);
  const yAt = (rank) => BOX.padTop + ((rank - 1) / (totalTeams - 1)) * plotHeight;

  const children = [];

  // 横向排名网格：第 1 名、中位、末位。
  const gridRanks = [...new Set([1, Math.round((totalTeams + 1) / 2), totalTeams])].sort((a, b) => a - b);
  for (const rank of gridRanks) {
    const y = yAt(rank);
    children.push(svg('line', {
      x1: BOX.padLeft,
      x2: BOX.width - BOX.padRight,
      y1: y,
      y2: y,
      class: 'chart-grid',
    }));
    children.push(svg('text', {
      x: BOX.padLeft - 8,
      y: y + 4,
      class: 'chart-axis-label',
      'text-anchor': 'end',
    }, [document.createTextNode(String(rank))]));
  }

  // 轮次刻度：点较多时按间隔抽稀，避免拥挤。
  const labelStep = Math.max(1, Math.ceil(points.length / 8));
  points.forEach((point, index) => {
    if (index % labelStep !== 0 && index !== points.length - 1) {
      return;
    }
    children.push(svg('text', {
      x: xAt(index),
      y: BOX.height - 10,
      class: 'chart-axis-label',
      'text-anchor': 'middle',
    }, [document.createTextNode(`${point.round}轮`)]));
  });

  const linePoints = points.map((point, index) => `${roundedLabel(xAt(index))},${roundedLabel(yAt(point.rank))}`).join(' ');

  children.push(svg('polyline', {
    points: linePoints,
    class: 'chart-line',
  }));

  points.forEach((point, index) => {
    const circle = svg('circle', {
      cx: roundedLabel(xAt(index)),
      cy: roundedLabel(yAt(point.rank)),
      r: point.isLeader ? 5 : 3.5,
      class: point.isLeader ? 'chart-dot chart-dot-leader' : 'chart-dot',
    }, [
      svg('title', {}, [document.createTextNode(`第 ${point.round} 轮：第 ${point.rank} 名 · ${point.points} 分`)]),
    ]);
    children.push(circle);
  });

  return svg('svg', {
    class: 'rank-chart',
    viewBox: `0 0 ${BOX.width} ${BOX.height}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-label': '赛季排名走势折线图',
  }, children);
}
