import type { AppSettings, Character, Chapter, ModelConfig } from '../types'
import { DEFAULT_PROMPTS } from '../types'

const STORAGE_KEYS = {
  SETTINGS: 'ai_novel_settings',
  CHARACTERS: 'ai_novel_characters',
  CHAPTERS: 'ai_novel_chapters',
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateSettings(settings: any): AppSettings {
  // 迁移旧的 models 格式: string[] -> ModelConfig[]
  if (settings.apis && Array.isArray(settings.apis)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings.apis = settings.apis.map((api: any) => {
      if (api.models && Array.isArray(api.models) && api.models.length > 0) {
        // 检查是否是旧的字符串数组格式
        if (typeof api.models[0] === 'string') {
          api.models = api.models.map((modelName: string): ModelConfig => ({
            name: modelName,
            canThink: modelName.toLowerCase().includes('think') || modelName.toLowerCase().includes('reason'),
            canUseTools: false,
            maxTokens: 2000,
          }))
        }
      }
      return api
    })
  }

  // 确保有默认的 selectedModel
  if (settings.apis && Array.isArray(settings.apis)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings.apis.forEach((api: any) => {
      if (!api.selectedModel && api.models && api.models.length > 0) {
        api.selectedModel = api.models[0].name
      }
    })
  }

  return settings as AppSettings
}

export const storage = {
  getSettings(): AppSettings {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (!data) {
      return {
        apis: [],
        selectedApiId: null,
        databases: [],
        selectedDatabaseId: null,
        useLocalStorage: true,
        useIndexedDB: false,
        storageType: 'localStorage',
        selectedNovelId: null,
        prompts: DEFAULT_PROMPTS,
      }
    }
    const parsed = JSON.parse(data)
    const settings = migrateSettings(parsed)

    // 确保有 prompts 字段
    if (!settings.prompts) {
      settings.prompts = DEFAULT_PROMPTS
    }

    return settings
  },
  saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
  },
  getCharacters(): Character[] {
    const data = localStorage.getItem(STORAGE_KEYS.CHARACTERS)
    return data ? JSON.parse(data) : []
  },
  saveCharacters(characters: Character[]): void {
    localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters))
  },
  getChapters(): Chapter[] {
    const data = localStorage.getItem(STORAGE_KEYS.CHAPTERS)
    return data ? JSON.parse(data) : []
  },
  saveChapters(chapters: Chapter[]): void {
    localStorage.setItem(STORAGE_KEYS.CHAPTERS, JSON.stringify(chapters))
  },
}
