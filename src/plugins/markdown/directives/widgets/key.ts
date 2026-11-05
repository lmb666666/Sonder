/** 键帽：macOS 符号显示与真实按键点亮（对应 :key 指令输出的 kbd.sd-key）。 */

const symbolMap: Record<string, string> = {
  ' ': '␣',
  Alt: '⌥',
  Backspace: '⌫',
  Control: '⌃',
  Delete: '⦻',
  Enter: '↵',
  Escape: '⎋',
  Shift: '⇧',
  Tab: '⇥',
  Win: '⊞',
};

const displayMap: Record<string, string> = {
  ' ': 'Space',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  Control: 'Ctrl',
  Delete: 'Del',
  Escape: 'Esc',
};

const isMac = /mac ?os/i.test(navigator.userAgent);

// data-mods 使用小写短名，映射回标准 KeyboardEvent key 名
const canonicalMod: Record<string, string> = {
  ctrl: 'Control',
  shift: 'Shift',
  alt: 'Alt',
  meta: 'Meta',
  win: 'Win',
  cmd: 'Cmd',
};

function labelFor(mod: string, useSymbol: boolean): string {
  if (mod === 'meta' || mod === 'Meta') {
    if (useSymbol) return isMac ? '⌘' : '⊞';
    return isMac ? 'Cmd' : 'Win';
  }
  const key = canonicalMod[mod] ?? mod;
  if (useSymbol && key in symbolMap) return symbolMap[key];
  if (key in displayMap) return displayMap[key];
  return key;
}

function renderKey(el: HTMLElement) {
  if (el.dataset.rendered === '1') return;
  const mods = (el.dataset.mods ?? '').split(' ').filter(Boolean);
  const code = el.dataset.key ?? '';
  if (el.textContent?.trim()) {
    // 作者显式写了文本：仅标记，不重写
    el.dataset.rendered = '1';
    return;
  }
  const useSymbol = isMac ? !mods.includes('no-icon') : mods.includes('icon');
  const parts: string[] = [];
  if (mods.includes('cmd')) parts.push(labelFor(isMac ? 'meta' : 'ctrl', useSymbol));
  if (mods.includes('ctrl') && !mods.includes('cmd')) parts.push(labelFor('ctrl', useSymbol));
  if (mods.includes('shift')) parts.push(labelFor('shift', useSymbol));
  if (mods.includes('alt')) parts.push(labelFor('alt', useSymbol));
  if (mods.includes('meta') && !mods.includes('cmd')) parts.push(labelFor('meta', useSymbol));
  if (mods.includes('win') && !mods.includes('meta')) parts.push(labelFor('win', useSymbol));
  if (code) parts.push(labelFor(code, useSymbol));
  el.textContent = parts.join(useSymbol ? '' : '+');
  el.dataset.rendered = '1';
}

const state = { ctrl: false, shift: false, alt: false, meta: false };

const keyAliases: Record<string, string> = {
  ctrl: 'control',
  control: 'control',
  cmd: 'meta',
  command: 'meta',
  meta: 'meta',
  win: 'meta',
  windows: 'meta',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
  esc: 'escape',
  space: ' ',
};

const normalizeKey = (value: string) => keyAliases[value.toLowerCase()] ?? value.toLowerCase();

function modifiersMatch(el: HTMLElement): boolean {
  const mods = (el.dataset.mods ?? '').split(' ');
  if (mods.includes('cmd')) {
    if (isMac ? !state.meta : !state.ctrl) return false;
  }
  if (mods.includes('ctrl') && !mods.includes('cmd') && !state.ctrl) return false;
  if (mods.includes('shift') && !state.shift) return false;
  if (mods.includes('alt') && !state.alt) return false;
  if (mods.includes('meta') && !mods.includes('cmd') && !state.meta) return false;
  if (mods.includes('win') && !state.meta) return false;
  return true;
}

function matchEvent(el: HTMLElement, event: KeyboardEvent): boolean {
  const code = el.dataset.key;
  if (code && normalizeKey(event.key) !== normalizeKey(code)) return false;
  return modifiersMatch(el);
}

const refreshAll = () =>
  document.querySelectorAll<HTMLElement>('kbd.sd-key[data-key]').forEach(renderKey);

let keyListenersBound = false;

export function bindKeys() {
  refreshAll();

  if (keyListenersBound) return;
  keyListenersBound = true;

  document.addEventListener('keydown', (event) => {
    state.ctrl = event.ctrlKey;
    state.shift = event.shiftKey;
    state.alt = event.altKey;
    state.meta = event.metaKey;
    const target = event.target;
    if (target instanceof Element && target.closest('input, textarea, select, [contenteditable]'))
      return;
    document.querySelectorAll<HTMLElement>('kbd.sd-key[data-key]').forEach((el) => {
      if (matchEvent(el, event)) el.classList.add('is-active');
    });
  });

  document.addEventListener('keyup', (event) => {
    state.ctrl = event.ctrlKey;
    state.shift = event.shiftKey;
    state.alt = event.altKey;
    state.meta = event.metaKey;
    document.querySelectorAll<HTMLElement>('kbd.sd-key[data-key]').forEach((el) => {
      const code = el.dataset.key ?? '';
      const keyReleased = Boolean(code) && event.key.toLowerCase() === code.toLowerCase();
      if (keyReleased || !modifiersMatch(el)) el.classList.remove('is-active');
    });
  });

  window.addEventListener('blur', () => {
    document
      .querySelectorAll<HTMLElement>('kbd.sd-key.is-active')
      .forEach((el) => el.classList.remove('is-active'));
  });
}
