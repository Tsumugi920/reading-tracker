// 后端入口：Express 应用，端口 3015
const express = require('express');
const path = require('path');

const booksRouter = require('./routes/books');
const notesRouter = require('./routes/notes');
const goalsRouter = require('./routes/goals');
const statsRouter = require('./routes/stats');

const PORT = process.env.PORT || 3015;
const app = express();

app.use(express.json());

// 前端静态资源（client/ 目录）
app.use(express.static(path.join(__dirname, '..', 'client')));

// REST API 路由
app.use('/api/books', booksRouter);
app.use('/api/notes', notesRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/stats', statsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 未匹配到的 API 统一返回 404 JSON
app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(PORT, () => {
  console.log(`📚 reading-tracker 已启动: http://localhost:${PORT}`);
});
