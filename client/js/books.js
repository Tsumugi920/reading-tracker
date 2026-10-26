// 书架模块：列表 / 筛选 / 搜索 / 新增 / 编辑 / 删除 / 进度更新
import { api } from './api.js';
import { CATEGORY_LABELS, escapeHtml, formatDate, showToast } from './utils.js';

const FILTER_LABELS = { all: '全部', ...CATEGORY_LABELS };

const state = {
  books: [],
  filter: 'all',
  keyword: '',
};
let editingBookId = null;

const listEl = () => document.getElementById('book-list');

function matches(book) {
  if (state.filter !== 'all' && book.category !== state.filter) return false;
  const kw = state.keyword.trim().toLowerCase();
  if (kw && !book.title.toLowerCase().includes(kw) && !book.author.toLowerCase().includes(kw)) {
    return false;
  }
  return true;
}

function progressHtml(book) {
  if (book.category === 'wishlist') {
    return `<p class="progress-hint">还没有开始读 · 共 ${book.totalPages} 页</p>`;
  }
  if (book.category === 'finished') {
    return `
      <div class="progress"><div class="progress-fill done" style="width:100%"></div></div>
      <p class="progress-hint">✅ 已读完${book.finishedAt ? ` · ${formatDate(book.finishedAt)}` : ''}</p>`;
  }
  const percent = book.totalPages > 0
    ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
    : 0;
  return `
    <div class="progress"><div class="progress-fill" style="width:${percent}%"></div></div>
    <p class="progress-hint">${book.currentPage} / ${book.totalPages} 页 · ${percent}%</p>`;
}

function bookCard(book) {
  return `
    <article class="book-card" data-id="${book.id}">
      <div class="book-cover" title="${escapeHtml(book.title)}">${escapeHtml(book.cover)}</div>
      <div class="book-body">
        <div class="book-title-row">
          <h3>${escapeHtml(book.title)}</h3>
          <span class="badge badge-${book.category}">${CATEGORY_LABELS[book.category]}</span>
        </div>
        <p class="book-author">${escapeHtml(book.author)}</p>
        ${book.description ? `<p class="book-desc">${escapeHtml(book.description)}</p>` : ''}
        ${progressHtml(book)}
        <div class="book-actions">
          <select class="status-select" data-action="change-status" title="修改状态">
            <option value="reading" ${book.category === 'reading' ? 'selected' : ''}>在读</option>
            <option value="finished" ${book.category === 'finished' ? 'selected' : ''}>已读</option>
            <option value="wishlist" ${book.category === 'wishlist' ? 'selected' : ''}>想读</option>
          </select>
          ${book.category === 'reading' ? `
          <div class="progress-editor">
            <input type="number" class="progress-input" min="0" max="${book.totalPages}"
              value="${book.currentPage}" title="当前读到第几页">
            <button class="btn btn-small" data-action="save-progress">更新进度</button>
          </div>` : ''}
          <button class="btn btn-small" data-action="open-notes">📝 笔记</button>
          <button class="btn btn-small" data-action="edit">编辑</button>
          <button class="btn btn-small btn-danger" data-action="delete">删除</button>
        </div>
      </div>
    </article>`;
}

function render() {
  // 更新筛选按钮上的数量统计
  const counts = { all: state.books.length, reading: 0, finished: 0, wishlist: 0 };
  for (const b of state.books) counts[b.category] = (counts[b.category] || 0) + 1;
  document.querySelectorAll('#book-filters .filter').forEach((btn) => {
    const key = btn.dataset.filter;
    btn.textContent = `${FILTER_LABELS[key]} (${counts[key] ?? 0})`;
    btn.classList.toggle('active', key === state.filter);
  });

  const visible = state.books.filter(matches);
  listEl().innerHTML = visible.length
    ? visible.map(bookCard).join('')
    : '<div class="empty">🪹 没有符合条件的书籍，换个筛选条件或添加一本新书吧。</div>';
}

export async function refreshBooks() {
  state.books = await api.get('/books');
  render();
}

