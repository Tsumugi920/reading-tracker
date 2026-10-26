// 统计路由：书籍/笔记/页数的总览，分类分布，年度目标进度等
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const data = db.read();
  const { books, notes } = data;

  const categories = { reading: 0, finished: 0, wishlist: 0 };
  let totalPagesRead = 0;
  for (const book of books) {
    if (categories[book.category] !== undefined) categories[book.category] += 1;
    totalPagesRead += book.category === 'finished' ? book.totalPages : book.currentPage || 0;
  }

  const year = String(new Date().getFullYear());
  const finishedThisYear = books
    .filter((b) => b.category === 'finished' && (b.finishedAt || '').slice(0, 4) === year)
    .sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''));

  const target = Number(data.goal.yearlyTarget) || 0;
  const recentNotes = [...notes]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .slice(0, 3)
    .map((n) => {
      const book = books.find((b) => b.id === n.bookId);
      return { ...n, bookTitle: book ? book.title : '未知书籍', bookCover: book ? book.cover : '📄' };
    });

  res.json({
    overview: {
      totalBooks: books.length,
      reading: categories.reading,
      finished: categories.finished,
      wishlist: categories.wishlist,
      totalNotes: notes.length,
      totalPagesRead,
    },
    categories,
    yearlyGoal: {
      year: Number(year),
      target,
      finished: finishedThisYear.length,
      percent: target > 0 ? Math.round((finishedThisYear.length / target) * 1000) / 10 : 0,
    },
    finishedThisYear: finishedThisYear.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      cover: b.cover,
      finishedAt: b.finishedAt,
    })),
    recentNotes,
  });
});

module.exports = router;
