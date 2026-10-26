// 数据持久化模块：所有数据保存在 server/data.json 文件里
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

function emptyData() {
  return { books: [], notes: [], goal: { yearlyTarget: 12 } };
}

function read() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (!Array.isArray(data.books)) data.books = [];
    if (!Array.isArray(data.notes)) data.notes = [];
    if (!data.goal || typeof data.goal !== 'object') data.goal = { yearlyTarget: 12 };
    return data;
  } catch (err) {
    // 文件缺失或损坏时重置为空数据，避免服务直接崩溃
    console.warn(`[db] 读取 ${DATA_FILE} 失败（${err.message}），已重置为空数据`);
    const data = emptyData();
    write(data);
    return data;
  }
}

function write(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 生成自增 id：取当前列表最大 id + 1
function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

module.exports = { read, write, nextId, DATA_FILE };
