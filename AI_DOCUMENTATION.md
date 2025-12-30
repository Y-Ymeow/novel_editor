# AI 小说创作助手 - AI 开发文档

本文档为 AI 助手提供项目概览和开发指南，帮助理解代码结构、功能实现和设计思路。

## 项目概述

这是一个基于 React 的长篇小说创作辅助工具，核心功能是利用 AI 帮助用户进行小说创作。项目采用现代化的前端技术栈，支持多种数据存储方式和 AI API 集成。

## 技术栈

- **前端框架**: React 18+ (Hooks, TypeScript)
- **构建工具**: Vite 7+
- **样式**: Tailwind CSS
- **存储方案**:
  - LocalStorage (默认)
  - IndexedDB
  - MongoDB
- **AI 集成**: OpenAI 兼容 API，支持流式输出

## 项目结构

```
src/
├── components/       # 可复用组件
│   ├── AiInput.tsx          # AI 输入组件，支持模型选择、上下文参考
│   ├── FullscreenTextarea.tsx # 全屏文本编辑器
│   └── Navbar.tsx           # 导航栏组件
├── pages/            # 页面组件
│   ├── Chapters.tsx         # 章节管理页面
│   ├── Characters.tsx       # 人物管理页面
│   ├── Editor.tsx           # 编辑器页面（核心）
│   ├── Novels.tsx           # 小说管理页面
│   ├── NovelSelect.tsx      # 小说选择页面
│   └── Settings.tsx         # 设置页面
├── types/            # TypeScript 类型定义
│   └── index.ts              # 核心类型：Novel, Character, Chapter, AppSettings, PromptConfig
├── utils/            # 工具函数和业务逻辑
│   ├── api.ts               # API 调用（OpenAI 流式输出）
│   ├── database.ts          # MongoDB 操作
│   ├── indexedDB.ts         # IndexedDB 封装
│   ├── promptManager.ts     # Prompt 模板管理
│   ├── storage.ts           # LocalStorage 封装
│   └── storageWrapper.ts    # 统一存储接口
└── main.tsx          # 应用入口
```

## 核心数据模型

### Novel（小说）
```typescript
{
  id: string
  title: string
  description: string
  cover?: string
  createdAt: number
  updatedAt: number
}
```

### Character（人物）
```typescript
{
  id: string
  novelId: string
  name: string
  gender: string
  avatar?: string
  personality: string
  background: string
  relationships: string
  notes: string
  createdAt: number
}
```

### Chapter（章节）
```typescript
{
  id: string
  novelId: string
  title: string
  order: number
  description: string    // 章节描述，用于 AI 生成内容
  content: string        // 章节正文
  status: 'draft' | 'in-progress' | 'completed'
  createdAt: number
  updatedAt: number
}
```

### PromptConfig（Prompt 配置）
```typescript
{
  generateContent: string      // 生成章节正文的 Prompt
  generateDescription: string  // 生成章节描述的 Prompt
  generateCharacter: string    // 生成人物设定的 Prompt
  generateNovelDescription: string // 生成小说描述的 Prompt
}
```

## 核心功能实现

### 1. AI 输入组件 (AiInput.tsx)

**功能**:
- API 和模型选择
- 思考模式（reasoning）支持
- 上下文参考选择（人物、章节）
- 章节内容类型选择（正文/描述）
- 流式输出显示

**关键代码**:
```typescript
const handleGenerate = async () => {
  // 构建增强的 system prompt
  let enhancedSystemPrompt = systemPrompt || ''
  
  // 添加选中的人物信息
  if (selectedCharacters.length > 0) {
    enhancedSystemPrompt += '\n\n参考人物信息：\n'
    selectedCharacters.forEach(charId => {
      const char = characters.find(c => c.id === charId)
      if (char) {
        enhancedSystemPrompt += `- ${char.name}：${char.personality || char.background || '暂无描述'}\n`
      }
    })
  }
  
  // 调用流式 API
  await callOpenAIStream(
    prompt,
    enhancedSystemPrompt,
    selectedModel,
    selectedApi,
    enableThinking ? thinkingTokens : 0,
    (chunk) => {
      fullContent += chunk
      if (onStreaming) {
        onStreaming(fullContent)
      }
    }
  )
}
```

