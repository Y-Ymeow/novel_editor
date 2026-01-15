import { storage } from './storage'
import { getProviderConfig } from './apiProvider'

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

  const providerConfig = getProviderConfig(selectedApi.provider)
  const modelParameters = settings.modelParameters

  const messages: Array<{ role: string; content: string }> = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestBody: any = {
    model: model || selectedApi.selectedModel,
    messages,
    temperature: modelParameters.temperature,
    top_p: modelParameters.topP,
    stream: true,
  }

  // 添加频率惩罚和存在惩罚（如果设置了）
  if (modelParameters.frequencyPenalty !== undefined) {
    requestBody.frequency_penalty = modelParameters.frequencyPenalty
  }
  if (modelParameters.presencePenalty !== undefined) {
    requestBody.presence_penalty = modelParameters.presencePenalty
  }

  // 检查提供商类型
  const providerType = selectedApi.provider

  // Groq 特定参数
  if (providerType === 'groq') {
    if (modelParameters.groqReasoningFormat && modelParameters.groqReasoningFormat !== 'hidden') {
      requestBody.reasoning_format = modelParameters.groqReasoningFormat
    }
    if (modelParameters.groqIncludeReasoning !== undefined) {
      requestBody.include_reasoning = modelParameters.groqIncludeReasoning
    }
    if (modelParameters.groqReasoningEffort && modelParameters.groqReasoningEffort !== 'default') {
      requestBody.reasoning_effort = modelParameters.groqReasoningEffort
    }
  }

  // Cerebras 特定参数
  if (providerType === 'cerebras') {
    const modelName = (model || selectedApi.selectedModel).toLowerCase()
    // 仅对 .gpt-oss-120b 模型应用 reasoning_effort
    if (modelName.includes('gpt-oss-120b') && modelParameters.cerebrasReasoningEffort) {
      requestBody.reasoning_effort = modelParameters.cerebrasReasoningEffort
    }
    // 使用 disable_reasoning 参数控制推理
    if (modelParameters.cerebrasDisableReasoning !== undefined) {
      requestBody.disable_reasoning = modelParameters.cerebrasDisableReasoning
    }
  }

  // 根据不同提供商配置参数
  if (thinkingTokens > 0) {
    if (providerType === 'zhipu') {
      // 智谱模型使用 thinking 参数
      requestBody.thinking = {
        type: 'enabled'
      }
    } else if (providerType === 'openai') {
      // OpenAI 支持 reasoning_effort
      requestBody.max_tokens = thinkingTokens
      requestBody.reasoning_effort = 'high'
    } else if (providerType === 'groq') {
      // Groq 支持 max_tokens 和 reasoning_effort
      requestBody.max_tokens = thinkingTokens
      if (!requestBody.reasoning_effort) {
        requestBody.reasoning_effort = 'high'
      }
    } else if (providerType === 'cerebras') {
      // Cerebras 支持 max_tokens
      requestBody.max_tokens = thinkingTokens
      const modelName = (model || selectedApi.selectedModel).toLowerCase()
      // 如果是 .gpt-oss-120b 模型，设置高推理努力
      if (modelName.includes('gpt-oss-120b') && !requestBody.reasoning_effort) {
        requestBody.reasoning_effort = 'high'
      }
      // 启用推理
      if (requestBody.disable_reasoning === undefined) {
        requestBody.disable_reasoning = false
      }
    } else {
      // 其他提供商使用 max_tokens
      requestBody.max_tokens = thinkingTokens
    }
  } else {
    // 不启用思考模式
    const selectedModelConfig = selectedApi.models.find((m: any) => m.name === selectedApi.selectedModel)
    requestBody.max_tokens = modelParameters.maxTokens || selectedModelConfig?.maxTokens || 2000

    // 对于支持 reasoning_effort 的提供商，设置为 none 来禁用思考
    if (providerType === 'openai') {
      requestBody.reasoning_effort = 'none'
    }

    if (providerType === 'zhipu') {
      // 智谱模型使用 thinking 参数
      requestBody.thinking = {
        type: 'disabled'
      }
    }

    if (providerType === 'groq') {
      // Groq 禁用推理
      if (!requestBody.reasoning_effort) {
        requestBody.reasoning_effort = 'none'
      }
    }

    if (providerType === 'cerebras') {
      // Cerebras 禁用推理
      if (requestBody.disable_reasoning === undefined) {
        requestBody.disable_reasoning = true
      }
    }
  }

  // Gemini 特殊处理
  if (providerType === 'gemini') {
    // Gemini 使用不同的请求格式
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role,
      parts: [{ text: msg.content }]
    }))
    
    // 如果有 system prompt，添加到第一条消息
    if (systemPrompt && geminiMessages.length > 0) {
      geminiMessages[0].parts.unshift({ text: `System: ${systemPrompt}\n\n` })
    }
    
    requestBody.contents = geminiMessages
    delete requestBody.messages
    
    // Gemini 不使用某些参数
    delete requestBody.temperature
    delete requestBody.top_p
    delete requestBody.frequency_penalty
    delete requestBody.presence_penalty
  }

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  headers[providerConfig.authHeader] = providerConfig.authPrefix 
    ? `${providerConfig.authPrefix} ${selectedApi.apiKey}` 
    : selectedApi.apiKey

  const response = await fetch(`${selectedApi.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
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
          
          let reasoningContent = ''
          let content = ''
          
          if (providerType === 'gemini') {
            // Gemini 响应格式不同
            content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
          } else if (providerType === 'groq' && modelParameters.groqReasoningFormat === 'parsed') {
            // Groq parsed 格式：推理内容在 message.reasoning 字段
            reasoningContent = parsed.message?.reasoning || ''
            content = parsed.message?.content || parsed.choices?.[0]?.delta?.content || ''
          } else {
            // OpenAI 格式
            reasoningContent = parsed.choices[0]?.delta?.reasoning_content || ''
            content = parsed.choices[0]?.delta?.content || ''
          }

          // 只有启用思考模式时才处理推理内容
          if (thinkingTokens > 0 && providerType !== 'gemini' && providerType !== 'groq') {
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

          // Groq raw 格式：推理内容已经在 <thinking> 标签中
          if (providerType === 'groq' && modelParameters.groqReasoningFormat === 'raw') {
            content = parsed.choices?.[0]?.delta?.content || parsed.message?.content || ''
            fullContent += content
            displayContent += content
            dataContent += content
          } else {
            // 添加正常内容
            if (content) {
              if (thinkingTokens > 0 && inThinking && added && providerType !== 'gemini' && providerType !== 'groq') {
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
          }
          
          // 调用原始数据回调
          if (onRawData) {
            if (thinkingTokens > 0 && inThinking && added && providerType !== 'gemini' && providerType !== 'groq') {
              onRawData(fullContent + '</thinking>')
            } else {
              onRawData(fullContent)
            }
          }
          if (onChunk) {
            if (thinkingTokens > 0 && inThinking && added && providerType !== 'gemini' && providerType !== 'groq') {
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
  if (inThinking && thinkingTokens > 0 && providerType !== 'gemini' && providerType !== 'groq') {
    fullContent += '\n</thinking>\n'
    displayContent += '\n</thinking>\n'
  }

  return fullContent
}