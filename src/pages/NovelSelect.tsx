import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Novel } from '../types'
import { storage } from '../utils/storage'
import Modal from '../components/Modal'
import AiInput from '../components/AiInput'

export default function NovelSelect() {
  const navigate = useNavigate()
  const [novels, setNovels] = useState<Novel[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAiPanel, setShowAiPanel] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover: '',
  })

  useEffect(() => {
    loadNovels()
  }, [])

  const loadNovels = async () => {
    const loaded = await storage.getNovels()
    setNovels(loaded)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('请输入小说标题')
      return
    }

    try {
      const settings = storage.getSettings()

      if (editingId) {
        const updatedNovel = {
          ...novels.find(n => n.id === editingId)!,
          ...formData,
          updatedAt: Date.now(),
        }
        const updated = novels.map(novel =>
          novel.id === editingId ? updatedNovel : novel
        )
        setNovels(updated)
        await storage.saveNovel(updatedNovel)
        setEditingId(null)
      } else {
        const newNovel: Novel = {
          id: Date.now().toString(),
          ...formData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        setNovels([...novels, newNovel])
        await storage.saveNovel(newNovel)

        settings.selectedNovelId = newNovel.id
        storage.saveSettings(settings)
      }

      setShowForm(false)
      setShowAiPanel(false)
      resetForm()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      alert('保存失败: ' + errorMessage)
    }
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
      await storage.deleteNovel(id)

      const updated = novels.filter(novel => novel.id !== id)
      setNovels(updated)

      const settings = storage.getSettings()
      if (settings.selectedNovelId === id) {
        settings.selectedNovelId = updated.length > 0 ? updated[0].id : null
        storage.saveSettings(settings)
      }
    }
  }

  const handleSelect = async (id: string) => {
    const settings = storage.getSettings()
    settings.selectedNovelId = id
    storage.saveSettings(settings)
    navigate('/editor')
  }

  const handleAiGenerate = (generated: string) => {
    setFormData({ ...formData, description: generated })
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      cover: '',
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">📚 AI 小说生成器</h1>
          <div className="flex gap-2">
            <button
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}
            >
              + 新建
            </button>
            <button
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors sm:hidden"
              onClick={() => navigate('/settings')}
              aria-label="设置"
            >
              ⚙️
            </button>
            <button
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors hidden sm:block"
              onClick={() => navigate('/settings')}
            >
              ⚙️ 设置
            </button>
          </div>        </div>

        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setShowAiPanel(false);
            setEditingId(null);
            resetForm()
          }}
          title={editingId ? '编辑小说' : '创建新小说'}
          maxWidth="lg"
          footer={
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                onClick={handleSave}
              >
                保存
              </button>
              <button
                className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                onClick={() => {
                  setShowForm(false);
                  setShowAiPanel(false);
                  setEditingId(null);
                  resetForm()
                }}
              >
                取消
              </button>
            </div>
          }
        >
          <div className="space-y-4">
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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-300">简介</label>
                <button
                  className="text-xs text-purple-400 hover:text-purple-300"
                  onClick={() => setShowAiPanel(!showAiPanel)}
                >
                  {showAiPanel ? '▼ 收起' : '🤖 AI 生成'}
                </button>
              </div>
              <textarea
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="小说简介..."
              />
            </div>

            {showAiPanel && (
              <AiInput
                onGenerate={handleAiGenerate}
                placeholder="描述你想要的小说类型和主题，AI 将为您生成简介"
                buttonText="🚀 生成简介"
                systemPrompt={`你是一个专业的小说创作助手。请根据用户的描述生成一段吸引人的小说简介。

${editingId ? `当前小说标题：${formData.title}` : ''}

${formData.description ? `当前简介（可以在此基础上优化）：\n${formData.description}\n\n` : ''}

请生成一段简洁、吸引人的小说简介，突出故事的核心冲突和看点。`}
              />
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">封面 URL</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.cover}
                onChange={(e) => setFormData({ ...formData, cover: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
        </Modal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {novels.length === 0 ? (
            <div className="col-span-full text-center py-16 text-slate-500">
              <div className="text-6xl mb-4">📖</div>
              <h3 className="text-2xl mb-2">暂无小说</h3>
              <p>点击上方按钮创建第一本小说</p>
            </div>
          ) : (
            novels.map((novel) => (
              <div
                key={novel.id}
                className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-all hover:scale-105 cursor-pointer"
                onClick={() => handleSelect(novel.id)}
              >
                {novel.cover ? (
                  <img src={novel.cover} alt={novel.title} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-slate-700 flex items-center justify-center text-5xl">
                    📖
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-bold text-xl mb-2">{novel.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-4">{novel.description || '暂无简介'}</p>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleSelect(novel.id) }}
                    >
                      打开
                    </button>
                    <button
                      className="px-4 py-2 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleEdit(novel) }}
                    >
                      编辑
                    </button>
                    <button
                      className="px-4 py-2 border border-red-600 text-red-400 hover:bg-red-900/30 rounded-xl text-sm font-medium transition-colors"
                      onClick={(e) => { e.stopPropagation(); handleDelete(novel.id) }}
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
    </div>
  )
}
