// 统计模块：总览卡片、分类分布、今年读完、年度目标、最近笔记
import { api } from './api.js';
import { escapeHtml, formatDate, showToast } from './utils.js';

const CARD_META = [
  ['totalBooks', '📚 书籍总数'],
  ['reading', '📖 在读'],
  ['finished', '✅ 已读'],
  ['wishlist', '🛒 想读'],
  ['totalNotes', '✍️ 笔记数'],
  ['totalPagesRead', '📄 累计阅读页数'],
];

function renderCards(overview) {
  document.getElementById('stats-cards').innerHTML = CARD_META.map(([key, label]) => `
    <div class="stat-card">
      <div class="stat-value">${overview[key]}</div>
      <div class="stat-label">${label}</div>
    </div>`).join('');
}

function renderCategories(categories, total) {
  const rows = [
    ['reading', '📖 在读'],
    ['finished', '✅ 已读'],
    ['wishlist', '🛒 想读'],
  ].map(([key, label]) => {
    const count = categories[key] || 0;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div class="bar-row">
        <span class="bar-label">${label}</span>
        <div class="bar-track"><div class="bar-fill cat-${key}" style="width:${percent}%"></div></div>
        <span class="bar-value">${count} 本 · ${percent}%</span>
      </div>`;
  }).join('');
  document.getElementById('stats-categories').innerHTML =
    rows || '<p class="muted">暂无数据</p>';
}

function renderGoal(goal) {
  const percent = Math.min(100, goal.percent || 0);
  document.getElementById('stats-goal').innerHTML = `
    <p class="goal-line">
      ${goal.year} 年目标读完 <strong>${goal.target}</strong> 本，
      已读 <strong>${goal.finished}</strong> 本${goal.target > 0 ? `（完成 ${goal.percent}%）` : ''}
    </p>
    <div class="progress big"><div class="progress-fill" style="width:${percent}%"></div></div>
    ${goal.target > 0 && goal.finished >= goal.target
      ? '<p class="muted" style="margin-top:8px">🎉 年度目标已达成！</p>'
      : ''}
  `;
}

function renderFinished(list) {
  const el = document.getElementById('stats-finished');
  if (!list.length) {
    el.innerHTML = '<p class="muted">今年还没有读完的书</p>';
    return;
  }
  el.innerHTML = `<ul class="finished-list">${list.map((b) => `
    <li>
      <span>${escapeHtml(b.cover)} 《${escapeHtml(b.title)}》</span>
      <span class="muted">${formatDate(b.finishedAt)}</span>
    </li>`).join('')}</ul>`;
}

function renderRecentNotes(notes) {
  const el = document.getElementById('stats-notes');
  if (!notes.length) {
    el.innerHTML = '<p class="muted">还没有笔记</p>';
    return;
  }
  el.innerHTML = notes.map((n) => `
    <div class="recent-note">
      <span class="note-from">${escapeHtml(n.bookCover)}《${escapeHtml(n.bookTitle)}》${n.page != null ? ` · 第 ${n.page} 页` : ''}</span>
      <span>${escapeHtml(n.content.length > 60 ? `${n.content.slice(0, 60)}…` : n.content)}</span>
    </div>`).join('');
}

export async function refreshStats() {
  let stats;
  try {
    stats = await api.get('/stats');
  } catch (err) {
    showToast(err.message, 'error');
    return;
  }
  renderCards(stats.overview);
  renderCategories(stats.categories, stats.overview.totalBooks);
  renderGoal(stats.yearlyGoal);
  renderFinished(stats.finishedThisYear);
  renderRecentNotes(stats.recentNotes);
}
