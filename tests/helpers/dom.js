// 极简 DOM 垫片：只为在 node 环境下对「视图函数」做冒烟测试。
// 不追求完整语义，只要 el()/视图调用不抛错、能取到文本即可。

function createTextNode(text) {
  return { nodeType: 3, data: String(text), textContent: String(text) };
}

function matchesSelector(node, selector) {
  const token = String(selector).trim();
  if (!token) return false;
  if (token.startsWith('.')) {
    return String(node.className ?? '').split(/\s+/).includes(token.slice(1));
  }
  return node.tagName === token.toUpperCase();
}

function collect(node, selector, out) {
  for (const child of node.childNodes ?? []) {
    if (child.nodeType !== 1) continue;
    if (matchesSelector(child, selector)) out.push(child);
    collect(child, selector, out);
  }
  return out;
}

function createElement(tag) {
  const node = {
    nodeType: 1,
    tagName: String(tag).toUpperCase(),
    className: '',
    style: {},
    attributes: {},
    childNodes: [],
    isConnected: true,
    _text: '',
    listeners: {},
    classList: {
      add() {},
      remove() {},
      contains() {
        return false;
      },
    },
    setAttribute(key, value) {
      this.attributes[key] = String(value);
      if (key === 'class') {
        this.className = String(value);
      }
    },
    getAttribute(key) {
      return this.attributes[key];
    },
    append(...kids) {
      for (const kid of kids) {
        if (kid === null || kid === undefined) continue;
        this.childNodes.push(kid.nodeType ? kid : createTextNode(kid));
      }
      return this;
    },
    appendChild(kid) {
      this.append(kid);
      return kid;
    },
    replaceChildren(...kids) {
      this.childNodes = [];
      this.append(...kids);
    },
    insertBefore(kid) {
      this.childNodes.unshift(kid);
      return kid;
    },
    addEventListener(type, handler) {
      if (typeof handler === 'function') {
        this.listeners[type] = handler;
      }
    },
    removeEventListener(type) {
      delete this.listeners[type];
    },
    // 触发一次已注册的事件（默认 click），供视图交互冒烟测试调用。
    dispatch(type = 'click') {
      const handler = this.listeners[type];
      if (handler) {
        handler({ target: this, currentTarget: this, type });
      }
      return this;
    },
    click() {
      return this.dispatch('click');
    },
    querySelector(selector) {
      return collect(this, selector, [])[0] ?? null;
    },
    querySelectorAll(selector) {
      return collect(this, selector, []);
    },
    focus() {},
    remove() {
      this.isConnected = false;
    },
  };

  Object.defineProperty(node, 'textContent', {
    get() {
      if (this.childNodes.length) {
        return this.childNodes
          .map((child) => (child.nodeType === 3 ? child.data : child.textContent ?? ''))
          .join('');
      }
      return this._text ?? '';
    },
    set(value) {
      this._text = String(value);
      this.childNodes = [];
    },
  });

  return node;
}

export function installDom() {
  global.document = { createElement, createTextNode };
  global.window = {
    matchMedia: () => ({ matches: true }),
    requestAnimationFrame: () => 0,
  };
  return document;
}

export function textOf(node) {
  if (!node) return '';
  if (node.nodeType === 3) return node.data;
  return node.textContent ?? '';
}
