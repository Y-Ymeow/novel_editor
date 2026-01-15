# AI 小说创作助手 - AI 开发文档

本文档为 AI 助手提供项目概览和开发指南，帮助理解代码结构、功能实现和设计思路。

## 项目概述

这是一个基于 React 的长篇小说创作辅助工具，核心功能是利用 AI 帮助用户进行小说创作。项目采用现代化的前端技术栈，支持多种数据存储方式和 AI API 集成。

## 技术栈

- **前端框架**: React 19+ (Hooks, TypeScript)
- **构建工具**: Vite 7+
- **样式**: Tailwind CSS
- **存储方案**:
  - LocalStorage (默认)
  - IndexedDB
  - MongoDB
- **AI 集成**: 多提供商支持，OpenAI 兼容 API，支持流式输出和工具调用

## 项目结构

```
src/
├── components/       # 可复用组件
│   ├── AiInput.tsx          # AI 输入组件，支持模型选择、上下文参考、思考模式
│   ├── BatchCreateCharacters.tsx # 批量创建人物组件
│   ├── CreateNovelModal.tsx  # 创建小说弹窗
│   ├── FullscreenTextarea.tsx # 全屏文本编辑器
│   └── Modal.tsx             # 通用模态框组件
├── pages/            # 页面组件
│   ├── Characters.tsx       # 人物管理页面
│   ├── Editor.tsx           # 编辑器页面（核心）
│   ├── NovelSelect.tsx      # 小说选择页面
│   ├── Resources.tsx        # 资源管理页面
│   ├── Settings.tsx         # 设置页面
│   └── subpage/             # 子页面
│       ├── editor/          # 编辑器子页面
│       │   ├── BatchChapterForm.tsx # 批量创建章节
│       │   ├── ChapterEditor.tsx     # 章节编辑器
│       │   ├── ChapterForm.tsx       # 章节表单
│       │   └── ChapterList.tsx       # 章节列表
│       ├── resources/       # 资源管理子页面
│       │   ├── Characters.tsx        # 人物卡片
│       │   └── Plots.tsx            # 情节管理
│       └── settings/        # 设置子页面
│           ├── ApiSettings.tsx        # API配置
│           ├── BackupSettings.tsx     # 备份设置
│           ├── DatabaseSettings.tsx   # 数据库设置
│           ├── ModelParametersSettings.tsx # 模型参数
│           └── PromptSettings.tsx     # Prompt配置
├── types/            # TypeScript 类型定义
│   └── index.ts              # 核心类型：Novel, Character, Chapter, AppSettings, PromptConfig, ApiConfig, ModelConfig
├── utils/            # 工具函数和业务逻辑
│   ├── api.ts               # API 调用（流式输出、工具调用）
│   ├── apiProvider.ts       # API提供商配置和工具
│   ├── tools.ts             # 工具定义（Function Calling）
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
  summary?: string        // 人物摘要，用于上下文参考
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
  description: string    // 章节描述（400-600字详细大纲）
  content: string        // 章节正文
  status: 'draft' | 'in-progress' | 'completed'
  createdAt: number
  updatedAt: number
}
```

### ApiConfig（API配置）
```typescript
{
  id: string
  name: string
  provider: ApiProviderType  // 'openai' | 'groq' | 'zhipu' | 'cerebras' | 'gemini' | 'custom'
  baseUrl: string
  apiKey: string
  models: ModelConfig[]
  selectedModel: string
  autoFetchModels: boolean
}
```

### ModelConfig（模型配置）
```typescript
{
  id: string
  name: string
  displayName?: string
  canThink: boolean         // 是否支持思考
  canUseTools: boolean       // 是否支持工具调用
  maxTokens: number
}
```

### PromptConfig（Prompt 配置）
```typescript
{
  generateContent: string      // 生成章节正文的 Prompt
  generateDescription: string  // 生成章节描述的 Prompt
  generateCharacter: string    // 生成人物设定的 Prompt
  generateNovelDescription: string // 生成小说描述的 Prompt
  generateBatchCharacters: string // 批量创建人物
  generateBatchChapters: string   // 批量创建章节
}
```

## 核心功能实现

### 1. API提供商系统 (apiProvider.ts)

**功能**:
- 支持多个API提供商
- 预定义各提供商的默认配置
- 支持从API自动获取模型列表
- 自动检测模型能力（思考、工具调用等）

**提供商配置**:
```typescript
export const PROVIDER_CONFIGS: Record<ApiProviderType, ProviderConfig> = {
  openai: {
    type: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModels: []
  },
  groq: {
    type: 'groq',
    name: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModels: []
  },
  zhipu: {
    type: 'zhipu',
    name: '智谱AI',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModels: []
  },
  cerebras: {
    type: 'cerebras',
    name: 'Cerebras',
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModels: []
  },
  gemini: {
    type: 'gemini',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    supportsModelsApi: false,
    authHeader: 'x-goog-api-key',
    authPrefix: '',
    defaultModels: []
  },
  custom: {
    type: 'custom',
    name: '自定义',
    defaultBaseUrl: 'https://api.openai.com/v1',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModels: []
  }
}
```

