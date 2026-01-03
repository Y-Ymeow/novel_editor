import Dexie, { type Table } from 'dexie'
import type { Novel, Character, Chapter, Plot, AppSettings } from '../types'
import { DEFAULT_PROMPTS } from '../types'

// Dexie 数据库定义
class AINovelDB extends Dexie {
  novels!: Table<Novel>
  characters!: Table<Character>
  chapters!: Table<Chapter>
  plots!: Table<Plot>

  constructor() {
    super('NovelDB')
    this.version(1).stores({
      novels: 'id, createdAt, updatedAt',
      characters: 'id, novelId, createdAt',
      chapters: 'id, novelId, order, createdAt, updatedAt',
      plots: 'id, novelId, createdAt, updatedAt',
    })
  }
}

// 数据库实例
let dbInstance: AINovelDB | null = null

// 导出 db 供外部使用（使用 getter）
export const db: AINovelDB = new Proxy({} as AINovelDB, {
  get(_target, prop) {
    if (!dbInstance) {
      dbInstance = new AINovelDB()
    }
    return (dbInstance as any)[prop]
  }
})

// 确保数据库已打开
let dbOpenPromise: Promise<void> | null = null

async function ensureDBOpen(): Promise<void> {
  // 检查数据库是否已打开
  if (!dbInstance || !dbInstance.isOpen()) {
    console.log('[DB] 数据库已关闭或未初始化，重新创建实例...')
    dbInstance = new AINovelDB()
  }

  if (dbInstance.isOpen()) {
    console.log('[DB] 数据库已经打开，跳过')
    return
  }

  if (dbOpenPromise) {
    console.log('[DB] 等待之前的打开操作...')
    await dbOpenPromise
    return
  }

  console.log('[DB] 开始打开数据库...')

  try {
    dbOpenPromise = dbInstance!.open()
      .then(() => {
        console.log('[DB] 数据库已打开')
      })
      .catch((error: Error) => {
        console.error('[DB] 数据库打开失败:', error)
        dbOpenPromise = null
        throw error
      })
      .finally(() => {
        dbOpenPromise = null
      })

    await dbOpenPromise
  } catch (error) {
    dbOpenPromise = null
    throw error
  }
}

// 从旧数据库迁移数据（手动调用）
export async function migrateFromOldDB(): Promise<void> {
  const oldDBName = 'AINovelDB'
  const oldDB = new Dexie(oldDBName)

  try {
    // 检查旧数据库是否存在
    const hasOldDB = await Dexie.exists(oldDBName)

    if (!hasOldDB) {
      await oldDB.close()
      return
    }

    console.log('发现旧数据库，开始迁移...')

    // 打开旧数据库
    await oldDB.open()

    // 读取旧数据
    const oldNovels = await oldDB.table('novels').toArray()
    const oldCharacters = await oldDB.table('characters').toArray()
    const oldChapters = await oldDB.table('chapters').toArray()

    console.log(`迁移 ${oldNovels.length} 个小说, ${oldCharacters.length} 个人物, ${oldChapters.length} 个章节`)

    // 写入新数据库
    if (oldNovels.length > 0) {
      await db.novels.bulkPut(oldNovels)
    }
    if (oldCharacters.length > 0) {
      await db.characters.bulkPut(oldCharacters)
    }
    if (oldChapters.length > 0) {
      await db.chapters.bulkPut(oldChapters)
    }

    console.log('数据迁移完成')

    // 关闭并删除旧数据库
    await oldDB.close()
    await Dexie.delete(oldDBName)

    console.log('旧数据库已删除')
  } catch (error) {
    console.error('数据迁移失败:', error)
    await oldDB.close()
    throw error
  }
}

// 设置存储（使用 LocalStorage）
const SETTINGS_KEY = 'ai_novel_settings'

// LocalStorage 键
const LS_KEYS = {
  NOVELS: 'ai_novel_novels',
  CHARACTERS: 'ai_novel_characters',
  CHAPTERS: 'ai_novel_chapters',
}

