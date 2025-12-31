import { storage } from './storage'

export async function callOpenAI(
  prompt: string, 
  systemPrompt?: string, 
  model?: string,
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

  const requestBody: any = {
    model: model || selectedApi.selectedModel,
    messages,
    temperature: 0.8,
    stream: true,
  }

  if (thinkingTokens > 0) {
    requestBody.max_completion_tokens = thinkingTokens
  } else {
    requestBody.max_tokens = 2000
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
          // 检查是否有推理内容
          const reasoningContent = parsed.choices[0]?.delta?.reasoning_content || ''
          const content = parsed.choices[0]?.delta?.content || ''
          
          // 如果有推理内容，使用推理内容；否则使用正常内容
          const actualContent = reasoningContent || content
          
          if (actualContent) {
            fullContent += actualContent
            dataContent += content

            if (dataContent == '```json') {
              dataContent = '';
            }
            // 调用原始数据回调，无论是否为有效JSON
            if (onRawData) {
              onRawData(fullContent)
            }
            if (onChunk) {
              onChunk(content, dataContent)
            }
          }
        } catch (e) {
          // JSON解析失败，这可能是因为数据不是有效的JSON
          // 但我们已经在前面调用了onRawData，所以这里不需要额外处理
          // 保持原有逻辑，只处理有效的JSON数据到fullContent
        }
      }
    }
  }

  return fullContent
}