**关键函数**:
```typescript
// 从API获取模型列表
export async function fetchModelsFromApi(
  baseUrl: string,
  apiKey: string,
  providerType: ApiProviderType
): Promise<ModelConfig[]>

// 获取默认模型
export function getDefaultModels(providerType: ApiProviderType): ModelConfig[]
```

### 2. 工具调用系统 (tools.ts)

**工具定义**:
```typescript
export const createCharactersTool: Tool = {
  type: 'function',
  function: {
    name: 'create_characters',
    description: '根据用户的描述创建多个人物角色',
    parameters: {
      type: 'object',
      properties: {
        characters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              gender: { type: 'string' },
              personality: { type: 'string' },
              background: { type: 'string' },
              relationships: { type: 'string' },
              notes: { type: 'string' },
              summary: { type: 'string' }
            }
          }
        }
      }
    }
  }
}

export const createChaptersTool: Tool = {
  type: 'function',
  function: {
    name: 'create_chapters',
    description: '根据用户的描述创建多个章节',
    parameters: {
      type: 'object',
      properties: {
        chapters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' }
            }
          }
        }
      }
    }
  }
}
```

### 3. API调用系统 (api.ts)

**流式输出**:
```typescript
export async function callOpenAIStream(
  prompt: string,
  systemPrompt?: string,
  model?: string,
  apiConfig?: any,
  thinkingTokens: number = 0,
  onChunk?: (chunk: string, fullText: string) => void,
  onRawData?: (rawData: string) => void
): Promise<string>
```

**工具调用**:
```typescript
export async function callOpenAIWithTools(
  prompt: string,
  tools: any[],
  systemPrompt?: string,
  model?: string,
  apiConfig?: any
): Promise<ToolCallResult>
```

**思考模式支持**:
- Groq: `reasoning_format` (parsed/raw/hidden), `reasoning_effort` (none/default/low/medium/high)
- Cerebras: `reasoning_effort` (low/medium/high), `disable_reasoning` (boolean)
- 智谱AI: `thinking` (enabled/disabled)
- OpenAI: `reasoning_effort` (none/low/medium/high)

### 4. AI输入组件 (AiInput.tsx)

**功能**:
- 多API提供商支持
- 模型选择器
- 思考模式开关
- 上下文参考选择（人物、章节、情节）
- 摘要/全文模式切换
- 流式输出显示
- 思考过程预览

**关键代码**:
```typescript
// 思考模式处理
const [enableThinking, setEnableThinking] = useState(false)
const [thinkingTokens, setThinkingTokens] = useState(1000)

// 检查模型是否支持思考
const model = apis.find(a => a.id === selectedApiId)?.models.find(m => m.name === selectedModel)
const canThink = model?.canThink

// 调用API
await callOpenAIStream(
  prompt,
  enhancedSystemPrompt,
  selectedModel,
  selectedApi,
  enableThinking ? thinkingTokens : 0,
  onChunk,
  onRawData
)
```

### 5. 批量创建组件

**BatchCreateCharacters.tsx**:
```typescript
const handleBatchAiGenerate = async (generated: string) => {
  const result = await callOpenAIWithTools(
    generated,
    [createCharactersTool],
    getBatchCharactersPrompt()
  )

  if (result.toolCalls && result.toolCalls.length > 0) {
    const characterToolCall = result.toolCalls.find(tc => tc.name === 'create_characters')
    if (characterToolCall && characterToolCall.arguments.characters) {
      const validCharacters = characterToolCall.arguments.characters.filter(
        (item: any) => typeof item === 'object' && item.name
      )
      setPendingCharacters(validCharacters)
      setShowBatchConfirmModal(true)
    }
  } else if (result.content) {
    throw new Error('AI没有调用工具，请检查模型是否支持工具调用')
  }
}
```

**BatchChapterForm.tsx**:
```typescript
const handleBatchAiGenerate = async (generated: string) => {
  const result = await callOpenAIWithTools(
    generated,
    [createChaptersTool],
    getBatchChaptersPrompt()
  )

  if (result.toolCalls && result.toolCalls.length > 0) {
    const chapterToolCall = result.toolCalls.find(tc => tc.name === 'create_chapters')
    if (chapterToolCall && chapterToolCall.arguments.chapters) {
      const validChapters = chapterToolCall.arguments.chapters.filter(
        (item: any) => typeof item === 'object' && item.title
      )
      // 转换为JSON格式显示
      setBatchInput(validChapters.map(c => JSON.stringify(c)).join('\n'))
    }
  }
}
```

### 6. 思考模式实现

**不同提供商的思考参数**:

