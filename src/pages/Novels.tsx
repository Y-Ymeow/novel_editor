import { useState, useEffect } from 'react'
import type { Novel } from '../types'
import { getNovels, saveNovels } from '../utils/storageWrapper'
import { useNavigate } from 'react-router-dom'

export default function Novels() {
  const navigate = useNavigate()
  const [novels, setNovels] = useState<Novel[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover: '',
  })

  useEffect(() => {
    loadNovels()
  }, [])

  const loadNovels = async () => {
    const loaded = await getNovels()
    setNovels(loaded)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('请输入小说标题')
      return
    }

    const settings = await import('../utils/storage').then(m => m.storage.getSettings())

    if (editingId) {
      const updated = novels.map(novel => 
        novel.id === editingId 
          ? { ...novel, ...formData, updatedAt: Date.now() }
          : novel
      )
      setNovels(updated)
      await saveNovels(updated)
      setEditingId(null)
    } else {
      const newNovel: Novel = {
        id: Date.now().toString(),
        ...formData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setNovels([...novels, newNovel])
      await saveNovels([...novels, newNovel])
      
      if (!settings.selectedNovelId) {
        settings.selectedNovelId = newNovel.id
        await import('../utils/storage').then(m => m.storage.saveSettings(settings))
      }
    }
    
    setShowForm(false)
    resetForm()
  }

  const handleEdit = (novel: Novel) => {
    setFormData({
      title: novel.title,
      description: novel.description,
      cover: novel.cover || '',
    })
    setEditingId(novel.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这本小说吗？相关的人物和章节也会被删除。')) {
      const updated = novels.filter(novel => novel.id !== id)
      setNovels(updated)
      await saveNovels(updated)
      
      const settings = await import('../utils/storage').then(m => m.storage.getSettings())
      if (settings.selectedNovelId === id) {
        settings.selectedNovelId = updated.length > 0 ? updated[0].id : null
        await import('../utils/storage').then(m => m.storage.saveSettings(settings))
      }
    }
  }

  const handleSelect = async (id: string) => {
    const settings = await import('../utils/storage').then(m => m.storage.getSettings())
    settings.selectedNovelId = id
    await import('../utils/storage').then(m => m.storage.saveSettings(settings))
    navigate('/')
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      cover: '',
    })
  }

  return (
    <div className="novels-page">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📚 小说管理</h2>
        <button 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}
        >
          + 新建小说
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold">{editingId ? '编辑小说' : '新建小说'}</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">标题 *</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="小说标题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">简介</label>
              <textarea
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="小说简介..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">封面 URL</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.cover}
                onChange={(e) => setFormData({ ...formData, cover: e.target.value })}
                placeholder="https://..."
              />
              {formData.cover && (
                <img src={formData.cover} alt="预览" className="mt-2 rounded max-w-xs" />
              )}
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors" onClick={handleSave}>保存</button>
              <button 
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                onClick={() => { setShowForm(false); setEditingId(null); resetForm() }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {novels.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            <h4 className="text-xl mb-2">暂无小说</h4>
            <p>点击上方按钮创建第一本小说</p>
          </div>
        ) : (
          novels.map((novel) => (
            <div 
              key={novel.id}
              className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors"
            >
              {novel.cover ? (
                <img src={novel.cover} alt={novel.title} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-slate-700 flex items-center justify-center text-4xl">
                  📖
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{novel.title}</h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-3">{novel.description || '暂无简介'}</p>
                <div className="text-xs text-slate-500 mb-3">
                  创建于 {new Date(novel.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button 
                    className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    onClick={() => handleSelect(novel.id)}
                  >
                    打开
                  </button>
                  <button 
                    className="flex-1 px-3 py-1.5 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => handleEdit(novel)}
                  >
                    编辑
                  </button>
                  <button 
                    className="flex-1 px-3 py-1.5 border border-red-500 text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => handleDelete(novel.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}