export type ApiProviderType = 'openai' | 'groq' | 'zhipu' | 'cerebras' | 'gemini' | 'custom'

export interface ModelConfig {
  id: string
  name: string
  displayName?: string
  canThink: boolean
  canUseTools: boolean
  maxTokens: number
}

export interface ApiConfig {
  id: string
  name: string
  provider: ApiProviderType
  baseUrl: string
  apiKey: string
  models: ModelConfig[]
  selectedModel: string
  autoFetchModels: boolean
}

export interface ProviderConfig {
  type: ApiProviderType
  name: string
  defaultBaseUrl: string
  supportsModelsApi: boolean
  modelsEndpoint?: string
  authHeader: string
  authPrefix: string
  defaultModels?: ModelConfig[]
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

export interface Plot {
  id: string
  novelId: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
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
  generateBatchCharacters: string
  generateBatchChapters: string
}

export type GroqReasoningFormat = 'parsed' | 'raw' | 'hidden'
export type GroqReasoningEffort = 'none' | 'default' | 'low' | 'medium' | 'high'

export interface ModelParameters {
  temperature: number
  topP: number
  maxTokens?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export const DEFAULT_MODEL_PARAMETERS: ModelParameters = {
  temperature: 0.8,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
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

  generateDescription: `你是一个专业的长篇小说创作助手。你正在协助作者创作一部长篇小说，现在需要为某个章节生成详细的大纲式描述（细纲）。

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
2. 生成一个详细的章节大纲（细纲），用于指导后续的正文创作
3. **重要：描述要详细准确，控制在400-600字，涵盖本章所有关键内容**
4. 描述必须包含以下要素：
   - 开场场景：本章从哪里开始，环境如何
   - 核心情节：本章发生的主要事件和冲突
   - 主要人物：本章涉及哪些重要角色，他们各自的作用
   - 关键场景：本章的重要场景和转折点
   - 结局：本章如何结束，为下一章做了什么铺垫
5. 使用大纲式语言，不要写成正文，不要有对话和详细描写
6. 确保描述与后续生成的正文内容高度一致，偏差不能太大
7. 与上一章保持连贯，承接上文的情节发展
8. 示例格式（仅供参考）：
   本章从XX场景开始，主角正在XX。随后，主角遇到XX人物/事件，发生XX冲突。在XX场景中，通过XX方式，主角解决了问题/遭遇挫折。本章结束时，主角的状态是XX，为后续XX事件埋下伏笔。`,

generateCharacter: `你是一个专业的小说人物创作助手。请根据用户的描述生成一个详细的人物设定。

【小说信息】
标题：{{novelTitle}}
简介：{{novelDescription}}

【输入信息】
{{input}}

【重要提示】
🔧 你可以使用 create_characters 工具来创建人物
🔧 工具会自动处理数据格式，你不需要返回 JSON
🔧 直接调用工具即可，工具会接收人物列表参数

【创作要求】
1. 生成一个完整的人物设定，包含姓名、性别、性格、背景、人际关系等
2. 使用 create_characters 工具，传入包含一个人物的列表
3. 人物必须包含以下信息：
   - name: 姓名
   - gender: 性别
   - personality: 性格特点
   - background: 背景故事
   - relationships: 人际关系
   - notes: 备注信息
   - summary: 人物摘要（简短概括）

4. 人物要符合小说的风格和设定
5. 性格要鲜明，有层次感，避免过于扁平
6. 背景故事要合理，与小说主题相关
7. 人际关系要清晰，为后续情节发展提供空间
8. 每个字段都要有具体内容，不要留空或写"无"
9. 所有字段值都必须是字符串类型`,

  generateNovelDescription: `你是一个专业的小说创作助手。请根据用户的要求生成小说的描述/简介。

【输入信息】
{{input}}

【创作要求】
1. 生成一个吸引人的小说简介，概括小说的核心内容和主题
2. 简介要简洁明了，控制在200-300字以内
3. 突出小说的亮点和特色，吸引读者
4. 语言要生动，有感染力
5. 避免剧透，只透露必要的设定和冲突`,

generateBatchCharacters: `你是一个专业的小说人物创作助手。请根据用户的描述生成多个人物的完整信息。

【小说信息】
标题：{{novelTitle}}
简介：{{novelDescription}}

【重要提示】
🔧 你可以使用 create_characters 工具来创建人物
🔧 工具会自动处理数据格式，你不需要返回 JSON
🔧 直接调用工具即可，工具会接收人物列表参数

【创作要求】
1. 根据用户的描述生成多个人物的完整信息
2. 使用 create_characters 工具，传入人物列表
3. 每个人物必须包含以下信息：
   - name: 姓名
   - gender: 性别
   - personality: 性格特点
   - background: 背景故事
   - relationships: 人际关系
   - notes: 备注信息
   - summary: 人物摘要（简短概括）

4. 人物要符合小说的风格和设定
5. 性格要鲜明，有层次感，避免过于扁平
6. 背景故事要合理，与小说主题相关
7. 人际关系要清晰，为后续情节发展提供空间
8. 每个字段都要有具体内容，不要留空或写"无"
9. 人际关系要考虑与其他已存在角色的关联
10. 所有字段值都必须是字符串类型`,

  generateBatchChapters: `你是一个专业的小说创作助手。请根据用户的描述生成多个章节的完整信息。

【小说信息】
标题：{{novelTitle}}
简介：{{novelDescription}}

【用户输入】
{{input}}

【创作要求】
1. 根据用户的描述生成多个章节的完整信息
2. 返回格式必须是 JSON 数组，每个元素包含所有章节字段
3. 必须包含的字段：
   - title: 章节标题
   - description: 章节描述（详细的大纲式描述，400-600字）
4. 示例格式：
   [
     {
       "title": "第一章：初遇",
       "description": "本章从XX场景开始，主角正在XX。随后，主角遇到XX人物，发生XX冲突。在XX场景中，通过XX方式，主角解决了问题。本章结束时，主角的状态是XX，为后续XX事件埋下伏笔。"
     },
     {
       "title": "第二章：危机",
       "description": "本章承接上一章，主角面临XX新的挑战。在XX场景中，主角遭遇XX危机。通过XX努力，主角暂时化解了危机，但发现了更大的阴谋。本章为后续情节发展奠定了基础。"
     }
   ]
5. 只返回 JSON 数组，不要其他文字
6. 章节要符合小说的整体风格和情节走向
7. 每个章节的描述要详细准确，400-600字，涵盖开场、核心情节、主要人物、关键场景、结局等要素
8. 章节之间要有连贯性，形成完整的故事线`
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
  modelParameters: ModelParameters
}

export interface BackupData {
  version: string
  timestamp: number
  novels: Novel[]
  characters: Character[]
  chapters: Chapter[]
  plots: Plot[]
}