**Groq**:
```typescript
if (providerType === 'groq') {
  if (thinkingTokens > 0) {
    requestBody.reasoning_format = 'raw'
    requestBody.reasoning_effort = 'high'
  } else {
    requestBody.reasoning_effort = 'none'
  }
}
```

**Cerebras**:
```typescript
if (providerType === 'cerebras') {
  const modelName = (model || selectedApi.selectedModel).toLowerCase()
  if (thinkingTokens > 0) {
    requestBody.max_tokens = thinkingTokens
    if (modelName.includes('gpt-oss-120b')) {
      requestBody.reasoning_effort = 'high'
    }
    requestBody.disable_reasoning = false
  } else {
    requestBody.disable_reasoning = true
  }
}
```

**智谱AI**:
```typescript
if (providerType === 'zhipu') {
  if (thinkingTokens > 0) {
    requestBody.thinking = { type: 'enabled' }
  } else {
    requestBody.thinking = { type: 'disabled' }
  }
}
```

**OpenAI**:
```typescript
if (providerType === 'openai') {
  if (thinkingTokens > 0) {
    requestBody.max_tokens = thinkingTokens
    requestBody.reasoning_effort = 'high'
  } else {
    requestBody.reasoning_effort = 'none'
  }
}
```

### 7. 全局模型参数

**ModelParameters**:
```typescript
{
  temperature: number      // 0-2，控制输出的随机性
  topP: number              // 0-1，核采样参数
  frequencyPenalty: number // -2到2，减少重复内容
  presencePenalty: number   // -2到2，鼓励谈论新话题
}
```

**应用方式**:
```typescript
const modelParameters = settings.modelParameters

const requestBody: any = {
  model: model || selectedApi.selectedModel,
  messages,
  temperature: modelParameters.temperature,
  top_p: modelParameters.topP,
  stream: true,
}

if (modelParameters.frequencyPenalty !== undefined) {
  requestBody.frequency_penalty = modelParameters.frequencyPenalty
}
if (modelParameters.presencePenalty !== undefined) {
  requestBody.presence_penalty = modelParameters.presencePenalty
}
```

## 开发注意事项

### 1. 添加新的API提供商

```typescript
// 1. 在 types/index.ts 添加新的提供商类型
export type ApiProviderType = 'openai' | 'groq' | 'zhipu' | 'cerebras' | 'gemini' | 'custom' | 'newprovider'

// 2. 在 apiProvider.ts 添加配置
export const PROVIDER_CONFIGS: Record<ApiProviderType, ProviderConfig> = {
  newprovider: {
    type: 'newprovider',
    name: 'New Provider',
    defaultBaseUrl: 'https://api.newprovider.com/v1',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModels: []
  }
}

// 3. 在 api.ts 添加特殊参数处理
if (providerType === 'newprovider') {
  // 添加新提供商的特殊参数
}
```

### 2. 添加新的工具

```typescript
// 在 tools.ts 添加新工具
export const newTool: Tool = {
  type: 'function',
  function: {
    name: 'new_tool',
    description: '工具描述',
    parameters: {
      type: 'object',
      properties: {
        // 参数定义
      },
      required: ['param1']
    }
  }
}
```

### 3. 调试工具调用

```typescript
// 在 api.ts 中已添加调试日志
console.log('Tool Call API Response:', JSON.stringify(data, null, 2))
console.log('No tool_calls in response. Message:', choice.message)
```

### 4. 错误处理

```typescript
// 检查模型是否支持工具调用
const modelConfig = selectedApi.models.find((m: any) => m.name === (model || selectedApi.selectedModel))
if (!modelConfig?.canUseTools) {
  throw new Error(`模型 ${model || selectedApi.selectedModel} 不支持工具调用`)
}

// 处理AI返回文本而不是工具调用
if (result.content) {
  throw new Error('AI没有调用工具，而是返回了文本内容')
}
```

## 常见问题

### Q: 如何添加新的API提供商？
A: 按照"添加新的API提供商"章节的步骤操作。

### Q: 为什么AI没有调用工具？
A: 检查以下几点：
1. 模型是否支持工具调用（在设置中勾选"支持工具"）
2. Prompt是否明确告诉AI要使用工具
3. 查看控制台调试信息

### Q: 思考模式如何工作？
A: 思考模式由provider和模型能力动态控制，不同provider使用不同的参数。启用思考模式会增加API调用成本。

### Q: 如何禁用思考模式？
A: 在AI输入组件中，不勾选"启用思考模式"选项，或将思考额度设置为0。

### Q: 全局模型参数如何应用？
A: 全局参数会应用于所有API调用，除非被特定参数覆盖。

## 相关文档

- [README.md](./README.md) - 用户使用指南
- [package.json](./package.json) - 项目依赖和脚本
- [tsconfig.json](./tsconfig.json) - TypeScript 配置
- [vite.config.ts](./vite.config.ts) - Vite 构建配置
