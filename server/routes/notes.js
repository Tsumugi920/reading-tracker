// 笔记路由：增删改查，支持按书籍过滤
const express = require('express');
const db = require('../db');

const router = express.Router();

function findNote(data, id) {
  return data.notes.find((n) => n.id === Number(id));
}

function normalizePageNum(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// 笔记列表，支持 ?bookId=1 按书过滤；附带书名/封面方便前端直接展示
router.get('/', (req, res) => {
  const data = db.read();
  let notes = [...data.notes];
  if (req.query.bookId) {
    const bookId = Number(req.query.bookId);
    notes = notes.filter((n) => n.bookId === bookId);
  }
  notes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const bookMap = Object.fromEntries(data.books.map((b) => [b.id, b]));
  res.json(
    notes.map((n) => {
      const book = bookMap[n.bookId];
      return {
        ...n,
        bookTitle: book ? book.title : '未知书籍',
        bookCover: book ? book.cover : '📄',
      };
    })
  );
});

// 新增笔记：body 传 { bookId, content, page? }
router.post('/', (req, res) => {
  const { bookId, content, page } = req.body || {};
  const data = db.read();
  const book = data.books.find((b) => b.id === Number(bookId));
  if (!book) return res.status(400).json({ error: '请选择一本有效的书籍' });
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: '笔记内容不能为空' });
  }
  const now = new Date().toISOString();
  const note = {
    id: db.nextId(data.notes),
    bookId: book.id,
    content: String(content).trim(),
    page: normalizePageNum(page),
    createdAt: now,
    updatedAt: now,
  };
  data.notes.push(note);
  db.write(data);
  res.status(201).json({ ...note, bookTitle: book.title, bookCover: book.cover });
});

// 编辑笔记：body 传 { content?, page? }
router.put('/:id', (req, res) => {
  const data = db.read();
  const note = findNote(data, req.params.id);
  if (!note) return res.status(404).json({ error: '笔记不存在' });

  const { content, page } = req.body || {};
  if (content !== undefined) {
    if (!String(content).trim()) return res.status(400).json({ error: '笔记内容不能为空' });
    note.content = String(content).trim();
  }
  if (page !== undefined) note.page = normalizePageNum(page);
  note.updatedAt = new Date().toISOString();
  db.write(data);

  const book = data.books.find((b) => b.id === note.bookId);
  res.json({ ...note, bookTitle: book ? book.title : '未知书籍', bookCover: book ? book.cover : '📄' });
});

// 删除笔记
router.delete('/:id', (req, res) => {
  const data = db.read();
  const note = findNote(data, req.params.id);
  if (!note) return res.status(404).json({ error: '笔记不存在' });
  data.notes = data.notes.filter((n) => n.id !== note.id);
  db.write(data);
  res.json({ message: '笔记已删除', id: note.id });
});

module.exports = router;
