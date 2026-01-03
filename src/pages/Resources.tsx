import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Character, Novel, Plot } from '../types'
import { storage } from '../utils/storage'
import Characters from './subpage/resources/Characters'
import Plots from './subpage/resources/Plots'

export default function Resources() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'characters' | 'plots'>('characters')
  const [characters, setCharacters] = useState<Character[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null)
  const [currentNovel, setCurrentNovel] = useState<Novel|null>(null)

  useEffect(() => {
    const settings = storage.getSettings()
    setCurrentNovelId(settings.selectedNovelId)

    if (settings.selectedNovelId) {
      loadCharacters(settings.selectedNovelId)
      loadPlots(settings.selectedNovelId)
      loadNovel(settings.selectedNovelId)
    }
  }, [])

  const loadCharacters = async (novelId: string) => {
    const loaded = await storage.getCharacters(novelId)
    setCharacters(loaded)
  }

  const loadPlots = async (novelId: string) => {
    const loaded = await storage.getPlots(novelId)
    setPlots(loaded)
  }

  const loadNovel = async (novelId: string) => {
    const novels = await storage.getNovels()
    const novel = novels.find((n) => n.id === novelId)
    if (novel) {
      setCurrentNovel(novel)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">📚 资源管理</h1>
          <button
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
            onClick={() => navigate('/editor')}
          >
            ← 返回编辑器
          </button>
        </div>
      </div>

      <div className="px-4 border-b border-slate-700 bg-slate-800">
        <div className="flex gap-1">
          <button
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'characters'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            onClick={() => setActiveTab('characters')}
          >
            👤 人物
            {characters.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-slate-700 rounded-full text-xs">
                {characters.length}
              </span>
            )}
          </button>
          <button
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'plots'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            onClick={() => setActiveTab('plots')}
          >
            📝 情节
            {plots.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-slate-700 rounded-full text-xs">
                {plots.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {!currentNovelId && (
          <div className="text-center py-16 text-slate-500">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl mb-2">请先选择小说</h3>
            <p>前往小说管理页面创建或选择小说</p>
          </div>
        )}

        {currentNovelId && activeTab === 'characters' && (
          <Characters
            currentNovelId={currentNovelId}
            currentNovel={currentNovel}
            characters={characters}
            onCharactersChange={setCharacters}
          />
        )}

        {activeTab === 'plots' && (
          <Plots
            currentNovelId={currentNovelId}
            plots={plots}
            onPlotsChange={setPlots}
          />
        )}
      </div>
    </div>
  )
}