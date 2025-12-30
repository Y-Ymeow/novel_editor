# AI 小说创作助手

一个基于 React 的长篇小说创作辅助工具，利用 AI 帮助用户进行小说创作、人物设定和章节管理。

## 功能特性

### 📖 小说管理
- 创建和管理多部小说
- 为每部小说设置标题和简介
- 支持小说的导入和导出

### 👤 人物管理
- 创建详细的人物卡片
- 记录人物的姓名、性别、性格、背景、人际关系等信息
- 支持使用 AI 生成人物设定
- 历史记录功能，方便快速填写

### 📝 章节编辑
- 章节列表管理，支持拖拽排序
- 章节描述功能，用于指导 AI 生成内容
- 全屏编辑模式，提供更好的写作体验
- AI 辅助生成章节内容
- 自动滚动到最新生成的内容

### 🤖 AI 功能
- 支持多个 API 配置（OpenAI 兼容接口）
- 支持 AI 思考模式（reasoning 模型）
- 支持流式输出，实时显示生成内容
- 可选择人物和章节作为上下文参考
- 自定义 Prompt 模板

### ⚙️ 数据存储
- LocalStorage：浏览器本地存储（默认）
- IndexedDB：浏览器数据库存储
- MongoDB：外部数据库存储
- 支持数据备份和恢复

### 📱 响应式设计
- 桌面端：左右分栏布局
- 移动端：抽屉式章节列表

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 使用指南

### 1. 配置 API

1. 进入"设置"页面
2. 选择"API 配置"标签
3. 点击"+ 添加 API"
4. 填写 API 名称、基础 URL 和 API Key
5. 添加模型并配置参数

### 2. 创建小说

1. 进入"小说管理"页面
2. 点击"+ 新建小说"
3. 填写小说标题和简介
4. 保存后即可开始创作

### 3. 创建人物

1. 进入"人物卡片"页面
2. 点击"+ 新建人物"
3. 手动填写或使用 AI 生成人物设定
4. 保存人物信息

### 4. 编辑章节

1. 进入"编辑器"页面
2. 点击"+ 添加章节"创建新章节
3. 填写章节标题，可手动输入或使用 AI 生成描述
4. 在编辑器中编写内容
5. 使用 AI 辅助生成功能，选择上下文参考
6. 保存章节内容

### 5. 自定义 Prompt

1. 进入"设置"页面
2. 选择"Prompt 配置"标签
3. 编辑以下 4 个 Prompt 模板：
   - 生成章节正文
   - 生成章节描述
   - 生成人物设定
   - 生成小说描述
4. 点击"保存配置"应用更改
5. 如不满意可点击"恢复默认"

## 技术栈

- **前端框架**: React
- **构建工具**: Vite
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **存储**: LocalStorage / IndexedDB / MongoDB

## 项目结构

```
src/
├── components/       # 组件
│   ├── AiInput.tsx          # AI 输入组件
│   ├── FullscreenTextarea.tsx # 全屏文本编辑器
│   └── Navbar.tsx           # 导航栏
├── pages/            # 页面
│   ├── Chapters.tsx         # 章节管理
│   ├── Characters.tsx       # 人物管理
│   ├── Editor.tsx           # 编辑器
│   ├── Novels.tsx           # 小说管理
│   ├── NovelSelect.tsx      # 小说选择
│   └── Settings.tsx         # 设置
├── types/            # 类型定义
│   └── index.ts
├── utils/            # 工具函数
│   ├── api.ts               # API 调用
│   ├── database.ts          # 数据库操作
│   ├── indexedDB.ts         # IndexedDB 存储
│   ├── promptManager.ts     # Prompt 管理
│   ├── storage.ts           # LocalStorage 存储
│   └── storageWrapper.ts    # 存储封装
└── main.tsx          # 应用入口
```

## 占位符说明

在 Prompt 配置中可以使用以下占位符：

### 生成章节正文
- `{novelTitle}` - 小说标题
- `{novelDescription}` - 小说简介
- `{characters}` - 人物信息
- `{chapterTitle}` - 章节标题
- `{chapterDescription}` - 章节描述
- `{existingContent}` - 已有内容

### 生成章节描述
- `{novelTitle}` - 小说标题
- `{novelDescription}` - 小说简介
- `{chapterTitle}` - 章节标题
- `{previousChapterTitle}` - 上一章标题
- `{previousChapterDescription}` - 上一章描述

### 生成人物
- `{novelTitle}` - 小说标题
- `{novelDescription}` - 小说简介
- `{input}` - 用户输入

### 生成小说描述
- `{input}` - 用户输入

## 注意事项

- 使用 AI 功能需要配置有效的 API
- 数据存储在浏览器中，清除浏览器数据会丢失所有内容
- 建议定期导出备份
- MongoDB 连接需要自行部署数据库

## 许可证

MIT