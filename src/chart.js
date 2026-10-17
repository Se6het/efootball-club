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

// 环形图配色：按顺序取，超出后循环。最后一个「其他」用灰。
const DONUT_COLORS = ['#2557d6', '#0ea5a4', '#e08a1e', '#c0392b', '#7c3aed', '#1f8a5b', '#0891b2', '#e11d48'];
const DONUT_OTHER_COLOR = '#9aa4b8';

// 占比环形图：左侧圆环 + 右侧图例（label · 数值 · 百分比）。
export function renderDonutChart(slices = [], options = {}) {
  const items = (Array.isArray(slices) ? slices : [])
    .map((slice) => ({ label: String(slice?.label ?? ''), value: Number(slice?.value ?? 0) }))
    .filter((slice) => slice.label && slice.value > 0);

  if (items.length === 0) {
    return el('div', { className: 'chart-empty muted', text: options.emptyText ?? '暂无数据' });
  }

  const total = items.reduce((sum, slice) => sum + slice.value, 0);
  const sorted = items.slice().sort((left, right) => right.value - left.value);
  const maxRows = Number(options.maxRows) || 6;
  const rows = sorted.slice(0, maxRows).map((slice, index) => ({
    ...slice,
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  }));
  const rest = sorted.slice(maxRows);
  if (rest.length > 0) {
    rows.push({
      label: `其他 ${rest.length} 人`,
      value: rest.reduce((sum, slice) => sum + slice.value, 0),
      color: DONUT_OTHER_COLOR,
    });
  }

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const arcs = rows.map((row) => {
    const length = (row.value / total) * circumference;
    const arc = svg('circle', {
      cx: 56,
      cy: 56,
      r: radius,
      fill: 'none',
      stroke: row.color,
      'stroke-width': 18,
      'stroke-dasharray': `${roundedLabel(length)} ${roundedLabel(circumference - length)}`,
      'stroke-dashoffset': roundedLabel(-offset),
      transform: 'rotate(-90 56 56)',
    });
    offset += length;
    return arc;
  });

  const chart = svg('svg', {
    class: 'donut-chart',
    viewBox: '0 0 112 112',
    role: 'img',
    'aria-label': `${options.label ?? '占比'}环形图`,
  }, [
    ...arcs,
    svg('text', {
      x: 56,
      y: 52,
      class: 'donut-total',
      'text-anchor': 'middle',
    }, [document.createTextNode(String(roundedLabel(total)))]),
    svg('text', {
      x: 56,
      y: 68,
      class: 'donut-total-label',
      'text-anchor': 'middle',
    }, [document.createTextNode(options.unit ?? '合计')]),
  ]);

  const legend = el('ul', { className: 'donut-legend' }, rows.map((row) => {
    const percent = Math.round((row.value / total) * 100);
    return el('li', { className: 'donut-legend-row' }, [
      el('span', { className: 'donut-dot', style: `background:${row.color}` }),
      el('span', { className: 'donut-legend-label', text: row.label, title: row.label }),
      el('span', { className: 'donut-legend-value', text: `${row.value} · ${percent}%` }),
    ]);
  }));

  return el('div', { className: 'donut-wrap' }, [chart, legend]);
}

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
