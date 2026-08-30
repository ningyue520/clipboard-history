'use strict';

(() => {
const api = window.api;

let state = { entries: [], settings: {}, expiredCount: 0 };
let currentTab = 'active';
let query = '';

const $ = (sel) => document.querySelector(sel);
const listEl = $('#list');
const emptyEl = $('#empty');
const emptyText = $('#empty-text');
const searchEl = $('#search');
const toastEl = $('#toast');

// ---------------------------------------------------------------------------
// 时间显示
// ---------------------------------------------------------------------------
function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return min + ' 分钟前';
  const hour = Math.floor(min / 60);
  if (hour < 24 && d.getDate() === now.getDate()) return hour + ' 小时前';

  const pad = (n) => String(n).padStart(2, '0');
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const y = d.getFullYear();
  const md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ystr = now.getFullYear() !== y ? `${y}-` : '';
  return `${ystr}${md} ${hm}`;
}

function dayLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startToday - startD) / 86400000);
  if (dayDiff === 0) return '今天';
  if (dayDiff === 1) return '昨天';
  if (dayDiff === 2) return '前天';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日`;
}

// ---------------------------------------------------------------------------
// 渲染
// ---------------------------------------------------------------------------
function matches(e, q) {
  if (!q) return true;
  const hay = (e.text || '') + ' ' + (e.ocrText || '');
  return hay.toLowerCase().includes(q.toLowerCase());
}

function visibleEntries() {
  let list = state.entries;
  if (currentTab === 'favorite') {
    list = list.filter((e) => e.isFavorite);
  } else if (currentTab === 'expired') {
    list = list.filter((e) => e.status === 'expired');
  } else {
    list = list.filter((e) => e.status === 'active' && !e.isFavorite);
  }
  list = list.filter((e) => matches(e, query));
  return list.sort((a, b) =>
    (Number(b.isFavorite) - Number(a.isFavorite)) || (b.createdAt - a.createdAt)
  );
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(s, q) {
  if (!q) return esc(s);
  const i = s.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(s);
  const before = esc(s.slice(0, i));
  const hit = esc(s.slice(i, i + q.length));
  const after = esc(s.slice(i + q.length));
  return `${before}<mark>${hit}</mark>${after}`;
}

function cardHtml(e) {
  const time = formatTime(e.createdAt);
  const typeBadge = e.type === 'image' ? '图片' : '文字';
  const fav = e.isFavorite ? `<span class="fav-flag">⭐ 已收藏</span>` : '';

  let body;
  if (e.type === 'image') {
    const ocr = e.ocrText ? `<div class="ocr-hint">图片内容：${esc(e.ocrText.slice(0, 80))}…</div>` : '';
    body = `<img class="card-img" src="img://${e.imageFile}" data-file="${e.imageFile}" alt="图片" />${ocr}`;
  } else {
    const text = highlight(e.text, query);
    body = `<div class="card-body">${text}</div>`;
  }

  const actions = [];
  actions.push(`<button class="btn primary" data-act="copy" title="复制到剪贴板">复制</button>`);
  if (e.status === 'active') {
    actions.push(`<button class="btn ${e.isFavorite ? 'fav' : ''}" data-act="fav" title="${e.isFavorite ? '取消收藏' : '收藏，永不过期'}">${e.isFavorite ? '取消收藏' : '收藏'}</button>`);
  }
  actions.push(`<button class="btn danger" data-act="del" title="删除">删除</button>`);

  const expiredCls = e.status === 'expired' ? ' expired' : '';
  return `
    <div class="card${expiredCls}" data-id="${e.id}">
      <div class="card-meta">
        <span class="time">${time}</span>
        <span class="type-badge">${typeBadge}</span>
        ${fav}
      </div>
      ${body}
      <div class="card-actions">${actions.join('')}</div>
    </div>
  `;
}

function render() {
  const list = visibleEntries();
  $('#expired-count').textContent = state.expiredCount ? `（${state.expiredCount} 条）` : '';
  const badge = $('#expired-badge');
  badge.hidden = !state.expiredCount;
  badge.textContent = state.expiredCount;

  if (list.length === 0) {
    listEl.innerHTML = '';
    emptyEl.hidden = false;
    if (query) {
      emptyText.textContent = '没有找到匹配的内容';
      $('#empty-sub') && ($('#empty-sub').textContent = '换个关键词试试');
    } else if (currentTab === 'favorite') {
      emptyText.textContent = '还没有收藏的内容';
      $('#empty-sub') && ($('#empty-sub').textContent = '点击卡片上的“收藏”按钮，经常使用的内容会一直留在这里');
    } else if (currentTab === 'expired') {
      emptyText.textContent = '已过期区是空的';
      $('#empty-sub') && ($('#empty-sub').textContent = '超过保留期限的内容会移到这里');
    } else {
      emptyText.textContent = '还没有记录，复制点什么试试吧';
      $('#empty-sub') && ($('#empty-sub').textContent = '复制文字或截图后，会自动出现在这里');
    }
    return;
  }

  emptyEl.hidden = true;

  // 按天分组
  let html = '';
  let lastDay = '';
  for (const e of list) {
    const label = dayLabel(e.createdAt);
    if (label !== lastDay) {
      html += `<div class="day-divider">${label}</div>`;
      lastDay = label;
    }
    html += cardHtml(e);
  }
  listEl.innerHTML = html;
  listEl.querySelectorAll('.card').forEach((el, i) => {
    el.style.animationDelay = Math.min(i * 25, 300) + 'ms';
  });
}

// ---------------------------------------------------------------------------
// 提示气泡
// ---------------------------------------------------------------------------
let toastTimer = null;
function syncSettingsUI(s) {
  document.querySelectorAll('#seg-retention button').forEach((b) => {
    b.classList.toggle('on', Number(b.dataset.days) === s.settings.retentionDays);
  });
  document.querySelectorAll('#seg-close button').forEach((b) => {
    b.classList.toggle('on', (b.dataset.close === 'tray') === !!s.settings.closeToTray);
  });
  $('#autolaunch').checked = !!s.settings.autoLaunch;
  $('#shortcut').value = s.settings.shortcut;
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 1400);
}

// ---------------------------------------------------------------------------
// 事件绑定
// ---------------------------------------------------------------------------
function bindEvents() {
  // 窗口控制
  $('#minimize-btn').addEventListener('click', () => api.minimizeWindow());
  $('#close-btn').addEventListener('click', () => api.closeWindow());

  // 标签页
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      currentTab = btn.dataset.tab;
      render();
    });
  });

  // 搜索
  searchEl.addEventListener('input', () => {
    query = searchEl.value.trim();
    $('#clear-search').hidden = !query;
    render();
  });
  $('#clear-search').addEventListener('click', () => {
    searchEl.value = '';
    query = '';
    $('#clear-search').hidden = true;
    render();
    searchEl.focus();
  });

  $('#seg-retention').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    document.querySelectorAll('#seg-retention button').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    const days = Number(btn.dataset.days);
    api.setSettings({ retentionDays: days });
    toast(`保留期限已设为 ${days} 天`);
  });

  // 设置面板开关
  $('#settings-btn').addEventListener('click', () => $('#settings-overlay').hidden = false);
  $('#settings-close').addEventListener('click', () => $('#settings-overlay').hidden = true);
  $('#settings-overlay').addEventListener('click', (e) => {
    if (e.target === $('#settings-overlay')) $('#settings-overlay').hidden = true;
  });
  $('#autolaunch').addEventListener('change', (e) => {
    api.setSettings({ autoLaunch: e.target.checked });
    toast(e.target.checked ? '已开启开机自启' : '已关闭开机自启');
  });
  $('#seg-close').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const closeToTray = btn.dataset.close === 'tray';
    api.setSettings({ closeToTray });
    toast(closeToTray ? '关闭窗口将最小化到托盘' : '关闭窗口将直接退出程序');
  });
  const shortcutEl = $('#shortcut');
  shortcutEl.addEventListener('focus', () => api.pauseShortcutCapture());
  shortcutEl.addEventListener('blur', () => api.resumeShortcutCapture());
  shortcutEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      shortcutEl.blur();
      return;
    }
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
    const parts = [];
    if (e.ctrlKey) parts.push('Control');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Super');

    let key = '';
    if (/^[a-zA-Z]$/.test(e.key)) key = e.key.toUpperCase();
    else if (/^[0-9]$/.test(e.key)) key = e.key;
    else if (/^F([1-9]|1[0-2])$/.test(e.key)) key = e.key;
    else if (['Up', 'Down', 'Left', 'Right', 'Space', 'Enter', 'Backspace', 'Delete', 'Home', 'End', 'PageUp', 'PageDown', 'Tab', 'Insert'].includes(e.key)) key = e.key;
    else if (e.key.length === 1) key = e.key.toUpperCase();

    if (!key || (!e.ctrlKey && !e.altKey && !e.metaKey && !/^F/.test(key))) {
      toast('快捷键需包含 Ctrl 或 Alt');
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const shortcut = [...parts, key].join('+');
    shortcutEl.value = shortcut;
    await api.setSettings({ shortcut });
    toast('快捷键已更新');
    shortcutEl.blur();
  });
  $('#clear-expired').addEventListener('click', () => {
    api.clearExpired();
    toast('已清空过期内容');
  });

  // 卡片操作（事件委托）
  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) {
      const img = e.target.closest('.card-img');
      if (img && img.dataset.file) api.previewImage(img.dataset.file);
      return;
    }
    const card = btn.closest('.card');
    const id = card.dataset.id;
    const act = btn.dataset.act;

    if (act === 'copy') {
      const ok = await api.copyEntry(id);
      if (ok) toast('已复制到剪贴板，去目标软件 Ctrl+V');
      else toast('复制失败');
    } else if (act === 'fav') {
      await api.toggleFavorite(id);
    } else if (act === 'del') {
      await api.deleteEntry(id);
    }
  });

  // 点击图片卡片也可复制
  listEl.addEventListener('dblclick', async (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const ok = await api.copyEntry(card.dataset.id);
    if (ok) toast('已复制到剪贴板');
  });
}

// ---------------------------------------------------------------------------
// 初始化
// ---------------------------------------------------------------------------
async function init() {
  state = await api.getState();
  syncSettingsUI(state);
  $('#autolaunch').checked = !!state.settings.autoLaunch;
  $('#shortcut').value = state.settings.shortcut;
  document.querySelectorAll('#seg-retention button').forEach((b) => {
    b.classList.toggle('on', Number(b.dataset.days) === state.settings.retentionDays);
  });

  api.onUpdate((s) => { state = s; syncSettingsUI(s); render(); });
  api.onFocusSearch(() => {
    if (!searchEl.value) searchEl.focus();
  });
  api.onWindowShown(() => {
    document.body.classList.remove('win-enter');
    void document.body.offsetWidth;
    document.body.classList.add('win-enter');
  });

  bindEvents();
  render();
}

init();
})();
