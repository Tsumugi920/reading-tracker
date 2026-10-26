// 阅读目标路由：读取与设定年度阅读目标
const express = require('express');
const db = require('../db');

const router = express.Router();

// 汇总目标与今年完成情况
function goalProgress(data) {
  const target = Number(data.goal.yearlyTarget) || 0;
  const year = new Date().getFullYear();
  const finishedThisYear = data.books.filter(
    (b) => b.category === 'finished' && (b.finishedAt || '').slice(0, 4) === String(year)
  ).length;
  return {
    year,
    yearlyTarget: target,
    finishedThisYear,
    percent: target > 0 ? Math.round((finishedThisYear / target) * 1000) / 10 : 0,
    remaining: Math.max(0, target - finishedThisYear),
    updatedAt: data.goal.updatedAt || null,
  };
}

router.get('/', (req, res) => {
  res.json(goalProgress(db.read()));
});

// 设定年度目标：body 传 { yearlyTarget }
router.put('/', (req, res) => {
  const target = Number(req.body && req.body.yearlyTarget);
  if (!Number.isFinite(target) || target < 0 || target > 1000) {
    return res.status(400).json({ error: 'yearlyTarget 必须是 0-1000 之间的整数' });
  }
  const data = db.read();
  data.goal = { yearlyTarget: Math.round(target), updatedAt: new Date().toISOString() };
  db.write(data);
  res.json(goalProgress(data));
});

module.exports = router;
