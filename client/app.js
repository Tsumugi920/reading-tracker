// 前端入口：装配各模块、负责标签页切换
import { initBooks, refreshBooks } from './js/books.js';
import { initNotes, refreshNotes } from './js/notes.js';
import { initGoals, refreshGoals } from './js/goals.js';
import { refreshStats } from './js/stats.js';

const TAB_PANELS = {
  books: 'tab-books',
  notes: 'tab-notes',
  goals: 'tab-goals',
  stats: 'tab-stats',
};

function switchTab(name) {
  document.querySelectorAll('#main-tabs .tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === TAB_PANELS[name]);
  });
  // 切到对应页时拉取最新数据
  if (name === 'books') refreshBooks();
  else if (name === 'notes') refreshNotes();
  else if (name === 'goals') refreshGoals();
  else if (name === 'stats') refreshStats();
}

async function init() {
  initBooks();
  initNotes();
  initGoals();

  document.getElementById('main-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (btn) switchTab(btn.dataset.tab);
  });

  // 书架卡片上的「笔记」按钮 → 跳到笔记页并定位到该书（books.js 已设置好筛选）
  document.addEventListener('goto-notes', () => switchTab('notes'));

  await refreshBooks();
  switchTab('books');
}

init();
