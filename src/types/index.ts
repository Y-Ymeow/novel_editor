export interface ModelConfig {
  name: string
  canThink: boolean
  canUseTools: boolean
  maxTokens: number
}

export interface ApiConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: ModelConfig[]
  selectedModel: string
}

export interface DatabaseConfig {
  id: string
  name: string
  type: 'localStorage' | 'indexedDB' | 'mongodb'
  connectionString?: string
  enabled: boolean
}

export interface Novel {
  id: string
  title: string
  description: string
  cover?: string
  createdAt: number
  updatedAt: number
}

export interface Character {
  id: string
  novelId: string
  name: string
  gender: string
  personality: string
  background: string
  relationships: string
  notes: string
  summary?: string
  createdAt: number
}

export interface Chapter {
  id: string
  novelId: string
  title: string
  order: number
  description: string
  content: string
  status: 'draft' | 'in-progress' | 'completed'
  createdAt: number
  updatedAt: number
}

export interface PromptConfig {
  generateContent: string
  generateDescription: string
  generateCharacter: string
  generateNovelDescription: string
}

export const DEFAULT_PROMPTS: PromptConfig = {
  generateContent: `你是一个专业的长篇小说创作助手。你正在协助作者创作一部长篇小说，现在需要为某个章节生成内容。

【小说信息】
标题：{{novelTitle}}
简介：{{novelDescription}}

【当前章节】
章节标题：{{chapterTitle}}
章节描述：{{chapterDescription}}

【上一章信息】
标题：{{previousChapterTitle}}
描述：{{previousChapterDescription}}

【本章已写内容】（最后500字）：
{{existingContent}}

【创作要求】
1. 你正在创作长篇小说的**一个章节**，不是独立短篇故事，不要试图写完整个故事
2. 根据用户的要求和章节描述，生成**本章的后续内容**，保持叙事连贯性
3. 直接生成小说正文，不要生成大纲、结构分析或章节总结
4. 使用叙事性的语言，包含对话、动作描写、心理描写、环境描写等小说元素
5. 保持与已有内容的自然衔接，风格统一
6. 不要使用 Markdown 标题格式（如 ##、### 等）
7. 内容要生动具体，有画面感，让读者能够沉浸在故事中
8. 控制内容长度，根据用户的要求生成适当长度的内容，不要一次性写完整个章节`,

  generateDescription: `你是一个专业的长篇小说创作助手。你正在协助作者创作一部长篇小说，现在需要为某个章节生成描述。

【小说信息】
标题：{{novelTitle}}
简介：{{novelDescription}}

【章节信息】
章节标题：{{chapterTitle}}

【上一章信息】
标题：{{previousChapterTitle}}
描述：{{previousChapterDescription}}

【创作要求】
1. 你正在创作长篇小说的**一个章节**，不是独立短篇故事
2. 生成一个简洁的章节描述，用于指导后续的正文创作
3. **重要：描述要简洁明了，控制在200-300字以内，抓住核心要点**
4. 描述应包含：本章的核心情节、主要人物、关键场景、重要转折
5. 不要写成正文，不要有对话、详细描写，只写大纲式的内容
6. 不要试图写完整个故事，只关注本章的内容
7. 与上一章保持连贯，承接上文的情节发展
8. 示例格式（仅供参考）：
   本章讲述主角在XX场景遇到XX人物，发生XX冲突。主角通过XX方式解决问题，为后续XX事件埋下伏笔。`,

  generateCharacter: `你是一个专业的小说创作助手。请根据用户的要求生成一个详细的人物设定。

【小说信息】
标题：{{novelTitle}}
简介：{{novelDescription}}

【输入信息】
{{input}}

【创作要求】
1. 生成一个完整的人物设定，包含姓名、性别、性格、背景、人际关系等
2. 人物要符合小说的风格和设定
3. 性格要鲜明，有层次感，避免过于扁平
4. 背景故事要合理，与小说主题相关
5. 人际关系要清晰，为后续情节发展提供空间
6. 输出格式：
   姓名：XXX
   性别：XXX
   性格：XXX
   背景：XXX
   人际关系：XXX`,

  generateNovelDescription: `你是一个专业的小说创作助手。请根据用户的要求生成小说的描述/简介。

【输入信息】
{{input}}

【创作要求】
1. 生成一个吸引人的小说简介，概括小说的核心内容和主题
2. 简介要简洁明了，控制在200-300字以内
3. 突出小说的亮点和特色，吸引读者
4. 语言要生动，有感染力
5. 避免剧透，只透露必要的设定和冲突`
}

export interface AppSettings {
  apis: ApiConfig[]
  selectedApiId: string | null
  databases: DatabaseConfig[]
  selectedDatabaseId: string | null
  useLocalStorage: boolean
  useIndexedDB: boolean
  storageType: 'localStorage' | 'indexedDB' | 'mongodb'
  selectedNovelId: string | null
  prompts: PromptConfig
}

export interface BackupData {
  version: string
  timestamp: number
  novels: Novel[]
  characters: Character[]
  chapters: Chapter[]
}
