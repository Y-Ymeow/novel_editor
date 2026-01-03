import { useState } from 'react'
import type { Plot } from '../../../types'
import { storage } from '../../../utils/storage'
import Modal from '../../../components/Modal'
import FullscreenTextarea from '../../../components/FullscreenTextarea'

interface PlotsProps {
  currentNovelId: string | null
  plots: Plot[]
  onPlotsChange: (plots: Plot[]) => void
}

export default function Plots({
  currentNovelId,
  plots,
  onPlotsChange
}: PlotsProps) {
  const [showPlotModal, setShowPlotModal] = useState(false)
  const [editingPlotId, setEditingPlotId] = useState<string | null>(null)
  const [plotFormData, setPlotFormData] = useState({
    title: '',
    content: '',
  })

  const handleSavePlot = async () => {
    if (!plotFormData.title.trim()) {
      alert('请输入情节标题')
      return
    }

    if (!currentNovelId) {
      alert('请先选择小说')
      return
    }

    if (editingPlotId) {
      await storage.updatePlot(editingPlotId, { content: plotFormData.content })
      const updated = plots.map(p =>
        p.id === editingPlotId ? { ...p, ...plotFormData } : p
      )
      onPlotsChange(updated)
    } else {
      const newPlot: Plot = {
        id: Date.now().toString(),
        novelId: currentNovelId,
        title: plotFormData.title,
        content: plotFormData.content,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await storage.savePlot(newPlot)
      onPlotsChange([...plots, newPlot])
    }

    setShowPlotModal(false)
    setEditingPlotId(null)
    setPlotFormData({ title: '', content: '' })
  }

  const handleDeletePlot = async (id: string) => {
    if (confirm('确定要删除这个情节吗？')) {
      await storage.deletePlot(id)
      onPlotsChange(plots.filter(p => p.id !== id))
    }
  }

  const handleEditPlot = (plot: Plot) => {
    setPlotFormData({ title: plot.title, content: plot.content })
    setEditingPlotId(plot.id)
    setShowPlotModal(true)
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            onClick={() => {
              setPlotFormData({ title: '', content: '' })
              setEditingPlotId(null)
              setShowPlotModal(true)
            }}
          >
            + 新建情节
          </button>
        </div>

        {plots.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            <div className="text-4xl mb-2">📝</div>
            <h3 className="text-xl mb-2">暂无情节</h3>
            <p>点击上方按钮创建情节</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plots.map((plot) => (
              <div
                key={plot.id}
                className="bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                onClick={() => handleEditPlot(plot)}
              >
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center text-2xl shrink-0">📝</div>
                    <div className="grow min-w-0">
                      <h3 className="font-semibold text-lg truncate">{plot.title}</h3>
                      <div className="text-xs text-slate-500">
                        {new Date(plot.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-400 line-clamp-3">
                    {plot.content}
                  </div>
                </div>
                <div className="px-5 py-3 bg-slate-900/50 border-t border-slate-700 flex gap-2">
                  <button
                    className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePlot(plot.id)
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showPlotModal}
        onClose={() => {
          setShowPlotModal(false)
          setEditingPlotId(null)
          setPlotFormData({ title: '', content: '' })
        }}
        title={editingPlotId ? '编辑情节' : '新建情节'}
        maxWidth="2xl"
        footer={
          <div className="flex gap-2">
            <button
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
              onClick={handleSavePlot}
            >
              保存
            </button>
            <button
              className="flex-1 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              onClick={() => {
                setShowPlotModal(false)
                setEditingPlotId(null)
                setPlotFormData({ title: '', content: '' })
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
              value={plotFormData.title}
              onChange={(e) => setPlotFormData({ ...plotFormData, title: e.target.value })}
              placeholder="例如：主角遇到神秘人"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">内容 *</label>
            <FullscreenTextarea
              value={plotFormData.content}
              onChange={(value) => setPlotFormData({ ...plotFormData, content: value })}
              placeholder="描述情节的详细内容..."
              className="h-48"
            />
          </div>
        </div>
      </Modal>
    </>
  )
}