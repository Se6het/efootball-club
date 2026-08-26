// 交互动效小工具：数字滚动、淡入。
// 纯逻辑部分（缓动、格式化）独立可测；DOM 接线在浏览器环境执行。

export const EASE_OUT_QUAD = (t) => 1 - (1 - t) * (1 - t);

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// 缓动插值：t 在 [0,1] 返回 from → to 的中间值。
export function easeBetween(from, to, t) {
  return from + (to - from) * EASE_OUT_QUAD(t);
}

export function defaultFormatter(value) {
  return String(Math.round(value));
}

// 数字滚动：将节点文本从 from 平滑过渡到 to。
// 尊重 prefers-reduced-motion：直接设置终值。
export function animateNumber(node, from, to, options = {}) {
  const { duration = 600, formatter = defaultFormatter } = options;
  const target = Number(to);
  const start = Number(from ?? 0);

  if (!node || !Number.isFinite(target)) {
    return;
  }
  if (prefersReducedMotion() || duration <= 0 || !Number.isFinite(start)) {
    node.textContent = formatter(target);
    return;
  }

  const startTime = performance.now();

  const frame = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    node.textContent = formatter(easeBetween(start, target, t));
    if (t < 1) {
      window.requestAnimationFrame(frame);
    }
  };

  window.requestAnimationFrame(frame);
}

// 淡入：给节点加 fade-in 类（触发 CSS 动画）。
export function fadeIn(node, delayMs = 0) {
  if (!node) {
    return;
  }
  if (prefersReducedMotion()) {
    return;
  }
  if (delayMs > 0) {
    node.style.animationDelay = `${delayMs}ms`;
  }
  node.classList.add('fade-in');
}

// 依次淡入多个兄弟节点（阶梯式延迟）。
export function fadeInStagger(nodes, stepMs = 60) {
  nodes.forEach((node, index) => fadeIn(node, index * stepMs));
}
