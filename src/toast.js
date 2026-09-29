import { el } from './ui.js';

let activeToast = null;
let hideTimer = null;
const HIDE_MS = 2200;

// 轻量提示：右下角滑入，自动消失。重复调用会替换上一条。
export function showToast(message, kind = 'success') {
  if (activeToast) {
    activeToast.remove();
  }

  const toast = el('div', { className: `toast ${kind === 'error' ? 'toast-error' : ''}`, role: kind === 'error' ? 'alert' : 'status', text: message });
  document.body.append(toast);
  activeToast = toast;

  // 下一帧再加入可见态，触发滑入动画。
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => {
      toast.remove();
      if (activeToast === toast) {
        activeToast = null;
      }
    }, 200);
  }, HIDE_MS);
}