### 2. Prompt 管理 (promptManager.ts)

**功能**:
- 提供 4 个默认 Prompt 模板
- 支持用户自定义 Prompt
- 自动替换占位符

**占位符系统**:
- `generateContent`: `{novelTitle}`, `{novelDescription}`, `{characters}`, `{chapterTitle}`, `{chapterDescription}`, `{existingContent}`
- `generateDescription`: `{novelTitle}`, `{novelDescription}`, `{chapterTitle}`, `{previousChapterTitle}`, `{previousChapterDescription}`
- `generateCharacter`: `{novelTitle}`, `{novelDescription}`, `{input}`
- `generateNovelDescription`: `{input}`

**关键代码**:
```typescript
export function buildContentPrompt(params: ContentPromptParams): string {
  const prompt = getPrompts().generateContent
  return prompt
    .replace(/{novelTitle}/g, params.novelTitle || '未知小说')
    .replace(/{novelDescription}/g, params.novelDescription || '暂无简介')
    .replace(/{characters}/g, params.characters || '暂无人物')
    .replace(/{chapterTitle}/g, params.chapterTitle || '未命名章节')
    .replace(/{chapterDescription}/g, params.chapterDescription || '暂无描述')
    .replace(/{existingContent}/g, params.existingContent || '')
}
```

### 3. 编辑器页面 (Editor.tsx)

**功能**:
- 章节列表管理（桌面端侧边栏，移动端抽屉）
- 章节内容编辑
- AI 辅助生成
- 全屏编辑支持
- 流式输出自动滚动

**关键状态**:
```typescript
const [chapters, setChapters] = useState<Chapter[]>([])
const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null)
const [content, setContent] = useState('')
const [streamingContent, setStreamingContent] = useState('')
const [isStreaming, setIsStreaming] = useState(false)
const [showMobileDrawer, setShowMobileDrawer] = useState(false) // 移动端抽屉
```

**流式输出自动滚动**:
```typescript
const editorTextareaRef = useRef<HTMLTextAreaElement>(null)

useEffect(() => {
  if (isStreaming && editorTextareaRef.current) {
    editorTextareaRef.current.scrollTop = editorTextareaRef.current.scrollHeight
  }
}, [streamingContent, isStreaming])
```

### 4. 存储系统

#### LocalStorage (storage.ts)
- 简单键值对存储
- 自动数据迁移（models 格式兼容）
- 默认 Prompts 初始化

#### IndexedDB (indexedDB.ts)
- 版本化数据库（当前版本 2）
- 支持事务操作
- 自动升级兼容旧版本

#### MongoDB (database.ts)
- 使用 Mongoose 连接
- 支持连接测试
- 完整的 CRUD 操作

#### 统一接口 (storageWrapper.ts)
```typescript
export async function getChapters(novelId?: string): Promise<Chapter[]>
export async function saveChapters(chapters: Chapter[]): Promise<void>
export async function getCharacters(novelId?: string): Promise<Character[]>
export async function saveCharacters(characters: Character[]): Promise<void>
export async function getNovels(): Promise<Novel[]>
export async function saveNovels(novels: Novel[]): Promise<void>
```

## 响应式设计

### 桌面端 (lg及以上)
- 左侧固定侧边栏（320px）
- 右侧内容编辑区
- 章节列表常驻显示

### 移动端 (lg以下)
- 隐藏左侧侧边栏
- 顶部显示"章节列表"按钮
- 点击按钮从左侧滑出抽屉
- 抽屉包含章节列表和操作按钮
- 点击遮罩或关闭按钮收起抽屉