async function saveProgress(card) {
  const id = Number(card.dataset.id);
  const input = card.querySelector('.progress-input');
  const currentPage = Number(input.value);
  if (!Number.isInteger(currentPage) || currentPage < 0) {
    showToast('请输入有效的页码（大于等于 0 的整数）', 'error');
    return;
  }
  try {
    const book = await api.patch(`/books/${id}/progress`, { currentPage });
    showToast(
      book.category === 'finished'
        ? `🎉 读完了《${book.title}》！已自动标记为已读`
        : `《${book.title}》进度已更新到第 ${book.currentPage} 页`,
      'success'
    );
    await refreshBooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function onListClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const card = btn.closest('.book-card');
  const id = Number(card.dataset.id);
  const book = state.books.find((b) => b.id === id);

  switch (btn.dataset.action) {
    case 'save-progress':
      await saveProgress(card);
      break;
    case 'open-notes':
      document.dispatchEvent(new CustomEvent('goto-notes', { detail: { bookId: id } }));
      break;
    case 'edit':
      openEditModal(book);
      break;
    case 'delete': {
      if (!confirm(`确定删除《${book.title}》吗？\n该书下的笔记也会一并删除。`)) return;
      try {
        await api.del(`/books/${id}`);
        showToast(`《${book.title}》已删除`, 'info');
        await refreshBooks();
      } catch (err) {
        showToast(err.message, 'error');
      }
      break;
    }
  }
}

async function onListChange(e) {
  if (!e.target.classList.contains('status-select')) return;
  const card = e.target.closest('.book-card');
  const id = Number(card.dataset.id);
  try {
    const book = await api.put(`/books/${id}`, { category: e.target.value });
    showToast(`《${book.title}》已标记为「${CATEGORY_LABELS[book.category]}」`, 'success');
    await refreshBooks();
  } catch (err) {
    showToast(err.message, 'error');
    await refreshBooks(); // 失败时恢复下拉框状态
  }
}

function openEditModal(book) {
  editingBookId = book.id;
  const form = document.getElementById('edit-book-form');
  form.title.value = book.title;
  form.author.value = book.author;
  form.category.value = book.category;
  form.totalPages.value = book.totalPages;
  form.cover.value = book.cover;
  form.description.value = book.description || '';
  document.getElementById('book-modal').classList.remove('hidden');
  form.title.focus();
}

function closeEditModal() {
  document.getElementById('book-modal').classList.add('hidden');
  editingBookId = null;
}

function bindModal() {
  const overlay = document.getElementById('book-modal');
  const form = document.getElementById('edit-book-form');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-close]')) closeEditModal();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      const book = await api.put(`/books/${editingBookId}`, {
        title: fd.get('title'),
        author: fd.get('author'),
        category: fd.get('category'),
        totalPages: fd.get('totalPages'),
        cover: fd.get('cover'),
        description: fd.get('description'),
      });
      closeEditModal();
      showToast(`《${book.title}》已保存`, 'success');
      await refreshBooks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

export function initBooks() {
  // 状态筛选
  document.getElementById('book-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    state.filter = btn.dataset.filter;
    render();
  });

  // 关键词搜索
  document.getElementById('book-search').addEventListener('input', (e) => {
    state.keyword = e.target.value;
    render();
  });

  // 新增书籍表单
  const form = document.getElementById('book-form');
  document.getElementById('toggle-book-form').addEventListener('click', () => {
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) form.querySelector('[name=title]').focus();
  });
  document.getElementById('cancel-book-form').addEventListener('click', () => {
    form.classList.add('hidden');
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      const book = await api.post('/books', {
        title: fd.get('title'),
        author: fd.get('author'),
        category: fd.get('category'),
        totalPages: fd.get('totalPages'),
        cover: fd.get('cover'),
        description: fd.get('description'),
      });
      form.reset();
      form.classList.add('hidden');
      showToast(`《${book.title}》已加入书架 🎉`, 'success');
      await refreshBooks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // 卡片操作（事件委托）
  listEl().addEventListener('click', onListClick);
  listEl().addEventListener('change', onListChange);
  listEl().addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('progress-input')) {
      e.preventDefault();
      saveProgress(e.target.closest('.book-card'));
    }
  });

  bindModal();
}
