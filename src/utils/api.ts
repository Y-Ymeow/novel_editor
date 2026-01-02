import { storage } from './storage'

export async function callOpenAI(
  prompt: string,
  systemPrompt?: string,
  model?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiConfig?: any
): Promise<string> {
  const settings = storage.getSettings()
  const selectedApi = apiConfig || settings.apis.find(api => api.id === settings.selectedApiId)

  if (!selectedApi) {
    throw new Error('请先在设置中配置 API')
  }

  const messages: Array<{ role: string; content: string }> = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  const response = await fetch(`${selectedApi.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${selectedApi.apiKey}`,
    },
    body: JSON.stringify({
      model: model || selectedApi.selectedModel,
      messages,
      temperature: 0.8,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API 请求失败: ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

export async function callOpenAIStream(
  prompt: string,
  systemPrompt?: string,
  model?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiConfig?: any,
  thinkingTokens: number = 0,
  onChunk?: (chunk: string, fullText: string) => void,
  onRawData?: (rawData: string) => void
): Promise<string> {
  const settings = storage.getSettings()
  const selectedApi = apiConfig || settings.apis.find(api => api.id === settings.selectedApiId)

  if (!selectedApi) {
    throw new Error('请先在设置中配置 API')
  }

  const messages: Array<{ role: string; content: string }> = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestBody: any = {
    model: model || selectedApi.selectedModel,
    messages,
    temperature: 0.8,
    stream: true,
  }

  // 检查模型类型
  const modelName = (model || selectedApi.selectedModel).toLowerCase()
  const isZhipu = modelName.includes('glm')
  const supportsReasoningEffort = modelName.includes('gpt') || modelName.includes('qwen')

  if (thinkingTokens > 0) {
    if (isZhipu) {
      // 智谱模型使用 thinking 参数
      requestBody.thinking = {
        type: 'enabled'
      }
    } else if (supportsReasoningEffort) {
      // gpt 和 qwen 支持 reasoning_effort
      requestBody.max_tokens = thinkingTokens
      requestBody.reasoning_effort = 'high'
    } else {
      // 其他思考模型（如 DeepSeek R1）使用 max_tokens
      requestBody.max_tokens = thinkingTokens
    }
  } else {
    // 不启用思考模式
    requestBody.max_tokens = 2000

    // 对于支持 reasoning_effort 的模型，设置为 none 来禁用思考
    if (supportsReasoningEffort) {
      requestBody.reasoning_effort = 'none'
    }

    if (isZhipu) {
      // 智谱模型使用 thinking 参数
      requestBody.thinking = {
        type: 'disabled'
      }
    }
  }

  const response = await fetch(`${selectedApi.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${selectedApi.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API 请求失败: ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法读取响应流')
  }

  const decoder = new TextDecoder()
  let fullContent = ''
  let dataContent = ''
  let inThinking = false
  let added = false
  let displayContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue



        try {
          const parsed = JSON.parse(data)
          // 检查是否有推理内容（DeepSeek R1, OpenAI o1/o3 等）
          const reasoningContent = parsed.choices[0]?.delta?.reasoning_content || ''
          const content = parsed.choices[0]?.delta?.content || ''

          // 只有启用思考模式时才处理推理内容
          if (thinkingTokens > 0) {
            // 如果有推理内容，先添加推理内容（标记为思考过程）
            if (reasoningContent) {
              if (!inThinking && !added) {
                fullContent += "<thinking>"
                displayContent += "<thinking>"
                added = true
                inThinking = true
              }
              fullContent += reasoningContent
              displayContent += reasoningContent
            } else {
              if (inThinking && added) {
                fullContent += "</thinking>"
                displayContent += "</thinking>"
                added = false
                inThinking = false
              }
            }
          }

          // 添加正常内容
          if (content) {
            // 如果启用思考模式且之前在思考中，先结束思考标签
            if (thinkingTokens > 0 && inThinking && added) {
              fullContent += "</thinking>"
              displayContent += "</thinking>"
              added = false
              inThinking = false
            }
            fullContent += content
            dataContent += content
            displayContent += content

            if (dataContent === '```json') {
              dataContent = ''
            }
          }
          
          // 调用原始数据回调
          if (onRawData) {
            if (thinkingTokens > 0 && inThinking && added) {
              onRawData(fullContent + '</thinking>')
            } else {
              onRawData(fullContent)
            }
          }
          if (onChunk) {
            // 第一个参数是显示内容（包含思考内容）
            // 第二个参数是正常内容（不包含思考内容和标签），用于后续处理
            if (thinkingTokens > 0 && inThinking && added) {
              onChunk(displayContent + '</thinking>', dataContent)
            } else {
              onChunk(displayContent, dataContent)
            }
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  }

  // 如果结束时还在思考中且启用了思考模式，关闭标签
  if (inThinking && thinkingTokens > 0) {
    fullContent += '\n</thinking>\n'
    displayContent += '\n</thinking>\n'
  }

  return fullContent
}

export async function generateFirstChapterDescription(
  novelTitle: string,
  novelDescription: string,
  chapterTitle: string,
  apiConfig?: any
): Promise<string> {
  const systemPrompt = `你是一个专业的长篇小说创作助手。你正在协助作者创作一部长篇小说，现在需要为第一章生成描述。

【创作要求】
1. 你正在创作长篇小说的**第一章**，这是故事的开始
2. 生成一个简洁的章节描述，用于指导后续的正文创作
3. **重要：描述要简洁明了，控制在200-300字以内，抓住核心要点**
4. 描述应包含：本章的核心情节、主要人物、关键场景、故事的开端
5. 不要写成正文，不要有对话、详细描写，只写大纲式的内容
6. 第一章应该为整个故事奠定基调，引入主要人物和核心冲突
7. 示例格式（仅供参考）：
   本章讲述主角在XX场景登场，通过XX事件引出核心冲突。主角展现出XX性格特点，为后续XX情节发展埋下伏笔。`

  const userPrompt = `【小说信息】
标题：${novelTitle || '未设置'}
简介：${novelDescription || '未设置'}

【章节信息】
章节标题：${chapterTitle || '未设置'}

【特殊说明】
这是小说的第一章，没有上一章的信息。请根据小说的标题和简介，为第一章创作一个引人入胜的描述。`

  return await callOpenAI(userPrompt, systemPrompt, undefined, apiConfig)
}
