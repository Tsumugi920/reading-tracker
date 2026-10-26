// 书籍路由：增删改查 + 阅读进度更新
const express = require('express');
const db = require('../db');

const router = express.Router();
const CATEGORIES = ['reading', 'finished', 'wishlist'];

function normalizePage(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function findBook(data, id) {
  return data.books.find((b) => b.id === Number(id));
}

// 书籍列表，支持 ?category=reading 状态筛选、?keyword=三体 关键词搜索
router.get('/', (req, res) => {
  const data = db.read();
  let books = [...data.books];
  if (req.query.category && CATEGORIES.includes(req.query.category)) {
    books = books.filter((b) => b.category === req.query.category);
  }
  const keyword = String(req.query.keyword || '').trim().toLowerCase();
  if (keyword) {
    books = books.filter(
      (b) =>
        b.title.toLowerCase().includes(keyword) ||
        b.author.toLowerCase().includes(keyword)
    );
  }
  books.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  res.json(books);
});

router.get('/:id', (req, res) => {
  const data = db.read();
  const book = findBook(data, req.params.id);
  if (!book) return res.status(404).json({ error: '书籍不存在' });
  res.json(book);
});

// 新增书籍
router.post('/', (req, res) => {
  const { title, author, category, totalPages, cover, description } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: '书名不能为空' });
  }
  const data = db.read();
  const now = new Date().toISOString();
  const safeCategory = CATEGORIES.includes(category) ? category : 'wishlist';
  const pages = Math.max(1, normalizePage(totalPages, 200) || 200);
  const book = {
    id: db.nextId(data.books),
    title: String(title).trim(),
    author: String(author || '').trim() || '佚名',
    category: safeCategory,
    totalPages: pages,
    currentPage: safeCategory === 'finished' ? pages : 0,
    cover: String(cover || '').trim() || '📚',
    description: String(description || '').trim(),
    startedAt: safeCategory === 'wishlist' ? null : now,
    finishedAt: safeCategory === 'finished' ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  data.books.push(book);
  db.write(data);
  res.status(201).json(book);
});

// 编辑书籍（部分字段可省略，只更新传了的字段）
router.put('/:id', (req, res) => {
  const data = db.read();
  const book = findBook(data, req.params.id);
  if (!book) return res.status(404).json({ error: '书籍不存在' });

  const { title, author, category, totalPages, cover, description } = req.body || {};
  if (title !== undefined && !String(title).trim()) {
    return res.status(400).json({ error: '书名不能为空' });
  }
  if (title !== undefined) book.title = String(title).trim();
  if (author !== undefined) book.author = String(author).trim() || '佚名';
  if (category !== undefined) {
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: '无效的书籍状态，应为 reading / finished / wishlist' });
    }
    if (category !== book.category) {
      const now = new Date().toISOString();
      if (category === 'finished') {
        // 标记为已读：进度补满并记录读完时间
        book.currentPage = book.totalPages;
        if (!book.startedAt) book.startedAt = now;
        if (!book.finishedAt) book.finishedAt = now;
      } else {
        book.finishedAt = null;
        if (category === 'reading' && !book.startedAt) book.startedAt = now;
        if (category === 'wishlist') {
          book.currentPage = 0;
          book.startedAt = null;
        }
      }
      book.category = category;
    }
  }
  if (totalPages !== undefined) {
    book.totalPages = Math.max(1, normalizePage(totalPages, book.totalPages) || book.totalPages);
    if (book.currentPage > book.totalPages) book.currentPage = book.totalPages;
  }
  if (cover !== undefined) book.cover = String(cover).trim() || '📚';
  if (description !== undefined) book.description = String(description).trim();

  book.updatedAt = new Date().toISOString();
  db.write(data);
  res.json(book);
});

// 更新阅读进度：body 传 { currentPage }
router.patch('/:id/progress', (req, res) => {
  const data = db.read();
  const book = findBook(data, req.params.id);
  if (!book) return res.status(404).json({ error: '书籍不存在' });

  const current = normalizePage(req.body && req.body.currentPage, -1);
  if (current < 0) {
    return res.status(400).json({ error: 'currentPage 必须是大于等于 0 的整数' });
  }
  const now = new Date().toISOString();
  book.currentPage = Math.min(current, book.totalPages);
  if (book.currentPage > 0 && !book.startedAt) book.startedAt = now;
  if (book.currentPage >= book.totalPages) {
    // 读到最后一页自动标记为已读
    book.currentPage = book.totalPages;
    book.category = 'finished';
    if (!book.finishedAt) book.finishedAt = now;
  } else if (book.currentPage > 0 && book.category === 'wishlist') {
    // 想读的书开始翻页后自动进入「在读」
    book.category = 'reading';
  }
  book.updatedAt = now;
  db.write(data);
  res.json(book);
});

// 删除书籍（同时清理该书下的所有笔记）
router.delete('/:id', (req, res) => {
  const data = db.read();
  const book = findBook(data, req.params.id);
  if (!book) return res.status(404).json({ error: '书籍不存在' });
  data.books = data.books.filter((b) => b.id !== book.id);
  const removedNotes = data.notes.filter((n) => n.bookId === book.id).length;
  data.notes = data.notes.filter((n) => n.bookId !== book.id);
  db.write(data);
  res.json({ message: `《${book.title}》已删除（含 ${removedNotes} 条笔记）`, id: book.id });
});

module.exports = router;