**关键样式**:
```tsx
{/* 桌面端侧边栏 */}
<div className="lg:w-80 bg-slate-800 border-r border-slate-700 flex flex-col hidden lg:flex">
  {/* 章节列表内容 */}
</div>

{/* 移动端抽屉 */}
{showMobileDrawer && (
  <>
    <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileDrawer(false)} />
    <div className="fixed inset-y-0 left-0 w-80 bg-slate-800 border-r border-slate-700 z-50 transform transition-transform lg:hidden">
      {/* 章节列表内容 */}
    </div>
  </>
)}
```

## AI 集成细节

### 流式输出 (api.ts)

```typescript
export async function callOpenAIStream(
  userPrompt: string,
  systemPrompt: string,
  model: string,
  apiConfig: ApiConfig,
  reasoningTokens: number,
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      max_tokens: 2000,
    }),
  })

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader!.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices[0]?.delta?.content
          if (content) {
            onChunk(content)
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  }
}
```

### 思考模式支持

- 检测模型是否支持思考（`canThink` 属性）
- 用户可启用思考模式并设置思考额度
- 思考模式下，模型会先进行推理再生成最终答案

## 开发注意事项

### 1. 类型安全
- 所有数据模型都有完整的 TypeScript 类型定义
- 使用 `as` 类型断言时要谨慎
- 优先使用类型推断

### 2. 状态管理
- 使用 React Hooks 管理组件状态
- 复杂状态考虑使用 `useReducer`
- 异步操作使用 `useEffect` 处理

### 3. 样式约定
- 使用 Tailwind CSS
- 颜色：`slate-800`（背景）、`slate-700`（边框）、`blue-600`（主色）、`green-600`（成功）、`red-600`（危险）
- 间距：`p-4`（标准）、`gap-2`（紧凑）、`gap-4`（宽松）
- 圆角：`rounded-lg`（小）、`rounded-xl`（中）、`rounded-2xl`（大）

### 4. 性能优化
- 使用 `useMemo` 和 `useCallback` 优化重渲染
- 列表渲染添加 `key` 属性
- 长列表考虑虚拟滚动

### 5. 错误处理
- API 调用添加 try-catch
- 用户友好的错误提示
- 关键操作添加确认对话框

### 6. 数据持久化
- 所有数据修改后立即保存
- 使用统一的存储接口
- 定期提醒用户备份数据

## 常见问题

### Q: 如何添加新的 AI 功能？
A: 在 `AiInput.tsx` 中添加新的功能按钮，在 `promptManager.ts` 中添加对应的 Prompt 模板。

### Q: 如何支持新的存储方式？
A: 在 `storageWrapper.ts` 中添加新的存储实现，确保接口一致。

### Q: 如何自定义 Prompt？
A: 用户可以在设置页面编辑 Prompt，开发者可以在 `promptManager.ts` 中修改默认值。

### Q: 如何处理大量数据？
A: IndexedDB 和 MongoDB 支持大量数据，LocalStorage 有 5-10MB 限制，建议使用 IndexedDB 或 MongoDB。

## 未来扩展方向

1. **协作功能**: 多用户协作编辑同一小说
2. **版本控制**: 章节版本历史和回滚
3. **导出格式**: 支持 PDF、EPUB 等格式导出
4. **AI 增强**: 更多 AI 功能，如情节建议、对话优化等
5. **云端同步**: 支持多设备数据同步
6. **主题定制**: 支持深色/浅色主题切换
7. **快捷键**: 编辑器快捷键支持
8. **统计功能**: 字数统计、写作时间统计等

## 相关文档

- [README.md](./README.md) - 用户使用指南
- [package.json](./package.json) - 项目依赖和脚本
- [tsconfig.json](./tsconfig.json) - TypeScript 配置
- [vite.config.ts](./vite.config.ts) - Vite 构建配置