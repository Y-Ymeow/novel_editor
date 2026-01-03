import { storage } from './storage'

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