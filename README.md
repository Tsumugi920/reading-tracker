# 📚 reading-tracker 读书追踪

一个前后端分离的读书追踪全栈小应用：管理书架（在读 / 已读 / 想读）、记录阅读进度、
写读书笔记、设定年度阅读目标并查看统计。

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript（ES Modules，无框架），位于 `client/`
- **后端**：Node.js + Express，位于 `server/`
- **持久化**：`server/data.json` 文件（无需数据库），所有增删改都会实时写回该文件

## 目录结构

```
reading-tracker/
├── package.json              # 启动脚本 npm start（端口 3015）
├── README.md
├── client/                   # 前端
│   ├── index.html            # 页面骨架（书架 / 笔记 / 目标 / 统计 四个标签页）
│   ├── style.css             # 样式
│   ├── app.js                # 入口：标签切换、模块装配
│   └── js/
│       ├── api.js            # fetch 封装
│       ├── utils.js          # 转义、日期格式化、toast 等工具
│       ├── books.js          # 书架：列表 / 筛选 / 增删改 / 进度更新
│       ├── notes.js          # 读书笔记：增删改、按书过滤
│       ├── goals.js          # 阅读目标：设定与进度展示
│       └── stats.js          # 统计：总览卡片 / 分类分布 / 年度目标
└── server/                   # 后端
    ├── index.js              # Express 入口，端口 3015，托管前端静态资源
    ├── db.js                 # data.json 读写与自增 id
    ├── data.json             # 数据文件（内置 12 本示例书籍、6 条笔记、年度目标）
    └── routes/
        ├── books.js          # /api/books      书籍 CRUD + 进度更新
        ├── notes.js          # /api/notes      笔记 CRUD
        ├── goals.js          # /api/goals      年度目标读取与设定
        └── stats.js          # /api/stats      统计数据
```

## 安装与启动

要求 Node.js ≥ 16。

```bash
cd reading-tracker
npm install
npm start
```

启动后浏览器打开 **http://localhost:3015** 即可使用。

> 后端端口默认 **3015**，可通过环境变量覆盖：`PORT=8080 npm start`。
> 开发模式支持改动后自动重启：`npm run dev`。

## REST API

| 方法   | 路径                        | 说明                                       |
| ------ | --------------------------- | ------------------------------------------ |
| GET    | `/api/books`                | 书籍列表，支持 `?category=` 与 `?keyword=` |
| GET    | `/api/books/:id`            | 书籍详情                                   |
| POST   | `/api/books`                | 新增书籍                                   |
| PUT    | `/api/books/:id`            | 编辑书籍（含状态切换）                     |
| PATCH  | `/api/books/:id/progress`   | 更新阅读进度 `{ "currentPage": 100 }`      |
| DELETE | `/api/books/:id`            | 删除书籍（连同其笔记）                     |
| GET    | `/api/notes`                | 笔记列表，支持 `?bookId=` 按书过滤         |
| POST   | `/api/notes`                | 新增笔记 `{ "bookId": 1, "content": "…" }` |
| PUT    | `/api/notes/:id`            | 编辑笔记                                   |
| DELETE | `/api/notes/:id`            | 删除笔记                                   |
| GET    | `/api/goals`                | 年度目标与完成进度                         |
| PUT    | `/api/goals`                | 设定年度目标 `{ "yearlyTarget": 20 }`      |
| GET    | `/api/stats`                | 统计：总览、分类分布、年度目标、最近笔记   |
| GET    | `/api/health`               | 健康检查                                   |

curl 示例：

```bash
# 列出全部书籍
curl http://localhost:3015/api/books

# 新增书籍
curl -X POST http://localhost:3015/api/books \
  -H 'Content-Type: application/json' \
  -d '{"title":"三体","author":"刘慈欣","category":"reading","totalPages":302,"cover":"🚀"}'

# 新增笔记
curl -X POST http://localhost:3015/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"bookId":1,"content":"精彩！","page":100}'
```

## 页面功能

- **📖 书架**：全部 / 在读 / 已读 / 想读 筛选与关键词搜索；添加、编辑、删除书籍；
  在读书籍可输入页码直接更新进度（读到最后一页自动标记为已读）。
- **✍️ 读书笔记**：选书写笔记（可带页码），按书过滤，支持编辑与删除。
- **🎯 阅读目标**：设定年度读完本数，展示完成进度条与剩余数量。
- **📊 统计**：书籍 / 笔记 / 累计页数总览，分类分布图，今年读完列表，年度目标进度。

## 数据说明

- 初始数据内置 **12 本示例书籍**（5 本已读、4 本在读、3 本想读）、**6 条读书笔记**
  和一个 **12 本的年度阅读目标**。
- 所有修改实时写入 `server/data.json`；删除该文件后重启服务会自动生成空数据结构。
