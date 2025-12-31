import type { Novel, Character, Chapter, BackupData } from '../types'
import { storage } from './storage'
import { indexedDBStorage } from './indexedDB'

export async function getNovels(): Promise<Novel[]> {
  const settings = storage.getSettings()
  if (settings.storageType === 'indexedDB') {
    return await indexedDBStorage.getNovels()
  }
  const data = window.localStorage.getItem('ai_novel_novels')
  return data ? JSON.parse(data) : []
}

export async function saveNovels(novels: Novel[]): Promise<void> {
  const settings = storage.getSettings()
  if (settings.storageType === 'indexedDB') {
    await indexedDBStorage.saveNovels(novels)
  } else {
    window.localStorage.setItem('ai_novel_novels', JSON.stringify(novels))
  }
}

export async function getCharacters(novelId?: string): Promise<Character[]> {
  const settings = storage.getSettings()
  let characters: Character[]
  
  if (settings.storageType === 'indexedDB') {
    characters = await indexedDBStorage.getCharacters()
  } else {
    const data = window.localStorage.getItem('ai_novel_characters')
    characters = data ? JSON.parse(data) : []
  }
  
  if (novelId) {
    return characters.filter(c => c.novelId === novelId)
  }
  return characters
}

export async function saveCharacters(characters: Character[]): Promise<void> {
  const settings = storage.getSettings()
  if (settings.storageType === 'indexedDB') {
    await indexedDBStorage.saveCharacters(characters)
  } else {
    window.localStorage.setItem('ai_novel_characters', JSON.stringify(characters))
  }
}

export async function getChapters(novelId?: string): Promise<Chapter[]> {
  const settings = storage.getSettings()
  let chapters: Chapter[]
  
  if (settings.storageType === 'indexedDB') {
    chapters = await indexedDBStorage.getChapters()
  } else {
    const data = window.localStorage.getItem('ai_novel_chapters')
    chapters = data ? JSON.parse(data) : []
  }
  
  if (novelId) {
    return chapters.filter(c => c.novelId === novelId).sort((a, b) => a.order - b.order)
  }
  return chapters
}

export async function saveChapters(chapters: Chapter[]): Promise<void> {
  const settings = storage.getSettings()
  if (settings.storageType === 'indexedDB') {
    await indexedDBStorage.saveChapters(chapters)
  } else {
    window.localStorage.setItem('ai_novel_chapters', JSON.stringify(chapters))
  }
}

export async function createCharacter(character: Character): Promise<void> {
  const settings = storage.getSettings()
  if (settings.storageType === 'indexedDB') {
    await indexedDBStorage.createCharacter(character)
  } else {
    // 对于LocalStorage，需要获取所有数据，添加新记录后重新保存
    const characters = await getCharacters()
    characters.push(character)
    await saveCharacters(characters)
  }
}

export async function updateCharacter(id: string, updates: Partial<Character>): Promise<void> {
  const settings = storage.getSettings()
  if (settings.storageType === 'indexedDB') {
    await indexedDBStorage.updateCharacter(id, updates)
  } else {
    // 对于LocalStorage，需要获取所有数据，更新后重新保存
    const characters = await getCharacters()
    const index = characters.findIndex(char => char.id === id)
    if (index !== -1) {
      characters[index] = { ...characters[index], ...updates }
      await saveCharacters(characters)
    }
  }
}

export async function deleteCharacter(id: string): Promise<void> {
  const settings = storage.getSettings()
  if (settings.storageType === 'indexedDB') {
    await indexedDBStorage.deleteCharacter(id)
  } else {
    // 对于LocalStorage，需要获取所有数据，过滤后重新保存
    const characters = await getCharacters()
    const updated = characters.filter(char => char.id !== id)
    await saveCharacters(updated)
  }
}

export async function deleteChapter(id: string): Promise<void> {
  const settings = storage.getSettings()
  if (settings.storageType === 'indexedDB') {
    await indexedDBStorage.deleteChapter(id)
  } else {
    // 对于LocalStorage，需要获取所有数据，过滤后重新保存
    const chapters = await getChapters()
    const updated = chapters.filter(ch => ch.id !== id)
    await saveChapters(updated)
  }
}

export async function exportBackup(): Promise<string> {
  const settings = localStorage.getSettings()
  
  if (settings.storageType === 'indexedDB') {
    return await indexedDBStorage.exportBackup()
  }
  
  const [novels, characters, chapters] = await Promise.all([
    getNovels(),
    getCharacters(),
    getChapters(),
  ])

  const backup: BackupData = {
    version: '1.0',
    timestamp: Date.now(),
    novels,
    characters,
    chapters,
  }

  return JSON.stringify(backup, null, 2)
}

export async function importBackup(jsonString: string): Promise<void> {
  const backup: BackupData = JSON.parse(jsonString)
  
  if (!backup.novels || !backup.characters || !backup.chapters) {
    throw new Error('无效的备份文件')
  }

  const settings = storage.getSettings()
  
  if (settings.storageType === 'indexedDB') {
    await indexedDBStorage.importBackup(jsonString)
  } else {
    window.localStorage.setItem('ai_novel_novels', JSON.stringify(backup.novels))
    window.localStorage.setItem('ai_novel_characters', JSON.stringify(backup.characters))
    window.localStorage.setItem('ai_novel_chapters', JSON.stringify(backup.chapters))
  }
}

export function downloadBackup(filename?: string): void {
  exportBackup().then(json => {
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