// ============ LocalStorage 操作 ============
const lsStorage = {
  getNovels(): Novel[] {
    const data = localStorage.getItem(LS_KEYS.NOVELS)
    return data ? JSON.parse(data) : []
  },
  saveNovels(novels: Novel[]): void {
    localStorage.setItem(LS_KEYS.NOVELS, JSON.stringify(novels))
  },
  getCharacters(): Character[] {
    const data = localStorage.getItem(LS_KEYS.CHARACTERS)
    return data ? JSON.parse(data) : []
  },
  saveCharacters(characters: Character[]): void {
    localStorage.setItem(LS_KEYS.CHARACTERS, JSON.stringify(characters))
  },
  getChapters(): Chapter[] {
    const data = localStorage.getItem(LS_KEYS.CHAPTERS)
    return data ? JSON.parse(data) : []
  },
  saveChapters(chapters: Chapter[]): void {
    localStorage.setItem(LS_KEYS.CHAPTERS, JSON.stringify(chapters))
  },
}

// ============ 统一存储 API ============
export const storage = {
  // ============ 设置相关 ============
  getSettings(): AppSettings {
    const data = localStorage.getItem(SETTINGS_KEY)
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

    try {
      const parsed = JSON.parse(data) as Partial<AppSettings>
      return {
        apis: parsed.apis || [],
        selectedApiId: parsed.selectedApiId || null,
        databases: parsed.databases || [],
        selectedDatabaseId: parsed.selectedDatabaseId || null,
        useLocalStorage: parsed.useLocalStorage ?? true,
        useIndexedDB: parsed.useIndexedDB ?? false,
        storageType: parsed.storageType || 'localStorage',
        selectedNovelId: parsed.selectedNovelId || null,
        prompts: parsed.prompts || DEFAULT_PROMPTS,
      }
    } catch {
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
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  },

  // ============ 小说相关 ============
  async getNovels(): Promise<Novel[]> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      return lsStorage.getNovels()
    }
    return await db.novels.toArray()
  },

  async saveNovel(novel: Novel): Promise<void> {
    const settings = this.getSettings()

    if (settings.storageType === 'localStorage') {
      const novels = lsStorage.getNovels()
      const index = novels.findIndex(n => n.id === novel.id)
      if (index !== -1) {
        novels[index] = novel
      } else {
        novels.push(novel)
      }
      lsStorage.saveNovels(novels)
    } else {
      try {
        await ensureDBOpen()
        await db.novels.put(novel)
      } catch (error) {
        throw error
      }
    }
  },

  async deleteNovel(id: string): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const novels = lsStorage.getNovels().filter(n => n.id !== id)
      const characters = lsStorage.getCharacters().filter(c => c.novelId !== id)
      const chapters = lsStorage.getChapters().filter(c => c.novelId !== id)
      lsStorage.saveNovels(novels)
      lsStorage.saveCharacters(characters)
      lsStorage.saveChapters(chapters)
    } else {
      await db.transaction('rw', [db.novels, db.characters, db.chapters], async () => {
        await db.novels.delete(id)
        await db.characters.where('novelId').equals(id).delete()
        await db.chapters.where('novelId').equals(id).delete()
      })
    }
  },

  // ============ 人物相关 ============
  async getCharacters(novelId?: string): Promise<Character[]> {
    const settings = this.getSettings()
    let characters: Character[]
    if (settings.storageType === 'localStorage') {
      characters = lsStorage.getCharacters()
    } else {
      characters = await db.characters.toArray()
    }
    if (novelId) {
      return characters.filter(c => c.novelId === novelId)
    }
    return characters
  },

  async saveCharacter(character: Character): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const characters = lsStorage.getCharacters()
      const index = characters.findIndex(c => c.id === character.id)
      if (index !== -1) {
        characters[index] = character
      } else {
        characters.push(character)
      }
      lsStorage.saveCharacters(characters)
    } else {
      await ensureDBOpen()
      await db.characters.put(character)
    }
  },

  async updateCharacter(id: string, updates: Partial<Character>): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const characters = lsStorage.getCharacters()
      const index = characters.findIndex(c => c.id === id)
      if (index !== -1) {
        characters[index] = { ...characters[index], ...updates }
        lsStorage.saveCharacters(characters)
      }
    } else {
      await ensureDBOpen()
      await db.characters.update(id, updates)
    }
  },

  async deleteCharacter(id: string): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const characters = lsStorage.getCharacters().filter(c => c.id !== id)
      lsStorage.saveCharacters(characters)
    } else {
      await db.characters.delete(id)
    }
  },

  // ============ 章节相关 ============
  async getChapters(novelId?: string): Promise<Chapter[]> {
    const settings = this.getSettings()
    let chapters: Chapter[]
    if (settings.storageType === 'localStorage') {
      chapters = lsStorage.getChapters()
    } else {
      chapters = await db.chapters.toArray()
    }
    if (novelId) {
      return chapters.filter(c => c.novelId === novelId).sort((a, b) => a.order - b.order)
    }
    return chapters
  },

  async saveChapter(chapter: Chapter): Promise<void> {
    const settings = this.getSettings()

    if (settings.storageType === 'localStorage') {
      const chapters = lsStorage.getChapters()
      const index = chapters.findIndex(c => c.id === chapter.id)
      if (index !== -1) {
        chapters[index] = chapter
      } else {
        chapters.push(chapter)
      }
      lsStorage.saveChapters(chapters)
    } else {
      try {
        await ensureDBOpen()
        await db.chapters.put(chapter)
      } catch (error) {
        throw error
      }
    }
  },

  async updateChapter(id: string, updates: Partial<Chapter>): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const chapters = lsStorage.getChapters()
      const index = chapters.findIndex(c => c.id === id)
      if (index !== -1) {
        chapters[index] = { ...chapters[index], ...updates }
        lsStorage.saveChapters(chapters)
      }
    } else {
      await ensureDBOpen()
      await db.chapters.update(id, updates)
    }
  },

  async deleteChapter(id: string): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const chapters = lsStorage.getChapters().filter(c => c.id !== id)
      lsStorage.saveChapters(chapters)
    } else {
      await db.chapters.delete(id)
    }
  },

  // ============ 情节相关 ============
  async getPlots(novelId?: string): Promise<Plot[]> {
    const settings = this.getSettings()
    let plots: Plot[]
    if (settings.storageType === 'localStorage') {
      const data = localStorage.getItem('ai_novel_plots')
      plots = data ? JSON.parse(data) : []
    } else {
      plots = await db.plots.toArray()
    }
    if (novelId) {
      return plots.filter(p => p.novelId === novelId)
    }
    return plots
  },

  async savePlot(plot: Plot): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const plots = await this.getPlots()
      const index = plots.findIndex(p => p.id === plot.id)
      if (index !== -1) {
        plots[index] = plot
      } else {
        plots.push(plot)
      }
      localStorage.setItem('ai_novel_plots', JSON.stringify(plots))
    } else {
      await ensureDBOpen()
      await db.plots.put(plot)
    }
  },

  async updatePlot(id: string, updates: Partial<Plot>): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const plots = await this.getPlots()
      const index = plots.findIndex(p => p.id === id)
      if (index !== -1) {
        plots[index] = { ...plots[index], ...updates }
        localStorage.setItem('ai_novel_plots', JSON.stringify(plots))
      }
    } else {
      await ensureDBOpen()
      await db.plots.update(id, updates)
    }
  },

  async deletePlot(id: string): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const plots = (await this.getPlots()).filter(p => p.id !== id)
      localStorage.setItem('ai_novel_plots', JSON.stringify(plots))
    } else {
      await db.plots.delete(id)
    }
  },

  // ============ 批量操作 ============
  async saveChapters(chapters: Chapter[]): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const existing = lsStorage.getChapters()
      const newChapters = [...existing]
      chapters.forEach(chapter => {
        const index = newChapters.findIndex(c => c.id === chapter.id)
        if (index !== -1) {
          newChapters[index] = chapter
        } else {
          newChapters.push(chapter)
        }
      })
      lsStorage.saveChapters(newChapters)
    } else {
      await db.chapters.bulkPut(chapters)
    }
  },

  async saveCharacters(characters: Character[]): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      const existing = lsStorage.getCharacters()
      const existingMap = new Map(existing.map(c => [c.id, c]))
      const newCharacters = [...existing]
      characters.forEach(char => {
        if (existingMap.has(char.id)) {
          const index = newCharacters.findIndex(c => c.id === char.id)
          if (index !== -1) {
            newCharacters[index] = char
          }
        } else {
          newCharacters.push(char)
        }
      })
      lsStorage.saveCharacters(newCharacters)
    } else {
      await db.characters.bulkPut(characters)
    }
  },

  // ============ 备份与恢复 ============
  async exportBackup(): Promise<string> {
    const settings = this.getSettings()
    let novels: Novel[]
    let characters: Character[]
    let chapters: Chapter[]
    let plots: Plot[]

    if (settings.storageType === 'localStorage') {
      novels = lsStorage.getNovels()
      characters = lsStorage.getCharacters()
      chapters = lsStorage.getChapters()
      plots = await this.getPlots()
    } else {
      [novels, characters, chapters, plots] = await Promise.all([
        db.novels.toArray(),
        db.characters.toArray(),
        db.chapters.toArray(),
        db.plots.toArray(),
      ])
    }

    return JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      novels,
      characters,
      chapters,
      plots,
    }, null, 2)
  },

  async importBackup(jsonString: string): Promise<void> {
    const backup = JSON.parse(jsonString)

    if (!backup.novels || !backup.characters || !backup.chapters) {
      throw new Error('无效的备份文件')
    }

    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      lsStorage.saveNovels(backup.novels)
      lsStorage.saveCharacters(backup.characters)
      lsStorage.saveChapters(backup.chapters)
      if (backup.plots) {
        localStorage.setItem('ai_novel_plots', JSON.stringify(backup.plots))
      }
    } else {
      await db.transaction('rw', [db.novels, db.characters, db.chapters, db.plots], async () => {
        await db.novels.clear()
        await db.characters.clear()
        await db.chapters.clear()
        await db.plots.clear()

        await db.novels.bulkPut(backup.novels)
        await db.characters.bulkPut(backup.characters)
        await db.chapters.bulkPut(backup.chapters)
        if (backup.plots) {
          await db.plots.bulkPut(backup.plots)
        }
      })
    }
  },

  // ============ 清空数据库 ============
  async clearDatabase(): Promise<void> {
    const settings = this.getSettings()
    if (settings.storageType === 'localStorage') {
      localStorage.removeItem(LS_KEYS.NOVELS)
      localStorage.removeItem(LS_KEYS.CHARACTERS)
      localStorage.removeItem(LS_KEYS.CHAPTERS)
      localStorage.removeItem('ai_novel_plots')
    } else {
      await db.transaction('rw', [db.novels, db.characters, db.chapters, db.plots], async () => {
        await db.novels.clear()
        await db.characters.clear()
        await db.chapters.clear()
        await db.plots.clear()
      })
    }
    localStorage.removeItem(SETTINGS_KEY)
  },

  // ============ 删除数据库 ============
  async deleteDatabase(): Promise<void> {
    await db.delete()
    localStorage.clear()
  },
}

// ============ 辅助函数 ============

export function downloadBackup(filename?: string): void {
  storage.exportBackup().then(json => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `ai_novel_backup_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  })
}

export async function importBackup(file: File): Promise<void> {
  const text = await file.text()
  await storage.importBackup(text)
}