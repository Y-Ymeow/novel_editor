import type { Novel, Character, Chapter } from '../types'

const DB_NAME = 'AINovelDB'
const DB_VERSION = 2
const STORES = {
  NOVELS: 'novels',
  CHARACTERS: 'characters',
  CHAPTERS: 'chapters',
} as const

class IndexedDBStorage {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(STORES.NOVELS)) {
          db.createObjectStore(STORES.NOVELS, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(STORES.CHARACTERS)) {
          const characterStore = db.createObjectStore(STORES.CHARACTERS, { keyPath: 'id' })
          characterStore.createIndex('novelId', 'novelId', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.CHAPTERS)) {
          const chapterStore = db.createObjectStore(STORES.CHAPTERS, { keyPath: 'id' })
          chapterStore.createIndex('novelId', 'novelId', { unique: false })
        }
      }
    })
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  private async putAll<T>(storeName: string, data: T[]): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)

      data.forEach(item => store.put(item))

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  private async deleteById(storeName: string, id: string): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.NOVELS, STORES.CHARACTERS, STORES.CHAPTERS], 'readwrite')

      transaction.objectStore(STORES.NOVELS).clear()
      transaction.objectStore(STORES.CHARACTERS).clear()
      transaction.objectStore(STORES.CHAPTERS).clear()

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  // Novels
  async getNovels(): Promise<Novel[]> {
    return this.getAll<Novel>(STORES.NOVELS)
  }

  async saveNovels(novels: Novel[]): Promise<void> {
    return this.putAll(STORES.NOVELS, novels)
  }

  async updateNovels(novels: Novel[]): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.NOVELS, 'readwrite')
      const store = transaction.objectStore(STORES.NOVELS)

      novels.forEach(novel => {
        store.put(novel)
      })

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  async deleteNovel(id: string): Promise<void> {
    return this.deleteById(STORES.NOVELS, id)
  }

  // Characters
  async getCharacters(): Promise<Character[]> {
    return this.getAll<Character>(STORES.CHARACTERS)
  }

  async saveCharacters(characters: Character[]): Promise<void> {
    return this.putAll(STORES.CHARACTERS, characters)
  }

  async createCharacter(character: Character): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHARACTERS, 'readwrite')
      const store = transaction.objectStore(STORES.CHARACTERS)
      const request = store.put(character)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async updateCharacter(id: string, updates: Partial<Character>): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHARACTERS, 'readwrite')
      const store = transaction.objectStore(STORES.CHARACTERS)

      const getRequest = store.get(id)
      getRequest.onerror = () => reject(getRequest.error)
      getRequest.onsuccess = () => {
        const existing = getRequest.result
        if (!existing) {
          reject(new Error(`Character with id ${id} not found`))
          return
        }

        const updated = { ...existing, ...updates }
        const putRequest = store.put(updated)
        putRequest.onerror = () => reject(putRequest.error)
        putRequest.onsuccess = () => resolve()
      }
    })
  }

  async deleteCharacter(id: string): Promise<void> {
    return this.deleteById(STORES.CHARACTERS, id)
  }

  // Chapters
  async getChapters(): Promise<Chapter[]> {
    return this.getAll<Chapter>(STORES.CHAPTERS)
  }

  async saveChapters(chapters: Chapter[]): Promise<void> {
    return this.putAll(STORES.CHAPTERS, chapters)
  }

  async updateChapters(chapters: Chapter[]): Promise<void> {
    if (!this.db) await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORES.CHAPTERS, 'readwrite')
      const store = transaction.objectStore(STORES.CHAPTERS)

      chapters.forEach(chapter => {
        store.put(chapter)
      })

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }

  async deleteChapter(id: string): Promise<void> {
    return this.deleteById(STORES.CHAPTERS, id)
  }

  // Backup & Restore
  async exportBackup(): Promise<string> {
    const [novels, characters, chapters] = await Promise.all([
      this.getNovels(),
      this.getCharacters(),
      this.getChapters(),
    ])

    const backup = {
      version: '1.0',
      timestamp: Date.now(),
      novels,
      characters,
      chapters,
    }

    return JSON.stringify(backup, null, 2)
  }

  async importBackup(jsonString: string): Promise<void> {
    const backup = JSON.parse(jsonString)

    if (!backup.novels || !backup.characters || !backup.chapters) {
      throw new Error('无效的备份文件')
    }

    await this.clearAll()

    await Promise.all([
      this.putAll(STORES.NOVELS, backup.novels),
      this.putAll(STORES.CHARACTERS, backup.characters),
      this.putAll(STORES.CHAPTERS, backup.chapters),
    ])
  }
}

export const indexedDBStorage = new IndexedDBStorage()
