// 读书笔记模块：写笔记 / 按书过滤 / 编辑 / 删除
import { api } from './api.js';
import { escapeHtml, formatDateTime, showToast } from './utils.js';

const state = {
  books: [],
  notes: [],
  filterBookId: 'all',
  formBookId: '',
  editingNoteId: null,
};

export async function refreshNotes() {
  [state.books, state.notes] = await Promise.all([api.get('/books'), api.get('/notes')]);
  renderSelectors();
  renderList();
}

function bookOptions() {
  return state.books
    .map((b) => `<option value="${b.id}">${escapeHtml(b.cover)} 《${escapeHtml(b.title)}》</option>`)
    .join('');
}

function renderSelectors() {
  const formSelect = document.getElementById('note-book');
  const filterSelect = document.getElementById('note-filter');

  formSelect.innerHTML =
    `<option value="" disabled ${state.books.length ? '' : 'selected'}>选择一本书…</option>` +
    bookOptions();
  filterSelect.innerHTML = `<option value="all">全部笔记</option>` + bookOptions();

  // 优先保留用户/跳转指定的书，否则默认选第一本
  if (!state.formBookId && state.books.length) state.formBookId = String(state.books[0].id);
  if (state.formBookId) formSelect.value = state.formBookId;
  filterSelect.value = state.filterBookId;
}

function renderList() {
  const listEl = document.getElementById('notes-list');
  const filtered = state.filterBookId === 'all'
    ? state.notes
    : state.notes.filter((n) => String(n.bookId) === String(state.filterBookId));

  document.getElementById('notes-count').textContent = `${filtered.length} 条笔记`;

  if (!filtered.length) {
    listEl.innerHTML = '<div class="empty">🖋 还没有笔记，选一本书写下第一条吧。</div>';
    return;
  }

  listEl.innerHTML = filtered.map((n) => {
    const editing = String(n.id) === String(state.editingNoteId);
    const meta = `${n.page != null ? `第 ${n.page} 页 · ` : ''}${formatDateTime(n.createdAt)}`;
    return `
      <article class="note-card ${editing ? 'editing' : ''}" data-id="${n.id}">
        <div class="note-head">
          <span class="note-book">${escapeHtml(n.bookCover)}《${escapeHtml(n.bookTitle)}》</span>
          <span class="note-meta">${meta}</span>
        </div>
        ${editing
          ? `<textarea class="note-edit-area">${escapeHtml(n.content)}</textarea>
             <div class="note-actions">
               <button class="btn btn-small btn-primary" data-action="save-edit">保存</button>
               <button class="btn btn-small" data-action="cancel-edit">取消</button>
             </div>`
          : `<p class="note-content">${escapeHtml(n.content)}</p>
             <div class="note-actions">
               <button class="btn btn-small" data-action="edit">编辑</button>
               <button class="btn btn-small btn-danger" data-action="delete">删除</button>
             </div>`}
      </article>`;
  }).join('');
}

export function initNotes() {
  // 新增笔记
  document.getElementById('note-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookId = document.getElementById('note-book').value;
    const page = document.getElementById('note-page').value;
    const content = document.getElementById('note-content').value;
    try {
      const note = await api.post('/notes', { bookId, page, content });
      document.getElementById('note-content').value = '';
      document.getElementById('note-page').value = '';
      showToast(`已为《${note.bookTitle}》添加笔记 ✍️`, 'success');
      await refreshNotes();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // 记住表单里选中的书
  document.getElementById('note-book').addEventListener('change', (e) => {
    state.formBookId = e.target.value;
  });

  // 笔记过滤
  document.getElementById('note-filter').addEventListener('change', (e) => {
    state.filterBookId = e.target.value;
    renderList();
  });

  // 笔记操作（事件委托）
  document.getElementById('notes-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const card = btn.closest('.note-card');
    const id = Number(card.dataset.id);

    switch (btn.dataset.action) {
      case 'edit':
        state.editingNoteId = id;
        renderList();
        break;
      case 'cancel-edit':
        state.editingNoteId = null;
        renderList();
        break;
      case 'save-edit': {
        const content = card.querySelector('.note-edit-area').value;
        try {
          await api.put(`/notes/${id}`, { content });
          state.editingNoteId = null;
          showToast('笔记已更新', 'success');
          await refreshNotes();
        } catch (err) {
          showToast(err.message, 'error');
        }
        break;
      }
      case 'delete': {
        if (!confirm('确定删除这条笔记吗？')) return;
        try {
          await api.del(`/notes/${id}`);
          showToast('笔记已删除', 'info');
          await refreshNotes();
        } catch (err) {
          showToast(err.message, 'error');
        }
        break;
      }
    }
  });

  // 从书架卡片跳转过来：定位到某本书
  document.addEventListener('goto-notes', (e) => {
    const bookId = String(e.detail.bookId);
    state.filterBookId = bookId;
    state.formBookId = bookId;
    renderSelectors();
    renderList();
  });
}
