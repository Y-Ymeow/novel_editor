import { useState, useEffect } from 'react'
import type { Chapter } from '../types'
import { storage } from '../utils/storage'
import { getChapters, saveChapters } from '../utils/storageWrapper'
import { useNavigate } from 'react-router-dom'

export default function Chapters() {
  const navigate = useNavigate()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentNovelId, setCurrentNovelId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'draft' as 'draft' | 'in-progress' | 'completed',
  })

  useEffect(() => {
    const settings = storage.getSettings()
    setCurrentNovelId(settings.selectedNovelId)
    
    if (settings.selectedNovelId) {
      loadChapters(settings.selectedNovelId)
    }
  }, [])

  const loadChapters = async (novelId: string) => {
    const loaded = await getChapters(novelId)
    setChapters(loaded)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('请输入章节标题')
      return
    }
    
    if (!currentNovelId) {
      alert('请先选择小说')
      return
    }

    const maxOrder = Math.max(0, ...chapters.map(c => c.order))

    if (editingId) {
      const updated = chapters.map(ch => 
        ch.id === editingId 
          ? { ...ch, ...formData, updatedAt: Date.now() }
          : ch
      )
      setChapters(updated)
      await saveChapters(updated)
      setEditingId(null)
    } else {
      const newChapter: Chapter = {
        id: Date.now().toString(),
        novelId: currentNovelId,
        title: formData.title,
        order: maxOrder + 1,
        description: formData.description,
        content: '',
        status: formData.status,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setChapters([...chapters, newChapter])
      await saveChapters([...chapters, newChapter])
    }
    
    setShowForm(false)
    resetForm()
  }

  const handleEdit = (ch: Chapter) => {
    setFormData({
      title: ch.title,
      description: ch.description || '',
      status: ch.status,
    })
    setEditingId(ch.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个章节吗？')) {
      const updated = chapters.filter(ch => ch.id !== id)
      setChapters(updated)
      await saveChapters(updated)
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const newChapters = [...chapters]
    ;[newChapters[index - 1], newChapters[index]] = [newChapters[index], newChapters[index - 1]]
    newChapters.forEach((ch, i) => ch.order = i + 1)
    setChapters(newChapters)
    await saveChapters(newChapters)
  }

  const handleMoveDown = async (index: number) => {
    if (index === chapters.length - 1) return
    const newChapters = [...chapters]
    ;[newChapters[index], newChapters[index + 1]] = [newChapters[index + 1], newChapters[index]]
    newChapters.forEach((ch, i) => ch.order = i + 1)
    setChapters(newChapters)
    await saveChapters(newChapters)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'draft',
    })
  }

  const openEditor = (chapterId: string) => {
    navigate(`/?chapter=${chapterId}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-2 py-0.5 bg-slate-600 rounded text-xs">草稿</span>
      case 'in-progress': return <span className="px-2 py-0.5 bg-yellow-600 text-white rounded text-xs">进行中</span>
      case 'completed': return <span className="px-2 py-0.5 bg-green-600 rounded text-xs">已完成</span>
      default: return <span className="px-2 py-0.5 bg-slate-600 rounded text-xs">{status}</span>
    }
  }

  return (
    <div className="chapters-page">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📝 章节管理</h2>
        <button 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => { setShowForm(true); setEditingId(null); resetForm() }}
          disabled={!currentNovelId}
        >
          + 新建章节
        </button>
      </div>

      {!currentNovelId && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center text-slate-500">
          <h4 className="text-xl mb-2">请先选择小说</h4>
          <p>前往小说管理页面创建或选择小说</p>
        </div>
      )}

      {currentNovelId && (
        <>
          {showForm && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 mb-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold">{editingId ? '编辑章节' : '新建章节'}</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">章节标题 *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="第1章：开始"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">章节描述</label>
                  <textarea
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="描述本章的主要情节和发展，用于 AI 生成内容"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">状态</label>
                  <select
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="draft">草稿</option>
                    <option value="in-progress">进行中</option>
                    <option value="completed">已完成</option>
                  </select>
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

          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {chapters.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <h4 className="text-xl mb-2">暂无章节</h4>
                <p>点击上方按钮创建第一个章节</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-16">序号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">标题</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-24">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-36">最后更新</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-44">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {chapters.map((ch, index) => (
                      <tr key={ch.id} className="hover:bg-slate-700/30">
                        <td className="px-6 py-4 text-slate-500">#{ch.order}</td>
                        <td className="px-6 py-4">
                          <div>
                            <span 
                              className="font-semibold cursor-pointer hover:text-blue-400 transition-colors"
                              onClick={() => openEditor(ch.id)}
                            >
                              {ch.title}
                            </span>
                            {ch.content && (
                              <span className="ml-2 text-xs text-slate-500">
                                ({ch.content.length} 字)
                              </span>
                            )}
                          </div>
                          {ch.description && (
                            <div className="text-xs text-slate-500 mt-1 truncate max-w-md">
                              {ch.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(ch.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {new Date(ch.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            <button 
                              className="p-1.5 border border-slate-600 text-slate-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              title="上移"
                            >
                              ↑
                            </button>
                            <button 
                              className="p-1.5 border border-slate-600 text-slate-400 hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => handleMoveDown(index)}
                              disabled={index === chapters.length - 1}
                              title="下移"
                            >
                              ↓
                            </button>
                            <button 
                              className="p-1.5 border border-blue-500 text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                              onClick={() => openEditor(ch.id)}
                              title="编辑"
                            >
                              ✏️
                            </button>
                            <button 
                              className="p-1.5 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                              onClick={() => handleEdit(ch)}
                              title="修改标题"
                            >
                              📝
                            </button>
                            <button 
                              className="p-1.5 border border-red-500 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              onClick={() => handleDelete(ch.id)}
                              title="删除"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}