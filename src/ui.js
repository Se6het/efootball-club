import { getTeamMark, teamCrestUrl, teamPrimary, teamSecondary, teamText } from './teams.js';

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  const afterRender = [];

  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (key === 'className') {
      node.className = value;
      continue;
    }
    if (key === 'text') {
      node.textContent = value;
      continue;
    }
    if (key === 'onAfterRender' && typeof value === 'function') {
      afterRender.push(value);
      continue;
    }
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
      continue;
    }
    if (key in node) {
      node[key] = value;
    } else {
      node.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) {
      continue;
    }
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }

  if (afterRender.length > 0) {
    queueMicrotask(() => {
      if (!node.isConnected) {
        return;
      }
      for (const hook of afterRender) {
        hook(node);
      }
    });
  }

  return node;
}

export function clear(node) {
  node.textContent = '';
}

export function formatScore(match) {
  if (!match.isPlayed) {
    return '未进行';
  }
  return `${match.homeGoals} : ${match.awayGoals}`;
}

export function formatCards(cards) {
  return `${cards.yellow}黄 ${cards.red}红`;
}

export function teamLabel(team, player) {
  return player ? `${team}（${player}）` : team;
}

export function inputValue(input) {
  return String(input.value ?? '').trim();
}

export function numberValue(input) {
  return Number(input.value || 0);
}

export function createSection(title, description) {
  return el('section', { className: 'panel' }, [
    el('h2', { text: title }),
    description ? el('p', { className: 'muted', text: description }) : null,
  ]);
}

// 圆形俱乐部徽章：优先 api-football 队徽图，加载失败或离线时降级为主题色圆徽 + 中文缩写。
function teamBadge(team) {
  const primary = teamPrimary(team);
  const secondary = teamSecondary(team);
  const text = teamText(team);
  const style = primary
    ? `background: linear-gradient(135deg, ${primary}, ${secondary || primary}); color: ${text};`
    : null;
  const fallback = el('span', { className: 'team-avatar-fallback', text: getTeamMark(team) });
  const url = teamCrestUrl(team);
  const inner = url
    ? el('img', {
        className: 'team-crest-img',
        alt: `${team} 队徽`,
        src: url,
        loading: 'lazy',
        width: 26,
        height: 26,
        onLoad: () => {
          // 队徽多为透明背景 PNG，加载成功后隐藏底层缩写，避免透字。
          fallback.style.display = 'none';
        },
        onError: (event) => {
          const node = event.target;
          node.style.display = 'none';
        },
      })
    : null;
  return el('span', { className: 'team-avatar', style }, [
    inner,
    fallback,
  ]);
}

// 球队单元格：徽章 + 队名，供赛程/榜单/颁奖复用。
export function teamCell(team) {
  return el('span', { className: 'team-name' }, [
    teamBadge(team),
    el('span', { text: team }),
  ]);
}

export { teamBadge };

// 空状态：图标 + 标题 + 提示，占位高度统一，供各列表空数据时复用。
export function emptyState(icon, title, hint = '') {
  return el('div', { className: 'empty-state' }, [
    el('div', { className: 'empty-state-icon', text: icon }),
    el('div', { className: 'empty-state-title', text: title }),
    hint ? el('div', { className: 'empty-state-hint', text: hint }) : null,
  ]);
}

