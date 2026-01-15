import type { ApiProviderType, ProviderConfig, ModelConfig } from '../types'

export const PROVIDER_CONFIGS: Record<ApiProviderType, ProviderConfig> = {
  openai: {
    type: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
  },
  groq: {
    type: 'groq',
    name: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModels: [
      { id: 'llama-3.3-70b-versatile', name: 'llama-3.3-70b-versatile', canThink: false, canUseTools: true, maxTokens: 8192 },
      { id: 'llama-3.1-70b-versatile', name: 'llama-3.1-70b-versatile', canThink: false, canUseTools: true, maxTokens: 8192 },
      { id: 'mixtral-8x7b-32768', name: 'mixtral-8x7b-32768', canThink: false, canUseTools: true, maxTokens: 32768 },
      { id: 'gemma2-9b-it', name: 'gemma2-9b-it', canThink: false, canUseTools: true, maxTokens: 8192 },
    ],
  },
  zhipu: {
    type: 'zhipu',
    name: '智谱AI',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModels: [
      { id: 'glm-4-plus', name: 'glm-4-plus', canThink: true, canUseTools: true, maxTokens: 128000 },
      { id: 'glm-4', name: 'glm-4', canThink: true, canUseTools: true, maxTokens: 128000 },
      { id: 'glm-4-flash', name: 'glm-4-flash', canThink: false, canUseTools: true, maxTokens: 128000 },
      { id: 'glm-4-air', name: 'glm-4-air', canThink: false, canUseTools: true, maxTokens: 128000 },
    ],
  },
  cerebras: {
    type: 'cerebras',
    name: 'Cerebras',
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
    defaultModels: [
      { id: 'llama3.1-70b', name: 'llama3.1-70b', canThink: false, canUseTools: true, maxTokens: 8192 },
      { id: 'llama3.3-70b', name: 'llama3.3-70b', canThink: false, canUseTools: true, maxTokens: 8192 },
    ],
  },
  gemini: {
    type: 'gemini',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'x-goog-api-key',
    authPrefix: '',
    defaultModels: [
      { id: 'gemini-2.0-flash-exp', name: 'gemini-2.0-flash-exp', canThink: false, canUseTools: true, maxTokens: 8192 },
      { id: 'gemini-1.5-pro', name: 'gemini-1.5-pro', canThink: false, canUseTools: true, maxTokens: 2000000 },
      { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash', canThink: false, canUseTools: true, maxTokens: 1000000 },
    ],
  },
  custom: {
    type: 'custom',
    name: '自定义',
    defaultBaseUrl: 'https://api.example.com/v1',
    supportsModelsApi: true,
    modelsEndpoint: '/models',
    authHeader: 'Authorization',
    authPrefix: 'Bearer',
  },
}

export function getProviderConfig(providerType: ApiProviderType): ProviderConfig {
  return PROVIDER_CONFIGS[providerType]
}

export function getProviderTypes(): ApiProviderType[] {
  return Object.keys(PROVIDER_CONFIGS) as ApiProviderType[]
}

export function getDefaultModels(providerType: ApiProviderType): ModelConfig[] {
  const config = PROVIDER_CONFIGS[providerType]
  return config.defaultModels || []
}

export async function fetchModelsFromApi(
  baseUrl: string,
  apiKey: string,
  providerType: ApiProviderType
): Promise<ModelConfig[]> {
  const config = PROVIDER_CONFIGS[providerType]

  if (!config.supportsModelsApi) {
    return getDefaultModels(providerType)
  }

  const modelsEndpoint = config.modelsEndpoint || '/models'
  const url = `${baseUrl}${modelsEndpoint}`

  try {
    const headers: Record<string, string> = {}
    headers[config.authHeader] = config.authPrefix ? `${config.authPrefix} ${apiKey}` : apiKey

    const response = await fetch(url, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      console.error(`Failed to fetch models: ${response.status} ${response.statusText}`)
      return getDefaultModels(providerType)
    }

    const data = await response.json()

    let models: any[] = []
    if (Array.isArray(data)) {
      models = data
    } else if (data.data && Array.isArray(data.data)) {
      models = data.data
    } else if (data.models && Array.isArray(data.models)) {
      models = data.models
    }

    return models.map((model: any) => ({
      id: model.id || model.name,
      name: model.id || model.name,
      displayName: model.display_name || model.name,
      canThink: detectThinkingCapability(model.id || model.name, providerType),
      canUseTools: detectToolCapability(model.id || model.name, providerType),
      maxTokens: model.max_tokens || detectMaxTokens(model.id || model.name, providerType),
    }))
  } catch (error) {
    console.error('Error fetching models:', error)
    return getDefaultModels(providerType)
  }
}

function detectThinkingCapability(_modelName: string, providerType: ApiProviderType): boolean {
  if (providerType === 'zhipu') {
    return true
  }
  
  if (providerType === 'openai') {
    return true
  }
  
  if (providerType === 'groq') {
    return true
  }
  
  return false
}

function detectToolCapability(modelName: string, providerType: ApiProviderType): boolean {
  const name = modelName.toLowerCase()
  
  if (providerType === 'gemini') {
    return true
  }
  
  if (providerType === 'zhipu') {
    return name.includes('glm-4')
  }
  
  if (providerType === 'groq') {
    return name.includes('llama') || name.includes('mixtral') || name.includes('gemma')
  }
  
  if (providerType === 'cerebras') {
    return name.includes('llama')
  }
  
  return true
}

function detectMaxTokens(modelName: string, providerType: ApiProviderType): number {
  const name = modelName.toLowerCase()
  
  if (providerType === 'zhipu') {
    return 128000
  }
  
  if (providerType === 'gemini') {
    if (name.includes('1.5-pro')) return 2000000
    if (name.includes('1.5-flash')) return 1000000
    return 8192
  }
  
  if (providerType === 'groq') {
    if (name.includes('mixtral')) return 32768
    return 8192
  }
  
  if (providerType === 'cerebras') {
    return 8192
  }
  
  return 8192
}