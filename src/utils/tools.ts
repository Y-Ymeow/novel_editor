// 工具定义

export interface Tool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

export interface CharacterToolParams {
  characters: Array<{
    name: string
    gender: string
    personality: string
    background: string
    relationships: string
    notes: string
    summary: string
  }>
}

export interface ChapterToolParams {
  chapters: Array<{
    title: string
    description: string
  }>
}

// 创建人物列表工具
export const createCharactersTool: Tool = {
  type: 'function',
  function: {
    name: 'create_characters',
    description: '根据用户的描述创建多个人物角色，包含姓名、性别、性格、背景、人际关系等信息',
    parameters: {
      type: 'object',
      properties: {
        characters: {
          type: 'array',
          description: '人物列表',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '角色姓名'
              },
              gender: {
                type: 'string',
                description: '角色性别'
              },
              personality: {
                type: 'string',
                description: '角色性格特点'
              },
              background: {
                type: 'string',
                description: '角色背景故事'
              },
              relationships: {
                type: 'string',
                description: '角色人际关系'
              },
              notes: {
                type: 'string',
                description: '角色备注信息'
              },
              summary: {
                type: 'string',
                description: '角色摘要（简短概括）'
              }
            },
            required: ['name', 'gender', 'personality', 'background', 'relationships', 'notes', 'summary']
          }
        }
      },
      required: ['characters']
    }
  }
}

// 创建章节列表工具
export const createChaptersTool: Tool = {
  type: 'function',
  function: {
    name: 'create_chapters',
    description: '根据用户的描述创建多个章节，包含章节标题和详细描述（大纲式描述）',
    parameters: {
      type: 'object',
      properties: {
        chapters: {
          type: 'array',
          description: '章节列表',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: '章节标题'
              },
              description: {
                type: 'string',
                description: '章节描述（详细的大纲式描述，400-600字，涵盖开场、核心情节、主要人物、关键场景、结局等要素）'
              }
            },
            required: ['title', 'description']
          }
        }
      },
      required: ['chapters']
    }
  }
}

// 工具调用参数类型
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

// 工具响应类型
export interface ToolResponse {
  toolCallId: string
  response: any
}
